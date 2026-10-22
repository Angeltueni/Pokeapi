require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");
const Groq = require("groq-sdk");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const PORT = process.env.PORT || 3006;

const POKEMON_API_URL = process.env.POKEMON_API_URL || "https://pokeapi-loek.onrender.com";
const ANIME_API_URL = process.env.ANIME_API_URL || "https://pokeapi-1-dapl.onrender.com";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.6-flash";
const GROQ_MODEL = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

const PROVEEDORES_PERMITIDOS = ["gemini", "groq"];
const TIMEOUTS_PERMITIDOS = [20, 40, 80, 160];
const PROVEEDOR_DEFAULT = "gemini";
const TIMEOUT_DEFAULT = 40;

app.use(cors());
app.use(express.json());

// Clientes de IA
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new Groq({ apiKey: apiKey.trim() });
}

// Auxiliar para espera (backoff)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Auxiliar para deadline global
function obtenerTiempoRestante(deadline) {
  return deadline - Date.now();
}

// Función con reintentos y tolerancia a cold start para microservicios de Render
async function fetchMicroservicioConReintentos(url, nombre, deadline) {
  const maxIntentos = 3;
  let ultimoError = null;

  for (let intento = 1; intento <= maxIntentos; intento++) {
    const tiempoRestante = obtenerTiempoRestante(deadline);
    if (tiempoRestante <= 0) {
      const err = new Error("DEADLINE_TIMEOUT");
      err.isTimeout = true;
      throw err;
    }

    const timeoutMs = Math.min(45000, tiempoRestante);
    console.log(`[IA] ${nombre} intento ${intento} (timeout: ${timeoutMs}ms)`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const respuesta = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (respuesta.ok) {
        const datos = await respuesta.json();
        console.log(`[IA] ${nombre} OK: ${Array.isArray(datos) ? datos.length : 0} registros`);
        return datos;
      }

      const status = respuesta.status;
      const esReintentable = status === 502 || status === 503 || status === 504;

      if (!esReintentable) {
        // Errores permanentes: 400, 401, 403, 404
        console.error(`[IA] ${nombre} error permanente HTTP ${status}. No se reintenta.`);
        throw new Error(`Error HTTP ${status} en ${nombre}`);
      }

      ultimoError = new Error(`HTTP ${status} en ${nombre}`);
    } catch (err) {
      clearTimeout(timeoutId);
      ultimoError = err;

      // Si es un error permanente explícito, relanzarlo sin reintentar
      if (err.message && err.message.startsWith("Error HTTP ")) {
        throw err;
      }

      const esTimeout = err.name === "AbortError";
      console.error(
        `[IA] ${nombre} fallo en intento ${intento}:`,
        esTimeout ? `Timeout (${timeoutMs}ms)` : (err.message || err)
      );

      if (obtenerTiempoRestante(deadline) <= 0) {
        const timeoutErr = new Error("DEADLINE_TIMEOUT");
        timeoutErr.isTimeout = true;
        throw timeoutErr;
      }
    }

    if (intento < maxIntentos) {
      const tiempoAntesReintento = obtenerTiempoRestante(deadline);
      const esperaDeseada = intento === 1 ? 2000 : 4000;
      if (tiempoAntesReintento <= esperaDeseada) {
        const timeoutErr = new Error("DEADLINE_TIMEOUT");
        timeoutErr.isTimeout = true;
        throw timeoutErr;
      }

      console.log(`[IA] ${nombre} no disponible, reintentando en ${esperaDeseada}ms`);
      await sleep(esperaDeseada);
    }
  }

  console.error(`[IA] ${nombre} agoto los ${maxIntentos} intentos.`);
  throw ultimoError;
}

// Detección robusta de errores temporales (429, 503, 504, 5xx, número, string o anidado en el SDK)
function esErrorTemporal(err) {
  if (!err) return false;

  const rawStatus =
    err.status ||
    err.statusCode ||
    err.code ||
    err.error?.code ||
    err.error?.status;

  const numStatus = Number(rawStatus);

  if (
    numStatus === 429 ||
    numStatus === 503 ||
    numStatus === 504 ||
    (numStatus >= 500 && numStatus < 600)
  ) {
    return true;
  }

  const strStatus = String(rawStatus || "");
  if (
    strStatus === "503" ||
    strStatus === "429" ||
    strStatus === "504" ||
    strStatus === "UNAVAILABLE" ||
    strStatus === "RESOURCE_EXHAUSTED" ||
    strStatus === "DEADLINE_EXCEEDED"
  ) {
    return true;
  }

  const msg = String(err.message || "").toLowerCase();
  // Errores permanentes: NO deben reintentarse
  if (
    msg.includes("api_key_invalid") ||
    msg.includes("api key not valid") ||
    msg.includes("permission_denied") ||
    msg.includes("invalid_argument")
  ) {
    return false;
  }

  // Patrones de saturación o indisponibilidad temporal en el mensaje
  if (
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("high demand") ||
    msg.includes("spikes in demand") ||
    msg.includes("resource_exhausted") ||
    msg.includes("unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("try again later") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout")
  ) {
    return true;
  }

  return false;
}

// Generación con Gemini respetando deadline, reintentos y fallback a gemini-3.6-flash
async function generarConGemini({ systemInstruction, prompt, deadline }) {
  const ai = getGeminiClient();
  if (!ai) {
    console.error("[IA] GEMINI_API_KEY no configurada en el servidor.");
    const err = new Error("GEMINI_NO_CONFIGURADO");
    err.isGeminiNoConfigurado = true;
    throw err;
  }

  const config = {
    temperature: 0.1,
  };
  if (systemInstruction && systemInstruction.trim()) {
    config.systemInstruction = systemInstruction.trim();
  }

  const maxReintentos = 2;
  let ultimoError = null;

  for (let intento = 0; intento <= maxReintentos; intento++) {
    const tiempoRestante = obtenerTiempoRestante(deadline);
    if (tiempoRestante <= 0) {
      const err = new Error("DEADLINE_TIMEOUT");
      err.isTimeout = true;
      throw err;
    }

    if (intento === 0) {
      console.log(`[IA] Consultando Gemini principal: ${GEMINI_MODEL}`);
    } else {
      console.log(`[IA] Reintento ${intento} con ${GEMINI_MODEL}`);
    }

    let timerId;
    const timeoutPromise = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        const timeoutErr = new Error("DEADLINE_TIMEOUT");
        timeoutErr.isTimeout = true;
        reject(timeoutErr);
      }, tiempoRestante);
    });

    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt.trim(),
          config,
        }),
        timeoutPromise,
      ]).finally(() => clearTimeout(timerId));

      console.log(`[IA] Gemini principal OK`);
      return response.text || "";
    } catch (err) {
      clearTimeout(timerId);
      ultimoError = err;

      if (err.isTimeout || err.message === "DEADLINE_TIMEOUT" || obtenerTiempoRestante(deadline) <= 0) {
        const timeoutErr = new Error("DEADLINE_TIMEOUT");
        timeoutErr.isTimeout = true;
        throw timeoutErr;
      }

      const errorStatus =
        err.status ||
        err.statusCode ||
        err.code ||
        err.error?.code ||
        err.error?.status ||
        "N/A";
      const errorTipo = err.name || "Error";
      console.error(
        `[IA] Gemini principal fallo (intento ${intento + 1}): [Tipo: ${errorTipo}] [Status: ${errorStatus}]`
      );
      console.error(`[IA] Detalle técnico del error:`, err.message || err);

      if (!esErrorTemporal(err)) {
        console.error(`[IA] Error permanente detectado. No se reintenta.`);
        throw err;
      }

      console.log(`[IA] Gemini principal fallo temporal`);

      if (intento < maxReintentos) {
        const esperaMs = 1000 * Math.pow(2, intento);
        if (obtenerTiempoRestante(deadline) <= esperaMs) {
          const timeoutErr = new Error("DEADLINE_TIMEOUT");
          timeoutErr.isTimeout = true;
          throw timeoutErr;
        }
        console.log(`[IA] Esperando ${esperaMs}ms antes del reintento...`);
        await sleep(esperaMs);
      }
    }
  }

  // Fallback a gemini-3.6-flash si gemini-3.8-flash se saturó temporalmente
  if (GEMINI_FALLBACK_MODEL && esErrorTemporal(ultimoError)) {
    const tiempoRestanteFallback = obtenerTiempoRestante(deadline);
    if (tiempoRestanteFallback <= 0) {
      const timeoutErr = new Error("DEADLINE_TIMEOUT");
      timeoutErr.isTimeout = true;
      throw timeoutErr;
    }

    console.log(`[IA] Usando fallback: ${GEMINI_FALLBACK_MODEL}`);
    let timerId;
    const timeoutPromise = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        const timeoutErr = new Error("DEADLINE_TIMEOUT");
        timeoutErr.isTimeout = true;
        reject(timeoutErr);
      }, tiempoRestanteFallback);
    });

    try {
      const responseFallback = await Promise.race([
        ai.models.generateContent({
          model: GEMINI_FALLBACK_MODEL,
          contents: prompt.trim(),
          config,
        }),
        timeoutPromise,
      ]).finally(() => clearTimeout(timerId));

      
      console.log(`[IA] Fallback OK`);
      return responseFallback.text || "";
    } catch (errFallback) {
      clearTimeout(timerId);
      if (errFallback.isTimeout || errFallback.message === "DEADLINE_TIMEOUT") {
        const timeoutErr = new Error("DEADLINE_TIMEOUT");
        timeoutErr.isTimeout = true;
        throw timeoutErr;
      }
      const fbStatus =
        errFallback.status ||
        errFallback.statusCode ||
        errFallback.code ||
        errFallback.error?.code ||
        errFallback.error?.status ||
        "N/A";
      const fbTipo = errFallback.name || "Error";
      console.error(`[IA] Fallback ERROR: [Tipo: ${fbTipo}] [Status: ${fbStatus}]`);
      console.error(`[IA] Detalle técnico de fallback:`, errFallback.message || errFallback);
      throw errFallback;
    }
  }

  throw ultimoError;
}

// Generación con Groq SDK respetando deadline y estructura de mensajes
async function generarConGroq({ systemInstruction, prompt, deadline }) {
  const groq = getGroqClient();
  if (!groq) {
    console.error("[IA] GROQ_API_KEY no configurada en el servidor.");
    const err = new Error("GROQ_NO_CONFIGURADO");
    err.isGroqNoConfigurado = true;
    throw err;
  }

  const tiempoRestante = obtenerTiempoRestante(deadline);
  if (tiempoRestante <= 0) {
    const err = new Error("DEADLINE_TIMEOUT");
    err.isTimeout = true;
    throw err;
  }

  const messages = [];
  if (systemInstruction && systemInstruction.trim()) {
    messages.push({
      role: "system",
      content: systemInstruction.trim(),
    });
  }
  messages.push({
    role: "user",
    content: prompt.trim(),
  });

  console.log(`[IA] Consultando Groq: ${GROQ_MODEL} (timeout: ${tiempoRestante}ms)`);

  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), tiempoRestante);

  try {
    const completion = await groq.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages,
        temperature: 0.1,
      },
      { signal: controller.signal }
    );
    clearTimeout(timerId);

    const respuesta = completion.choices?.[0]?.message?.content || "";
    console.log(`[IA] Groq OK`);
    return respuesta;
  } catch (err) {
    clearTimeout(timerId);
    if (err.name === "AbortError" || obtenerTiempoRestante(deadline) <= 0) {
      const timeoutErr = new Error("DEADLINE_TIMEOUT");
      timeoutErr.isTimeout = true;
      throw timeoutErr;
    }
    console.error("[IA] Groq ERROR:", err.message || err);
    throw err;
  }
}

// Capa desacoplada de proveedores
async function generarConProveedor(proveedor, { systemInstruction, prompt, deadline }) {
  if (proveedor === "groq") {
    return await generarConGroq({ systemInstruction, prompt, deadline });
  }
  if (proveedor === "gemini") {
    return await generarConGemini({ systemInstruction, prompt, deadline });
  }
  const err = new Error("Proveedor no válido");
  err.isInvalidProvider = true;
  throw err;
}

// Normalización de texto para comparaciones robustas
function normalizarTexto(texto) {
  if (!texto || typeof texto !== "string") return "";
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const RESPUESTA_NO_ENCONTRADO = "No tengo esa información en la base de datos de Pokeanime.";

/**
 * Valida si la pregunta está claramente dirigida a un Pokémon o personaje de Anime específico.
 * Si detecta una entidad y no coincide con los nombres de la BD, retorna existe: false.
 */
function validarEntidadConsultada(pregunta, pokemones, personajes) {
  if (!pregunta || typeof pregunta !== "string") {
    return { entidadDetectada: false, existe: true };
  }

  // 1. Recopilar y normalizar nombres permitidos
  const nombresPermitidos = [
    ...(Array.isArray(pokemones) ? pokemones.map((p) => p.nombre) : []),
    ...(Array.isArray(personajes) ? personajes.map((p) => p.nombre) : []),
  ]
    .filter(Boolean)
    .map((n) => normalizarTexto(n));

  // 2. Normalizar la pregunta para análisis de patrones
  let preguntaNormalizada = normalizarTexto(pregunta);

  // Limpiar signos de interrogación, exclamación y puntuación
  preguntaNormalizada = preguntaNormalizada
    .replace(/[¿?¡!.,;:()\[\]"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Patrones de preguntas dirigidas a entidades específicas
  const patronesEntidad = [
    /^(?:quien|quienes)\s+(?:es|son|era|fueron)\s+(.+)$/i,
    /^(?:cuanto|cuanta)\s+(?:pesa|mide|cuesta)\s+(.+)$/i,
    /^(?:que|que\s+cosa)\s+(?:sabes|conoces|tienes|puedes\s+decir)\s+(?:de|sobre|acerca\s+de)\s+(.+)$/i,
    /^(?:hablame|cuentame|dime|explicame)\s+(?:de|sobre|acerca\s+de)\s+(.+)$/i,
    /^(?:informacion|informacion\s+de|datos|datos\s+de|detalle|detalles|detalles\s+de)\s+(?:de|sobre)?\s*(.+)$/i,
    /^(?:altura|peso|movimientos|habilidades|tipo|tipos|ataques|historia|descripcion|edad|rol|anime)\s+(?:de|del|para)\s+(.+)$/i,
    /^(?:dame|muestra|muestrame)\s+(?:informacion|datos|el\s+peso|la\s+altura|los\s+detalles)\s+(?:de|del|sobre)\s+(.+)$/i,
    /^(?:como\s+se\s+llama|conoces\s+a|sabes\s+quien\s+es)\s+(.+)$/i,
  ];

  // Palabras generales que no corresponden a entidades individuales
  const palabrasGenerales = [
    "pokemon", "pokemones", "personaje", "personajes", "anime", "animes",
    "todos", "cada", "ellos", "ellas", "ambos", "los", "las", "unos", "unas",
    "la", "el", "base", "datos", "registrados", "disponibles", "lista",
    "mas", "menos", "mejor", "peor", "mayor", "menor", "pesado", "liviano",
    "alto", "bajo", "fuerte", "debil"
  ];

  for (const patron of patronesEntidad) {
    const match = preguntaNormalizada.match(patron);
    if (match && match[1]) {
      let posibleEntidad = match[1].trim();

      // Limpiar artículos o conectores iniciales como "el", "la", "los", "las", "un", "una"
      posibleEntidad = posibleEntidad.replace(/^(?:el|la|los|las|un|una|al|del)\s+/i, "").trim();

      // Si la entidad extraída es una consulta general (ej: "pokemon", "personajes registrados"), no bloquear
      const palabrasDeEntidad = posibleEntidad.split(/\s+/);
      const esConsultaGeneral = palabrasDeEntidad.every((p) => palabrasGenerales.includes(p));
      if (esConsultaGeneral) {
        continue;
      }

      // Comparar contra los nombres permitidos
      const coincide = nombresPermitidos.some((nombrePermitido) => {
        return (
          nombrePermitido === posibleEntidad ||
          posibleEntidad.startsWith(nombrePermitido + " ") ||
          posibleEntidad.endsWith(" " + nombrePermitido)
        );
      });

      return {
        entidadDetectada: true,
        entidad: posibleEntidad,
        existe: coincide,
      };
    }
  }

  return { entidadDetectada: false, existe: true };
}

// Configuración OpenAPI / Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Microservicio Pokeanime IA",
      version: "1.0.0",
      description:
        "Microservicio Node.js para interactuar con Gemini y Groq API de manera pública y restringida a la base de datos de Pokeanime.",
    },
    servers: [
      {
        url: "/",
        description: "Servidor actual",
      },
    ],
  },
  apis: ["./server.js"],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

/**
 * @openapi
 * /:
 *   get:
 *     summary: Verificar estado del microservicio IA
 *     description: Retorna el estado y nombre del servicio.
 *     responses:
 *       200:
 *         description: Servicio activo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 servicio:
 *                   type: string
 *                   example: Pokeanime IA
 *                 estado:
 *                   type: string
 *                   example: ok
 */
app.get("/", (req, res) => {
  res.json({
    servicio: "Pokeanime IA",
    estado: "ok",
  });
});

/**
 * @openapi
 * /ia/configuracion:
 *   get:
 *     summary: Obtener proveedores y tiempos de espera permitidos
 *     description: Retorna la lista de proveedores disponibles según API keys configuradas y tiempos permitidos.
 *     responses:
 *       200:
 *         description: Configuración obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 proveedores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: gemini
 *                       nombre:
 *                         type: string
 *                         example: Gemini
 *                       disponible:
 *                         type: boolean
 *                         example: true
 *                 tiempos:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   example: [20, 40, 80, 160]
 *                 predeterminado:
 *                   type: object
 *                   properties:
 *                     proveedor:
 *                       type: string
 *                       example: gemini
 *                     timeout:
 *                       type: integer
 *                       example: 40
 */
app.get("/ia/configuracion", (req, res) => {
  const geminiDisponible = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const groqDisponible = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());

  res.json({
    proveedores: [
      {
        id: "gemini",
        nombre: "Gemini",
        disponible: geminiDisponible,
      },
      {
        id: "groq",
        nombre: "Groq",
        disponible: groqDisponible,
      },
    ],
    tiempos: TIMEOUTS_PERMITIDOS,
    predeterminado: {
      proveedor: PROVEEDOR_DEFAULT,
      timeout: TIMEOUT_DEFAULT,
    },
  });
});

/**
 * @openapi
 * /ia/libre:
 *   get:
 *     summary: Consulta libre a la IA (Fase 1)
 *     description: Envía la pregunta directamente a Gemini o Groq sin restricciones de contexto.
 *     parameters:
 *       - in: query
 *         name: pregunta
 *         required: true
 *         schema:
 *           type: string
 *         description: Pregunta para la IA
 *         example: ¿Cuál es la capital de Francia?
 *       - in: query
 *         name: proveedor
 *         required: false
 *         schema:
 *           type: string
 *           enum: [gemini, groq]
 *           default: gemini
 *         description: Proveedor de IA a utilizar
 *       - in: query
 *         name: timeout
 *         required: false
 *         schema:
 *           type: integer
 *           enum: [20, 40, 80, 160]
 *           default: 40
 *         description: Tiempo máximo de espera en segundos
 *     responses:
 *       200:
 *         description: Respuesta generada por la IA
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pregunta:
 *                   type: string
 *                   example: ¿Cuál es la capital de Francia?
 *                 respuesta:
 *                   type: string
 *                   example: París.
 *                 modo:
 *                   type: string
 *                   example: libre
 *                 proveedor:
 *                   type: string
 *                   example: gemini
 *                 timeout:
 *                   type: integer
 *                   example: 40
 *       400:
 *         description: Parámetro pregunta, proveedor o timeout inválido
 *       502:
 *         description: Error en el servicio de IA o clave no configurada
 *       503:
 *         description: Proveedor Groq no configurado en el servidor
 *       504:
 *         description: Se agotó el tiempo de espera configurado
 *       500:
 *         description: Error inesperado del servidor
 */
app.get("/ia/libre", async (req, res) => {
  const inicio = Date.now();
  console.log("[IA] Inicio /ia/libre");
  try {
    const pregunta = req.query.pregunta;
    const proveedorRaw = req.query.proveedor || PROVEEDOR_DEFAULT;
    const timeoutRaw = req.query.timeout !== undefined ? Number(req.query.timeout) : TIMEOUT_DEFAULT;

    if (!pregunta || typeof pregunta !== "string" || !pregunta.trim()) {
      return res.status(400).json({
        error: "El parámetro 'pregunta' es obligatorio y no puede estar vacío.",
      });
    }

    const proveedor = String(proveedorRaw).toLowerCase().trim();
    if (!PROVEEDORES_PERMITIDOS.includes(proveedor)) {
      return res.status(400).json({
        error: "Proveedor de inteligencia artificial no válido.",
      });
    }

    if (!TIMEOUTS_PERMITIDOS.includes(timeoutRaw)) {
      return res.status(400).json({
        error: "Tiempo de espera no válido.",
      });
    }

    const timeoutSegundos = timeoutRaw;
    const deadline = inicio + timeoutSegundos * 1000;

    let respuestaTexto = "";
    try {
      respuestaTexto = await generarConProveedor(proveedor, {
        systemInstruction: "",
        prompt: pregunta.trim(),
        deadline,
      });
    } catch (err) {
      if (err.isGroqNoConfigurado || err.message === "GROQ_NO_CONFIGURADO") {
        return res.status(503).json({
          error: "El proveedor Groq no está configurado en el servidor.",
        });
      }
      if (err.isGeminiNoConfigurado || err.message === "GEMINI_NO_CONFIGURADO") {
        return res.status(502).json({
          error: "Error al consultar Gemini: GEMINI_API_KEY no configurada en el servidor.",
        });
      }
      if (err.isTimeout || err.message === "DEADLINE_TIMEOUT") {
        return res.status(504).json({
          error: "Se agotó el tiempo de espera configurado.",
          timeout: timeoutSegundos,
        });
      }
      return res.status(502).json({
        error: "El servicio de inteligencia artificial no está disponible temporalmente.",
      });
    }

    res.json({
      pregunta: pregunta.trim(),
      respuesta: respuestaTexto.trim(),
      modo: "libre",
      proveedor,
      timeout: timeoutSegundos,
    });
  } catch (error) {
    console.error("[IA] Error inesperado en /ia/libre:", error);
    res.status(500).json({
      error: "Error inesperado en el servidor.",
    });
  }
});

/**
 * @openapi
 * /ia/pokeanime:
 *   get:
 *     summary: Consulta restringida a la base de datos Pokeanime (Fase 2)
 *     description: Consulta únicamente los datos propios de Pokémon y Anime sin conocimientos externos.
 *     parameters:
 *       - in: query
 *         name: pregunta
 *         required: true
 *         schema:
 *           type: string
 *         description: Pregunta para la IA
 *         example: ¿Cuánto pesa Gengar?
 *       - in: query
 *         name: proveedor
 *         required: false
 *         schema:
 *           type: string
 *           enum: [gemini, groq]
 *           default: gemini
 *         description: Proveedor de IA a utilizar
 *       - in: query
 *         name: timeout
 *         required: false
 *         schema:
 *           type: integer
 *           enum: [20, 40, 80, 160]
 *           default: 40
 *         description: Tiempo máximo de espera en segundos
 *     responses:
 *       200:
 *         description: Respuesta generada basada estrictamente en la base de datos de Pokeanime
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pregunta:
 *                   type: string
 *                   example: ¿Cuánto pesa Gengar?
 *                 respuesta:
 *                   type: string
 *                   example: Gengar pesa 405 según la base de datos de Pokeanime.
 *                 modo:
 *                   type: string
 *                   example: pokeanime
 *                 proveedor:
 *                   type: string
 *                   example: groq
 *                 timeout:
 *                   type: integer
 *                   example: 40
 *                 contexto:
 *                   type: object
 *                   properties:
 *                     pokemones:
 *                       type: integer
 *                       example: 10
 *                     personajes:
 *                       type: integer
 *                       example: 10
 *       400:
 *         description: Parámetro pregunta, proveedor o timeout inválido
 *       502:
 *         description: Error en microservicios o en el servicio de IA
 *       503:
 *         description: Proveedor Groq no configurado en el servidor
 *       504:
 *         description: Se agotó el tiempo de espera configurado
 *       500:
 *         description: Error inesperado del servidor
 */
app.get("/ia/pokeanime", async (req, res) => {
  const inicio = Date.now();
  console.log("[IA] Inicio /ia/pokeanime");
  try {
    const pregunta = req.query.pregunta;
    const proveedorRaw = req.query.proveedor || PROVEEDOR_DEFAULT;
    const timeoutRaw = req.query.timeout !== undefined ? Number(req.query.timeout) : TIMEOUT_DEFAULT;

    if (!pregunta || typeof pregunta !== "string" || !pregunta.trim()) {
      return res.status(400).json({
        error: "El parámetro 'pregunta' es obligatorio y no puede estar vacío.",
      });
    }

    const proveedor = String(proveedorRaw).toLowerCase().trim();
    if (!PROVEEDORES_PERMITIDOS.includes(proveedor)) {
      return res.status(400).json({
        error: "Proveedor de inteligencia artificial no válido.",
      });
    }

    if (!TIMEOUTS_PERMITIDOS.includes(timeoutRaw)) {
      return res.status(400).json({
        error: "Tiempo de espera no válido.",
      });
    }

    const timeoutSegundos = timeoutRaw;
    const deadline = inicio + timeoutSegundos * 1000;

    // Validación temprana si se seleccionó Groq y no está configurado
    if (proveedor === "groq" && !process.env.GROQ_API_KEY?.trim()) {
      console.error("[IA] GROQ_API_KEY no configurada en el servidor.");
      return res.status(503).json({
        error: "El proveedor Groq no está configurado en el servidor.",
      });
    }

    // Consultar Pokémon y Anime en paralelo tolerando cold start con deadline
    let pokemones = [];
    let personajes = [];

    try {
      [pokemones, personajes] = await Promise.all([
        fetchMicroservicioConReintentos(`${POKEMON_API_URL}/pokemones`, "Pokemon", deadline),
        fetchMicroservicioConReintentos(`${ANIME_API_URL}/personajes`, "Anime", deadline),
      ]);
    } catch (err) {
      if (err.isTimeout || err.message === "DEADLINE_TIMEOUT" || obtenerTiempoRestante(deadline) <= 0) {
        return res.status(504).json({
          error: "Se agotó el tiempo de espera configurado.",
          timeout: timeoutSegundos,
        });
      }
      console.error("[IA] Fallo en microservicios internos tras agotar reintentos:", err.message || err);
      return res.status(502).json({
        error: "No fue posible consultar temporalmente los datos de Pokeanime.",
      });
    }

    // Validación determinista en backend: si la pregunta se dirige específicamente
    // a un Pokémon o personaje que no existe en nuestra base de datos, responder
    // directamente sin invocar Gemini ni Groq.
    const validacion = validarEntidadConsultada(pregunta, pokemones, personajes);
    if (validacion.entidadDetectada && !validacion.existe) {
      console.log(`[IA] Entidad específica "${validacion.entidad}" no encontrada en la BD. Respuesta preventiva aplicada.`);
      return res.json({
        pregunta: pregunta.trim(),
        respuesta: RESPUESTA_NO_ENCONTRADO,
        modo: "pokeanime",
        proveedor,
        timeout: timeoutSegundos,
        contexto: {
          pokemones: Array.isArray(pokemones) ? pokemones.length : 0,
          personajes: Array.isArray(personajes) ? personajes.length : 0,
        },
      });
    }

    const systemInstruction = `Eres el asistente de la aplicación Pokeanime.

Tu única fuente de información es el CONTEXTO PERMITIDO que se proporciona a continuación.

REGLAS OBLIGATORIAS:

1. Responde únicamente utilizando información explícitamente presente en CONTEXTO PERMITIDO.

2. No utilices conocimientos generales, recuerdos propios, conocimiento previo del modelo ni información externa.

3. No inventes datos.

4. No completes información que no aparezca en el contexto.

5. Puedes comparar, ordenar, contar o relacionar datos que sí aparezcan explícitamente en el contexto.

6. Si la pregunta no puede responderse completamente usando el contexto, responde exactamente:
   'No tengo esa información en la base de datos de Pokeanime.'

7. Si preguntan por un personaje o Pokémon que no está incluido en el contexto, utiliza la misma respuesta anterior.`;

    const promptFinal = `CONTEXTO PERMITIDO:

POKÉMON:
${JSON.stringify(pokemones, null, 2)}

ANIME:
${JSON.stringify(personajes, null, 2)}

PREGUNTA DEL USUARIO:
${pregunta.trim()}`;

    let respuestaTexto = "";
    try {
      respuestaTexto = await generarConProveedor(proveedor, {
        systemInstruction,
        prompt: promptFinal,
        deadline,
      });
    } catch (err) {
      if (err.isGroqNoConfigurado || err.message === "GROQ_NO_CONFIGURADO") {
        return res.status(503).json({
          error: "El proveedor Groq no está configurado en el servidor.",
        });
      }
      if (err.isGeminiNoConfigurado || err.message === "GEMINI_NO_CONFIGURADO") {
        return res.status(502).json({
          error: "Error al consultar Gemini: GEMINI_API_KEY no configurada en el servidor.",
        });
      }
      if (err.isTimeout || err.message === "DEADLINE_TIMEOUT") {
        return res.status(504).json({
          error: "Se agotó el tiempo de espera configurado.",
          timeout: timeoutSegundos,
        });
      }
      return res.status(502).json({
        error: "El servicio de inteligencia artificial no está disponible temporalmente.",
      });
    }

    res.json({
      pregunta: pregunta.trim(),
      respuesta: respuestaTexto.trim(),
      modo: "pokeanime",
      proveedor,
      timeout: timeoutSegundos,
      contexto: {
        pokemones: Array.isArray(pokemones) ? pokemones.length : 0,
        personajes: Array.isArray(personajes) ? personajes.length : 0,
      },
    });
  } catch (error) {
    console.error("[IA] Error inesperado en /ia/pokeanime:", error);
    res.status(500).json({
      error: "Error inesperado en el servidor.",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Microservicio Pokeanime IA escuchando en http://0.0.0.0:${PORT}`);
  console.log(`Documentación Swagger disponible en http://localhost:${PORT}/docs`);
});

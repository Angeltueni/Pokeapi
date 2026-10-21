require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const PORT = process.env.PORT || 3006;

const POKEMON_API_URL = process.env.POKEMON_API_URL || "https://pokeapi-loek.onrender.com";
const ANIME_API_URL = process.env.ANIME_API_URL || "https://pokeapi-1-dapl.onrender.com";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.6-flash";

app.use(cors());
app.use(express.json());

// Inicialización de cliente Gemini con @google/genai
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

// Función auxiliar para esperar milisegundos (backoff)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Detección de errores temporales de Gemini (429, 503, 504, 5xx, saturación de demanda, timeout)
function esErrorTemporal(err) {
  if (!err) return false;
  const status = err.status || err.statusCode || err.code;
  if (
    status === 429 ||
    status === 503 ||
    status === 504 ||
    (typeof status === "number" && status >= 500 && status < 600)
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

  // Patrones de saturación o indisponibilidad temporal
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

// Función reutilizable para llamar a Gemini con reintentos y fallback
async function generarContenidoConReintentos(ai, { contents, config = {} }) {
  const maxReintentos = 2; // Máximo 2 reintentos (3 intentos en total para el modelo principal)
  let ultimoError = null;

  // Intentos con el modelo principal
  for (let intento = 0; intento <= maxReintentos; intento++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config,
      });
      return response.text || "";
    } catch (err) {
      ultimoError = err;
      if (!esErrorTemporal(err)) {
        // Error permanente (ej. 400, 401, 403): no reintentar
        throw err;
      }
      if (intento < maxReintentos) {
        // Exponential backoff: ~1s en primer reintento, ~2s en segundo reintento
        const esperaMs = 1000 * Math.pow(2, intento);
        console.warn(
          `[Gemini] Intento ${intento + 1} con '${GEMINI_MODEL}' falló temporalmente. Reintentando en ${esperaMs}ms...`
        );
        await sleep(esperaMs);
      }
    }
  }

  // Si tras los reintentos continúa fallando por saturación/demanda temporal, intentar con modelo fallback
  if (GEMINI_FALLBACK_MODEL && esErrorTemporal(ultimoError)) {
    console.log("Gemini principal saturado, usando fallback:", GEMINI_FALLBACK_MODEL);
    try {
      const responseFallback = await ai.models.generateContent({
        model: GEMINI_FALLBACK_MODEL,
        contents,
        config,
      });
      return responseFallback.text || "";
    } catch (errFallback) {
      console.error("[Gemini Fallback Error]:", errFallback);
      throw errFallback;
    }
  }

  throw ultimoError;
}

// Configuración OpenAPI / Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Microservicio Pokeanime IA",
      version: "1.0.0",
      description:
        "Microservicio Node.js para interactuar con Gemini API de manera pública y restringida a la base de datos de Pokeanime.",
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
 * /ia/libre:
 *   get:
 *     summary: Consulta libre a Gemini (Fase 1)
 *     description: Envía la pregunta directamente a Gemini sin restricciones de contexto.
 *     parameters:
 *       - in: query
 *         name: pregunta
 *         required: true
 *         schema:
 *           type: string
 *         description: Pregunta para la IA
 *         example: ¿Cuál es la capital de Francia?
 *     responses:
 *       200:
 *         description: Respuesta generada por Gemini
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
 *       400:
 *         description: Parámetro pregunta faltante o vacío
 *       502:
 *         description: El servicio de inteligencia artificial no está disponible temporalmente
 *       500:
 *         description: Error inesperado del servidor
 */
app.get("/ia/libre", async (req, res) => {
  try {
    const pregunta = req.query.pregunta;

    if (!pregunta || typeof pregunta !== "string" || !pregunta.trim()) {
      return res.status(400).json({
        error: "El parámetro 'pregunta' es obligatorio y no puede estar vacío.",
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(502).json({
        error: "Error al consultar Gemini: GEMINI_API_KEY no configurada en el servidor.",
      });
    }

    let respuestaTexto = "";
    try {
      respuestaTexto = await generarContenidoConReintentos(ai, {
        contents: pregunta.trim(),
      });
    } catch (err) {
      console.error("Error al consultar Gemini en /ia/libre:", err);
      return res.status(502).json({
        error: "El servicio de inteligencia artificial no está disponible temporalmente.",
      });
    }

    res.json({
      pregunta: pregunta.trim(),
      respuesta: respuestaTexto.trim(),
      modo: "libre",
    });
  } catch (error) {
    console.error("Error inesperado en /ia/libre:", error);
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
 *         description: Parámetro pregunta faltante o vacío
 *       502:
 *         description: El servicio de inteligencia artificial no está disponible temporalmente
 *       500:
 *         description: Error inesperado del servidor
 */
app.get("/ia/pokeanime", async (req, res) => {
  try {
    const pregunta = req.query.pregunta;

    if (!pregunta || typeof pregunta !== "string" || !pregunta.trim()) {
      return res.status(400).json({
        error: "El parámetro 'pregunta' es obligatorio y no puede estar vacío.",
      });
    }

    // Consultar Pokémon y Anime en paralelo
    let pokemones = [];
    let personajes = [];

    try {
      const [pokemonRes, animeRes] = await Promise.all([
        fetch(`${POKEMON_API_URL}/pokemones`),
        fetch(`${ANIME_API_URL}/personajes`),
      ]);

      if (!pokemonRes.ok || !animeRes.ok) {
        return res.status(502).json({
          error: "Error consultando microservicios internos de Pokémon o Anime.",
        });
      }

      [pokemones, personajes] = await Promise.all([
        pokemonRes.json(),
        animeRes.json(),
      ]);
    } catch (err) {
      console.error("Error consultando microservicios internos:", err);
      return res.status(502).json({
        error: "Error consultando microservicios internos.",
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(502).json({
        error: "Error al consultar Gemini: GEMINI_API_KEY no configurada en el servidor.",
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
      respuestaTexto = await generarContenidoConReintentos(ai, {
        contents: promptFinal,
        config: {
          systemInstruction,
          temperature: 0.1,
        },
      });
    } catch (err) {
      console.error("Error al consultar Gemini en /ia/pokeanime:", err);
      return res.status(502).json({
        error: "El servicio de inteligencia artificial no está disponible temporalmente.",
      });
    }

    res.json({
      pregunta: pregunta.trim(),
      respuesta: respuestaTexto.trim(),
      modo: "pokeanime",
      contexto: {
        pokemones: Array.isArray(pokemones) ? pokemones.length : 0,
        personajes: Array.isArray(personajes) ? personajes.length : 0,
      },
    });
  } catch (error) {
    console.error("Error inesperado en /ia/pokeanime:", error);
    res.status(500).json({
      error: "Error inesperado en el servidor.",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Microservicio Pokeanime IA escuchando en http://0.0.0.0:${PORT}`);
  console.log(`Documentación Swagger disponible en http://localhost:${PORT}/docs`);
});

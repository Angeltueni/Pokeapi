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
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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

// Extraer mensaje limpio de error sin filtrar secretos
function extraerMensajeError(err) {
  if (!err) return "Error desconocido en el servicio de IA";
  if (typeof err.message === "string") {
    try {
      const parsed = JSON.parse(err.message);
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
    } catch (_) {
      // No es JSON, continuar
    }
    return err.message;
  }
  return String(err);
}

// Configuración OpenAPI / Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Microservicio Pokeanime IA",
      version: "1.0.0",
      description: "Microservicio Node.js para interactuar con Gemini API de manera pública y restringida a la base de datos de Pokeanime.",
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
 *         description: Error consultando Gemini
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
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: pregunta.trim(),
      });
      respuestaTexto = response.text || "";
    } catch (err) {
      return res.status(502).json({
        error: "Error consultando Gemini.",
        detalle: extraerMensajeError(err),
      });
    }

    res.json({
      pregunta: pregunta.trim(),
      respuesta: respuestaTexto.trim(),
      modo: "libre",
    });
  } catch (error) {
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
 *         description: Error consultando microservicios internos o Gemini
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
      return res.status(502).json({
        error: "Error consultando microservicios internos.",
        detalle: err.message || "Fallo de conexión con los microservicios de datos",
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
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: promptFinal,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1,
        },
      });
      respuestaTexto = response.text || "";
    } catch (err) {
      return res.status(502).json({
        error: "Error consultando Gemini.",
        detalle: extraerMensajeError(err),
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
    res.status(500).json({
      error: "Error inesperado en el servidor.",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Microservicio Pokeanime IA escuchando en http://0.0.0.0:${PORT}`);
  console.log(`Documentación Swagger disponible en http://localhost:${PORT}/docs`);
});

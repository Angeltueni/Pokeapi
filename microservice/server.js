require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(supabaseUrl, supabaseSecretKey);

// Middlewares
app.use(cors());
app.use(express.json());

// Configuración de Swagger (OpenAPI 3.0.0)
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Microservicio Pokémon",
      version: "1.0.0",
      description:
        "Microservicio Node.js que consulta Pokémon almacenados en Supabase.",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Servidor local de desarrollo",
      },
    ],
    components: {
      schemas: {
        Pokemon: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              example: 94,
            },
            nombre: {
              type: "string",
              example: "gengar",
            },
            imagen: {
              type: "string",
              nullable: true,
              example:
                "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png",
            },
            imagen2: {
              type: "string",
              nullable: true,
              example:
                "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/94.png",
            },
            imagen3: {
              type: "string",
              nullable: true,
              example:
                "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/94.png",
            },
            altura: {
              type: "integer",
              example: 15,
            },
            peso: {
              type: "integer",
              example: 405,
            },
            movimiento1: {
              type: "string",
              nullable: true,
              example: "mega-punch",
            },
            movimiento2: {
              type: "string",
              nullable: true,
              example: "pay-day",
            },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2026-09-30T10:00:00.000Z",
            },
          },
        },
      },
    },
  },
  apis: [__filename],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

// Documentación visual e interactiva
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Documento OpenAPI en formato JSON
app.get("/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

/**
 * @openapi
 * /:
 *   get:
 *     summary: Verificar estado del microservicio
 *     description: Verificar que el microservicio esté funcionando.
 *     responses:
 *       200:
 *         description: Microservicio activo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: Microservicio Pokémon funcionando
 */
app.get("/", (req, res) => {
  res.json({ mensaje: "Microservicio Pokémon funcionando" });
});

/**
 * @openapi
 * /pokemones:
 *   get:
 *     summary: Obtener todos los Pokémon
 *     description: Obtener los 10 Pokémon almacenados en Supabase.
 *     responses:
 *       200:
 *         description: Lista de Pokémon obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pokemon'
 *       500:
 *         description: Error al consultar la base de datos
 */
app.get("/pokemones", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("pokemones")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      return res
        .status(500)
        .json({ error: "Error al consultar la base de datos" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * @openapi
 * /pokemones/{id}:
 *   get:
 *     summary: Buscar un Pokémon por ID
 *     description: Buscar un Pokémon por su ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID numérico del Pokémon
 *         schema:
 *           type: integer
 *           example: 94
 *     responses:
 *       200:
 *         description: Pokémon encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pokemon'
 *       404:
 *         description: Pokémon no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Pokémon no encontrado
 *       500:
 *         description: Error del servidor
 */
app.get("/pokemones/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const { data, error } = await supabase
      .from("pokemones")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return res
        .status(500)
        .json({ error: "Error al consultar la base de datos" });
    }

    if (!data) {
      return res.status(404).json({ error: "Pokémon no encontrado" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * @openapi
 * /pokemones/nombre/{nombre}:
 *   get:
 *     summary: Buscar un Pokémon por nombre
 *     description: Buscar un Pokémon por nombre.
 *     parameters:
 *       - in: path
 *         name: nombre
 *         required: true
 *         description: Nombre del Pokémon en minúsculas
 *         schema:
 *           type: string
 *           example: gengar
 *     responses:
 *       200:
 *         description: Pokémon encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pokemon'
 *       404:
 *         description: Pokémon no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Pokémon no encontrado
 *       500:
 *         description: Error del servidor
 */
app.get("/pokemones/nombre/:nombre", async (req, res) => {
  const nombre = req.params.nombre.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from("pokemones")
      .select("*")
      .ilike("nombre", nombre)
      .maybeSingle();

    if (error) {
      return res
        .status(500)
        .json({ error: "Error al consultar la base de datos" });
    }

    if (!data) {
      return res.status(404).json({ error: "Pokémon no encontrado" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Microservicio ejecutándose en http://localhost:${PORT}`);
});

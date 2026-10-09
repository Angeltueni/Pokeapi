const http = require("http");

// 1. Configuración de Variables de Entorno
const PORT = process.env.PORT || 3003;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error(
    "Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en las variables de entorno."
  );
}

// 2. Documento OpenAPI 3.0.0
const openapiDocument = {
  openapi: "3.0.0",
  info: {
    title: "Microservicio Crear Docente UNINPAHU",
    version: "1.0.0",
    description:
      "Microservicio agnóstico desarrollado con Node.js nativo para crear docentes en Supabase mediante Query Params (sin Body Params).",
  },
  paths: {
    "/": {
      get: {
        summary: "Verificar microservicio",
        description: "Verificar que el microservicio de creación de docentes esté funcionando.",
        responses: {
          "200": {
            description: "Microservicio funcionando correctamente",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    mensaje: {
                      type: "string",
                      example: "Microservicio Crear Docente funcionando",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/docentes": {
      post: {
        summary: "Crear un nuevo docente (Query Params)",
        description:
          "Crea un nuevo docente en Supabase utilizando parámetros de consulta (Query Params) sin requerir Body Params.",
        parameters: [
          {
            name: "nombre",
            in: "query",
            required: true,
            schema: {
              type: "string",
            },
            description: "Nombre completo del docente (Obligatorio)",
            example: "Juan Pérez",
          },
          {
            name: "cargo",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
            description: "Cargo del docente",
            example: "Docente de Tiempo Completo",
          },
          {
            name: "programa",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
            description: "Programa académico",
            example: "Ingeniería de Software",
          },
          {
            name: "resumen",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
            description: "Resumen del perfil",
            example: "Especialista en microservicios y desarrollo cloud.",
          },
          {
            name: "pregrado",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
            description: "Título de pregrado",
            example: "Ingeniero de Sistemas",
          },
          {
            name: "posgrado",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
            description: "Título de posgrado",
            example: "Magíster en Inteligencia Artificial",
          },
          {
            name: "experiencia",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
            description: "Experiencia laboral y docente",
            example: "8 años de experiencia académica y profesional.",
          },
          {
            name: "imagen",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
            description: "URL de la fotografía del docente",
            example: "https://ejemplo.com/docente.jpg",
          },
        ],
        responses: {
          "201": {
            description: "Docente creado exitosamente",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Docente",
                },
              },
            },
          },
          "400": {
            description: "Parámetro obligatorio faltante",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                      example: "El parámetro 'nombre' es obligatorio.",
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Error al crear docente en la base de datos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                      example: "Error al crear docente en la base de datos",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Docente: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            example: 1,
          },
          nombre: {
            type: "string",
            example: "Juan Pérez",
          },
          cargo: {
            type: "string",
            nullable: true,
            example: "Docente de Tiempo Completo",
          },
          programa: {
            type: "string",
            nullable: true,
            example: "Ingeniería de Software",
          },
          resumen: {
            type: "string",
            nullable: true,
            example: "Especialista en microservicios y desarrollo cloud.",
          },
          pregrado: {
            type: "string",
            nullable: true,
            example: "Ingeniero de Sistemas",
          },
          posgrado: {
            type: "string",
            nullable: true,
            example: "Magíster en Inteligencia Artificial",
          },
          experiencia: {
            type: "string",
            nullable: true,
            example: "8 años de experiencia académica y profesional.",
          },
          imagen: {
            type: "string",
            nullable: true,
            example: "https://ejemplo.com/docente.jpg",
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2026-10-09T10:00:00.000Z",
          },
        },
      },
    },
  },
};

// 3. Funciones Auxiliares para Respuestas HTTP y CORS sin librerías
function responderJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function responderHtml(res, statusCode, html) {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(html);
}

// 4. Servidor HTTP Nativo
const server = http.createServer(async (req, res) => {
  // Manejo de preflight CORS (OPTIONS)
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // Parseo agnóstico de URL usando la clase nativa URL
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // Endpoint 1: GET /
  if (req.method === "GET" && pathname === "/") {
    responderJson(res, 200, {
      mensaje: "Microservicio Crear Docente funcionando",
    });
    return;
  }

  // Endpoint 2: GET /swagger.json
  if (req.method === "GET" && pathname === "/swagger.json") {
    responderJson(res, 200, openapiDocument);
    return;
  }

  // Endpoint 3: GET /docs (Swagger UI servido desde CDN sin express)
  if (req.method === "GET" && pathname === "/docs") {
    const htmlSwagger = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Swagger UI - Crear Docente UNINPAHU</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/swagger.json",
        dom_id: "#swagger-ui"
      });
    };
  </script>
</body>
</html>`;
    responderHtml(res, 200, htmlSwagger);
    return;
  }

  // Endpoint 4: POST /docentes (Creación mediante Query Params sin Body Params)
  if (req.method === "POST" && pathname === "/docentes") {
    const nombre = url.searchParams.get("nombre");

    // Validación de parámetro obligatorio
    if (!nombre || !nombre.trim()) {
      responderJson(res, 400, {
        error: "El parámetro 'nombre' es obligatorio en los Query Params.",
      });
      return;
    }

    // Construcción del objeto desde los Query Params
    const nuevoDocente = {
      nombre: nombre.trim(),
    };

    if (url.searchParams.has("cargo")) nuevoDocente.cargo = url.searchParams.get("cargo");
    if (url.searchParams.has("programa")) nuevoDocente.programa = url.searchParams.get("programa");
    if (url.searchParams.has("resumen")) nuevoDocente.resumen = url.searchParams.get("resumen");
    if (url.searchParams.has("pregrado")) nuevoDocente.pregrado = url.searchParams.get("pregrado");
    if (url.searchParams.has("posgrado")) nuevoDocente.posgrado = url.searchParams.get("posgrado");
    if (url.searchParams.has("experiencia")) nuevoDocente.experiencia = url.searchParams.get("experiencia");
    if (url.searchParams.has("imagen")) nuevoDocente.imagen = url.searchParams.get("imagen");

    try {
      const urlSupabase = `${SUPABASE_URL}/rest/v1/docentes`;
      const respuesta = await fetch(urlSupabase, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(nuevoDocente),
      });

      if (!respuesta.ok) {
        responderJson(res, 500, {
          error: "Error al crear docente en la base de datos",
        });
        return;
      }

      const datos = await respuesta.json();
      responderJson(res, 201, datos[0] || datos);
    } catch (error) {
      console.error("Error al crear docente en Supabase:", error);
      responderJson(res, 500, {
        error: "Error al crear docente en la base de datos",
      });
    }
    return;
  }

  // Rutas o métodos no encontrados
  responderJson(res, 404, { error: "Ruta o método no encontrado" });
});

// 5. Iniciar Servidor
server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Microservicio Crear Docente ejecutándose en http://localhost:${PORT}`
  );
});

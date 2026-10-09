const http = require("http");

// 1. Configuración de Variables de Entorno
const PORT = process.env.PORT || 3005;
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
    title: "Microservicio Eliminar Docente UNINPAHU",
    version: "1.0.0",
    description:
      "Microservicio agnóstico desarrollado con Node.js nativo para eliminar docentes en Supabase mediante Path Params (sin Body Params).",
  },
  paths: {
    "/": {
      get: {
        summary: "Verificar microservicio",
        description: "Verificar que el microservicio de eliminación de docentes esté funcionando.",
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
                      example: "Microservicio Eliminar Docente funcionando",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/docentes/{id}": {
      delete: {
        summary: "Eliminar docente por ID (Path Param)",
        description:
          "Elimina un docente en Supabase especificando su ID a través de un Path Param.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
            description: "ID del docente a eliminar (Obligatorio)",
            example: 1,
          },
        ],
        responses: {
          "200": {
            description: "Docente eliminado exitosamente",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    mensaje: {
                      type: "string",
                      example: "Docente eliminado exitosamente",
                    },
                    docente: {
                      $ref: "#/components/schemas/Docente",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Docente no encontrado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                      example: "Docente no encontrado",
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Error al eliminar docente en la base de datos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                      example: "Error al eliminar docente en la base de datos",
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
    "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
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
      "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
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
      mensaje: "Microservicio Eliminar Docente funcionando",
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
  <title>Swagger UI - Eliminar Docente UNINPAHU</title>
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

  // Endpoint 4: DELETE /docentes/{id} (Path Param para ID)
  const matchDocente = pathname.match(/^\/docentes\/(\d+)$/);
  if (req.method === "DELETE" && matchDocente) {
    const id = matchDocente[1]; // Path Param capturado

    try {
      const urlSupabase = `${SUPABASE_URL}/rest/v1/docentes?id=eq.${id}`;
      const respuesta = await fetch(urlSupabase, {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
          Prefer: "return=representation",
        },
      });

      if (!respuesta.ok) {
        responderJson(res, 500, {
          error: "Error al eliminar docente en la base de datos",
        });
        return;
      }

      const datos = await respuesta.json();

      if (!datos || datos.length === 0) {
        responderJson(res, 404, { error: "Docente no encontrado" });
        return;
      }

      responderJson(res, 200, {
        mensaje: "Docente eliminado exitosamente",
        docente: datos[0],
      });
    } catch (error) {
      console.error("Error al eliminar docente en Supabase:", error);
      responderJson(res, 500, {
        error: "Error al eliminar docente en la base de datos",
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
    `Microservicio Eliminar Docente ejecutándose en http://localhost:${PORT}`
  );
});

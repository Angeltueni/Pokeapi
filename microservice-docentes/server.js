const http = require("http");

// 1. Configuración de Variables de Entorno
const PORT = process.env.PORT || 3002;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error(
    "Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en las variables de entorno."
  );
}

// 2. Documento OpenAPI 3.0.0 (Sin servidores fijos para ser dinámico en local y Render)
const openapiDocument = {
  openapi: "3.0.0",
  info: {
    title: "Microservicio Docentes UNINPAHU",
    version: "1.0.0",
    description:
      "Microservicio agnóstico desarrollado con Node.js nativo que consulta información de docentes almacenada en Supabase.",
  },
  paths: {
    "/": {
      get: {
        summary: "Verificar microservicio",
        description: "Verificar que el microservicio de docentes esté funcionando.",
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
                      example: "Microservicio Docentes funcionando",
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
      get: {
        summary: "Listar todos los docentes",
        description:
          "Obtener la lista completa de docentes almacenada en Supabase mediante consulta REST nativa.",
        responses: {
          "200": {
            description: "Lista de docentes obtenida con éxito",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/Docente",
                  },
                },
              },
            },
          },
          "500": {
            description: "Error al consultar la base de datos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                      example: "Error al consultar docentes",
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
      get: {
        summary: "Buscar docente por ID (Path Param)",
        description:
          "Demuestra explícitamente el uso de Path Params para consultar un docente específico por su ID.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
            description: "ID del docente",
            example: 1,
          },
        ],
        responses: {
          "200": {
            description: "Docente encontrado exitosamente",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Docente",
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
            description: "Error del servidor",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                      example: "Error al consultar docente",
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
            example: "Ing. Juan Pérez",
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
            example: "Especialista en desarrollo web y microservicios.",
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
            example: "10 años en docencia universitaria y desarrollo.",
          },
          imagen: {
            type: "string",
            nullable: true,
            example: "https://ejemplo.com/docente.jpg",
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2026-10-03T10:00:00.000Z",
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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
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

// 4. Creación del Servidor HTTP Nativo
const server = http.createServer(async (req, res) => {
  // Manejo de preflight CORS (OPTIONS)
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // Únicamente permitimos método GET (Servicio de solo consulta, sin Body Params)
  if (req.method !== "GET") {
    responderJson(res, 405, { error: "Método no permitido. Solo se admite GET." });
    return;
  }

  // Parseo agnóstico de URL usando la clase nativa URL
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // Endpoint 1: GET /
  if (pathname === "/") {
    responderJson(res, 200, {
      mensaje: "Microservicio Docentes funcionando",
    });
    return;
  }

  // Endpoint 2: GET /swagger.json
  if (pathname === "/swagger.json") {
    responderJson(res, 200, openapiDocument);
    return;
  }

  // Endpoint 3: GET /docs (Swagger UI servido desde CDN sin express)
  if (pathname === "/docs") {
    const htmlSwagger = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Swagger UI - Docentes UNINPAHU</title>
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

  // Endpoint 4: GET /docentes (Listar todos los docentes)
  if (pathname === "/docentes") {
    try {
      const urlSupabase = `${SUPABASE_URL}/rest/v1/docentes?select=*&order=id.asc`;
      const respuesta = await fetch(urlSupabase, {
        method: "GET",
        headers: {
          apikey: SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        },
      });

      if (!respuesta.ok) {
        responderJson(res, 500, { error: "Error al consultar docentes" });
        return;
      }

      const datos = await respuesta.json();
      responderJson(res, 200, datos);
    } catch (error) {
      console.error("Error al consultar Supabase:", error);
      responderJson(res, 500, { error: "Error al consultar docentes" });
    }
    return;
  }

  // Endpoint 5: GET /docentes/{id} (Consulta con Path Param)
  const matchDocente = pathname.match(/^\/docentes\/(\d+)$/);
  if (matchDocente) {
    const id = matchDocente[1]; // Path Param capturado

    try {
      const urlSupabase = `${SUPABASE_URL}/rest/v1/docentes?id=eq.${id}&select=*`;
      const respuesta = await fetch(urlSupabase, {
        method: "GET",
        headers: {
          apikey: SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        },
      });

      if (!respuesta.ok) {
        responderJson(res, 500, { error: "Error al consultar docente" });
        return;
      }

      const datos = await respuesta.json();

      // Supabase devuelve un arreglo; si está vacío, el docente no existe
      if (!datos || datos.length === 0) {
        responderJson(res, 404, { error: "Docente no encontrado" });
        return;
      }

      // Devolvemos el objeto único del docente
      responderJson(res, 200, datos[0]);
    } catch (error) {
      console.error("Error al consultar Supabase por ID:", error);
      responderJson(res, 500, { error: "Error al consultar docente" });
    }
    return;
  }

  // Rutas no encontradas
  responderJson(res, 404, { error: "Ruta no encontrada" });
});

// 5. Iniciar Servidor
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Microservicio Docentes ejecutándose en http://localhost:${PORT}`);
});

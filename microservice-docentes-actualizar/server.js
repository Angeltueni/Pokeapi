const http = require("http");

// 1. Configuración de Variables de Entorno
const PORT = process.env.PORT || 3004;
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
    title: "Microservicio Actualizar Docente UNINPAHU",
    version: "1.0.0",
    description:
      "Microservicio agnóstico desarrollado con Node.js nativo para actualizar docentes en Supabase mediante Path Params y Query Params (sin Body Params).",
  },
  paths: {
    "/": {
      get: {
        summary: "Verificar microservicio",
        description: "Verificar que el microservicio de actualización de docentes esté funcionando.",
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
                      example: "Microservicio Actualizar Docente funcionando",
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
      patch: {
        summary: "Actualizar docente por ID (Path Param + Query Params)",
        description:
          "Actualiza campos específicos de un docente en Supabase utilizando el ID como Path Param y los nuevos valores como Query Params.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
            description: "ID del docente a actualizar (Obligatorio)",
            example: 1,
          },
          {
            name: "nombre",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
            description: "Nuevo nombre del docente",
            example: "Juan Pérez Modificado",
          },
          {
            name: "cargo",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
            description: "Nuevo cargo del docente",
            example: "Director de Programa",
          },
          {
            name: "programa",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
            description: "Nuevo programa académico",
            example: "Ingeniería de Software",
          },
          {
            name: "resumen",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
            description: "Nuevo resumen del perfil",
            example: "Perfil actualizado con nuevas competencias.",
          },
          {
            name: "pregrado",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
            description: "Nuevo título de pregrado",
            example: "Ingeniero de Sistemas",
          },
          {
            name: "posgrado",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
            description: "Nuevo título de posgrado",
            example: "Doctor en Ciencias de la Computación",
          },
          {
            name: "experiencia",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
            description: "Nueva experiencia laboral/docente",
            example: "12 años de trayectoria académica y empresarial.",
          },
          {
            name: "imagen",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
            description: "Nueva URL de la fotografía",
            example: "https://ejemplo.com/nueva_foto.jpg",
          },
        ],
        responses: {
          "200": {
            description: "Docente actualizado exitosamente",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    mensaje: {
                      type: "string",
                      example: "Docente actualizado exitosamente",
                    },
                    docente: {
                      $ref: "#/components/schemas/Docente",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Petición inválida (sin campos para actualizar o ID inválido)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                      example: "Debe proporcionar al menos un campo para actualizar mediante Query Params.",
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
            description: "Error al actualizar docente en la base de datos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                      example: "Error al actualizar docente en la base de datos",
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
    "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
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
      "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
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
      mensaje: "Microservicio Actualizar Docente funcionando",
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
  <title>Swagger UI - Actualizar Docente UNINPAHU</title>
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

  // Endpoint 4: PATCH /docentes/{id} (Path Param para ID + Query Params para actualización)
  const matchDocente = pathname.match(/^\/docentes\/(\d+)$/);
  if (req.method === "PATCH" && matchDocente) {
    const id = matchDocente[1]; // Path Param capturado

    const camposPermitidos = [
      "nombre",
      "cargo",
      "programa",
      "resumen",
      "pregrado",
      "posgrado",
      "experiencia",
      "imagen",
    ];

    const camposActualizar = {};
    for (const campo of camposPermitidos) {
      if (url.searchParams.has(campo)) {
        camposActualizar[campo] = url.searchParams.get(campo);
      }
    }

    // Validación: al menos un campo debe ser enviado
    if (Object.keys(camposActualizar).length === 0) {
      responderJson(res, 400, {
        error: "Debe proporcionar al menos un campo para actualizar mediante Query Params.",
      });
      return;
    }

    try {
      const urlSupabase = `${SUPABASE_URL}/rest/v1/docentes?id=eq.${id}`;
      const respuesta = await fetch(urlSupabase, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(camposActualizar),
      });

      if (!respuesta.ok) {
        responderJson(res, 500, {
          error: "Error al actualizar docente en la base de datos",
        });
        return;
      }

      const datos = await respuesta.json();

      if (!datos || datos.length === 0) {
        responderJson(res, 404, { error: "Docente no encontrado" });
        return;
      }

      responderJson(res, 200, {
        mensaje: "Docente actualizado exitosamente",
        docente: datos[0],
      });
    } catch (error) {
      console.error("Error al actualizar docente en Supabase:", error);
      responderJson(res, 500, {
        error: "Error al actualizar docente en la base de datos",
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
    `Microservicio Actualizar Docente ejecutándose en http://localhost:${PORT}`
  );
});

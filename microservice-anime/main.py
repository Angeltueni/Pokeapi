import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# 1. Conexión a Firebase Firestore (Local o Render)
ruta_clave = os.path.join(os.path.dirname(__file__), "firebase-key.json")

if os.path.exists(ruta_clave):
    # Modo Local: usar archivo firebase-key.json
    cred = credentials.Certificate(ruta_clave)
elif "FIREBASE_CREDENTIALS_JSON" in os.environ:
    # Modo Producción / Render: usar variable de entorno con el JSON
    cred_dict = json.loads(os.environ["FIREBASE_CREDENTIALS_JSON"])
    cred = credentials.Certificate(cred_dict)
else:
    raise RuntimeError(
        "No se encontraron credenciales de Firebase. "
        "Asegúrate de tener el archivo firebase-key.json en local o "
        "configurar la variable de entorno FIREBASE_CREDENTIALS_JSON en Render."
    )

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

# 2. Inicialización de FastAPI
app = FastAPI(
    title="Microservicio Anime",
    version="1.0.0",
    description="Microservicio FastAPI que consulta personajes de Anime almacenados en Firebase Firestore."
)

# 3. Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Endpoints

@app.get("/")
def ruta_raiz():
    """Verificar el estado del microservicio."""
    return {
        "mensaje": "Microservicio Anime funcionando"
    }

@app.get("/personajes")
def obtener_personajes():
    """Obtener todos los personajes almacenados en Firestore."""
    try:
        docs = db.collection("personajes").stream()
        personajes = [doc.to_dict() for doc in docs]
        return personajes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar Firestore: {str(e)}")

@app.get("/personajes/{id}")
def obtener_personaje_por_id(id: int):
    """Buscar un personaje por su ID numérico."""
    try:
        doc = db.collection("personajes").document(str(id)).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Personaje no encontrado")
        return doc.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar Firestore: {str(e)}")

@app.get("/personajes/nombre/{nombre}")
def obtener_personaje_por_nombre(nombre: str):
    """Buscar un personaje por nombre (sin distinguir mayúsculas/minúsculas)."""
    try:
        docs = db.collection("personajes").stream()
        nombre_busqueda = nombre.strip().lower()

        for doc in docs:
            personaje = doc.to_dict()
            if personaje.get("nombre", "").strip().lower() == nombre_busqueda:
                return personaje

        raise HTTPException(status_code=404, detail="Personaje no encontrado")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar Firestore: {str(e)}")

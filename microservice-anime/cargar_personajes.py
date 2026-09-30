import os
import time
import requests
import firebase_admin
from firebase_admin import credentials, firestore

# 1. Conexión a Firebase Firestore
ruta_clave = os.path.join(os.path.dirname(__file__), "firebase-key.json")
cred = credentials.Certificate(ruta_clave)

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

# 2. Configuración de Tenrai API
BASE_URL = "https://api.tenrai.org/v1"

# 3. Lista de los 10 personajes con su nombre en la app, texto de búsqueda y anime de referencia
PERSONAJES = [
    {
        "nombre": "Satoru Gojo",
        "busqueda": "Satoru Gojo",
        "anime": "Jujutsu Kaisen",
    },
    {
        "nombre": "Ryomen Sukuna",
        "busqueda": "Sukuna",
        "anime": "Jujutsu Kaisen",
    },
    {
        "nombre": "Yuuji Itadori",
        "busqueda": "Yuuji Itadori",
        "anime": "Jujutsu Kaisen",
    },
    {
        "nombre": "Donquixote Doflamingo",
        "busqueda": "Donquixote Doflamingo",
        "anime": "One Piece",
    },
    {
        "nombre": "Spike Spiegel",
        "busqueda": "Spike Spiegel",
        "anime": "Cowboy Bebop",
    },
    {
        "nombre": "L",
        "busqueda": "L Lawliet",
        "anime": "Death Note",
    },
    {
        "nombre": "Light Yagami",
        "busqueda": "Light Yagami",
        "anime": "Death Note",
    },
    {
        "nombre": "Yuta Okkotsu",
        "busqueda": "Yuta Okkotsu",
        "anime": "Jujutsu Kaisen",
    },
    {
        "nombre": "Rudo Surebrec",
        "busqueda": "Rudo Surebrec",
        "anime": "Gachiakuta",
    },
    {
        "nombre": "Mahoraga",
        "busqueda": "Mahoraga",
        "anime": "Jujutsu Kaisen",
    },
]

def consultar_tenrai(url, params=None):
    """Realiza peticiones GET a Tenrai API con pausa y control de errores."""
    time.sleep(0.5)
    try:
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code != 200:
            print(f"Tenrai respondió {resp.status_code}: {resp.reason}")
            return None
        return resp
    except Exception as e:
        print(f"Error de conexión con Tenrai: {e}")
        return None

def buscar_y_guardar_personajes():
    for item in PERSONAJES:
        nombre_app = item["nombre"]
        texto_busqueda = item["busqueda"]
        anime_referencia = item["anime"]

        print(f"Buscando {nombre_app}...")

        try:
            # 1. Buscar candidatos en Tenrai API
            url_busqueda = f"{BASE_URL}/characters"
            resp_busqueda = consultar_tenrai(url_busqueda, params={"q": texto_busqueda, "limit": 10})

            if not resp_busqueda:
                continue

            candidatos = resp_busqueda.json().get("data", [])
            if not candidatos:
                print(f"No se encontraron resultados para {nombre_app}")
                continue

            # 2. Recorrer candidatos y confirmar el anime con /characters/{id}/full
            personaje_confirmado = None

            for candidato in candidatos:
                id_candidato = candidato.get("id") or candidato.get("mal_id")
                if not id_candidato:
                    continue

                url_full = f"{BASE_URL}/characters/{id_candidato}/full"
                resp_full = consultar_tenrai(url_full)

                if not resp_full:
                    continue

                datos_full = resp_full.json().get("data", {})
                lista_animes = datos_full.get("anime", [])

                # Verificar si alguno de los animes del personaje coincide con el de referencia
                anime_encontrado = False
                for anime_entry in lista_animes:
                    titulo_anime = (
                        anime_entry.get("anime", {}).get("title", "")
                        or anime_entry.get("title", "")
                    )
                    if anime_referencia.lower() in titulo_anime.lower():
                        anime_encontrado = True
                        break

                if anime_encontrado:
                    personaje_confirmado = datos_full
                    break

            # 3. Si ningún candidato coincide con el anime de referencia
            if not personaje_confirmado:
                print(f"No se pudo confirmar el personaje: {nombre_app}")
                continue

            print(f"{nombre_app} confirmado")

            # 4. Extraer datos del personaje confirmado
            id_personaje = personaje_confirmado.get("id") or personaje_confirmado.get("mal_id")
            nombre_oficial = personaje_confirmado.get("name") or nombre_app
            descripcion = personaje_confirmado.get("about") or ""
            
            # Obtener imagen principal
            imagenes_obj = personaje_confirmado.get("images", {})
            imagen_principal = (
                imagenes_obj.get("jpg", {}).get("image_url")
                or imagenes_obj.get("webp", {}).get("image_url")
                or personaje_confirmado.get("image_url")
            )

            # 5. Consultar imágenes adicionales
            url_fotos = f"{BASE_URL}/characters/{id_personaje}/pictures"
            resp_fotos = consultar_tenrai(url_fotos)

            fotos_adicionales = []
            if resp_fotos:
                lista_fotos = resp_fotos.json().get("data", [])
                for foto in lista_fotos:
                    url_img = (
                        foto.get("jpg", {}).get("image_url")
                        or foto.get("webp", {}).get("image_url")
                        or foto.get("image_url")
                    )
                    if url_img and url_img not in fotos_adicionales and url_img != imagen_principal:
                        fotos_adicionales.append(url_img)

            # Asignar imagen2 e imagen3
            imagen2 = fotos_adicionales[0] if len(fotos_adicionales) > 0 else imagen_principal
            imagen3 = fotos_adicionales[1] if len(fotos_adicionales) > 1 else (fotos_adicionales[0] if len(fotos_adicionales) > 0 else imagen_principal)

            # 6. Guardar en Firestore
            documento = {
                "id": id_personaje,
                "nombre": nombre_app,
                "nombre_api": nombre_oficial,
                "anime": anime_referencia,
                "imagen": imagen_principal,
                "imagen2": imagen2,
                "imagen3": imagen3,
                "descripcion": descripcion,
            }

            db.collection("personajes").document(str(id_personaje)).set(documento)
            print(f"{nombre_app} guardado en Firebase")

        except Exception as e:
            print(f"Error procesando {nombre_app}: {e}")

    print("Proceso terminado")

if __name__ == "__main__":
    buscar_y_guardar_personajes()

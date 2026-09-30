import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAnime } from '@/context/AnimeContext';

export default function DatosAnimeScreen() {
  const { personaje } = useAnime();

  if (!personaje) {
    return (
      <View style={styles.centro}>
        <Text style={styles.mensaje}>Busca un personaje en la pestaña Anime.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pantalla}>
      <Text style={styles.titulo}>Datos del Personaje</Text>
      <Text style={styles.nombre}>{personaje.nombre}</Text>
      <Text style={styles.id}>#{personaje.id}</Text>

      <View style={styles.caja}>
        <Text style={styles.etiqueta}>Nombre API</Text>
        <Text style={styles.valorTexto}>{personaje.nombre_api || personaje.nombre}</Text>
      </View>

      <View style={styles.caja}>
        <Text style={styles.etiqueta}>Anime</Text>
        <Text style={styles.valorTexto}>{personaje.anime}</Text>
      </View>

      <View style={styles.caja}>
        <Text style={styles.etiqueta}>Descripción</Text>
        <Text style={styles.descripcion}>
          {personaje.descripcion ? personaje.descripcion : 'Sin descripción disponible.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flexGrow: 1,
    backgroundColor: '#f2f2f2',
    padding: 22,
    paddingTop: 60,
    paddingBottom: 100,
  },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    backgroundColor: '#f2f2f2',
  },
  mensaje: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1e88e5',
  },
  nombre: {
    fontSize: 25,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  id: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  caja: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 18,
    marginTop: 15,
  },
  etiqueta: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  valorTexto: {
    fontSize: 18,
    color: '#222',
  },
  descripcion: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
});

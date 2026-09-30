import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAnime } from '@/context/AnimeContext';

export default function AnimeScreen() {
  const [texto, setTexto] = useState('');
  const { personaje, cargando, error, buscarPersonaje, anterior, siguiente } = useAnime();

  const buscar = async () => {
    const encontrado = await buscarPersonaje(texto);
    if (encontrado) setTexto('');
  };

  return (
    <ScrollView contentContainerStyle={styles.pantalla}>
      <Text style={styles.titulo}>Anime</Text>

      <View style={styles.buscador}>
        <TextInput
          style={styles.input}
          placeholder="Nombre o ID"
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={buscar}
          autoCapitalize="none"
        />
        <Pressable style={styles.botonBuscar} onPress={buscar}>
          <Text style={styles.textoBoton}>Buscar</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.tarjetaPrincipal}>
        {cargando ? (
          <Text style={styles.mensaje}>Cargando...</Text>
        ) : personaje ? (
          <>
            {personaje.imagen ? (
              <Image
                source={{ uri: personaje.imagen }}
                style={styles.imagenPrincipal}
                resizeMode="contain"
              />
            ) : (
              <Text>Sin imagen</Text>
            )}
            <Text style={styles.nombre}>{personaje.nombre}</Text>
          </>
        ) : (
          <Text style={styles.mensaje}>Busca un personaje para comenzar</Text>
        )}
      </View>

      {personaje ? (
        <View style={styles.filaImagenes}>
          <View style={styles.tarjetaPequena}>
            {personaje.imagen2 ? (
              <Image
                source={{ uri: personaje.imagen2 }}
                style={styles.imagenPequena}
                resizeMode="contain"
              />
            ) : (
              <Text>Sin imagen</Text>
            )}
          </View>
          <View style={styles.tarjetaPequena}>
            {personaje.imagen3 ? (
              <Image
                source={{ uri: personaje.imagen3 }}
                style={styles.imagenPequena}
                resizeMode="contain"
              />
            ) : (
              <Text>Sin imagen</Text>
            )}
          </View>
        </View>
      ) : null}

      <View style={styles.botonesCambio}>
        <Pressable
          style={[styles.botonSecundario, !personaje && styles.deshabilitado]}
          onPress={anterior}
          disabled={!personaje || cargando}
        >
          <Text>Anterior</Text>
        </Pressable>
        <Pressable
          style={[styles.botonSecundario, !personaje && styles.deshabilitado]}
          onPress={siguiente}
          disabled={!personaje || cargando}
        >
          <Text>Siguiente</Text>
        </Pressable>
      </View>

      <Text style={styles.ayuda}>Los datos completos están en la pestaña Datos Anime.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flexGrow: 1,
    backgroundColor: '#f2f2f2',
    padding: 20,
    paddingTop: 55,
    paddingBottom: 100,
  },
  titulo: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1e88e5',
  },
  buscador: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  botonBuscar: {
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  textoBoton: {
    color: 'white',
    fontWeight: 'bold',
  },
  error: {
    color: '#b00020',
    marginBottom: 10,
  },
  tarjetaPrincipal: {
    minHeight: 300,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  imagenPrincipal: {
    width: 230,
    height: 230,
  },
  nombre: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  mensaje: {
    color: '#666',
    fontSize: 16,
  },
  filaImagenes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  tarjetaPequena: {
    width: '48%',
    height: 150,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#1e88e5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagenPequena: {
    width: 135,
    height: 135,
  },
  botonesCambio: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  botonSecundario: {
    width: '48%',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#333',
    padding: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  deshabilitado: {
    opacity: 0.4,
  },
  ayuda: {
    textAlign: 'center',
    color: '#666',
    marginTop: 18,
  },
});

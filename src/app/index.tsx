import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { usePokemon } from '@/context/PokemonContext';

export default function Index() {
  const [texto, setTexto] = useState('');
  const { pokemon, cargando, error, buscarPokemon, anterior, siguiente } = usePokemon();

  const buscar = async () => {
    const encontrado = await buscarPokemon(texto);

    if (encontrado) {
      setTexto('');
    }
  };

  return (
    <View style={styles.pantalla}>
      <View style={styles.encabezado}>
        <View style={styles.circuloGrande} />
        <View style={styles.circuloPequeno} />
        <Text style={styles.titulo}>Pokédex</Text>
      </View>

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

      <View style={styles.tarjetaImagen}>
        {cargando ? (
          <ActivityIndicator size="large" />
        ) : pokemon ? (
          <>
            <Image source={{ uri: pokemon.imagen }} style={styles.imagen} />
            <Text style={styles.nombre}>{pokemon.nombre}</Text>
          </>
        ) : (
          <Text style={styles.mensaje}>Busca un Pokémon para comenzar</Text>
        )}
      </View>

      <View style={styles.botonesCambio}>
        <Pressable
          style={[styles.botonSecundario, !pokemon && styles.botonDeshabilitado]}
          onPress={anterior}
          disabled={!pokemon || pokemon.id <= 1 || cargando}
        >
          <Text style={styles.textoSecundario}>Anterior</Text>
        </Pressable>

        <Pressable
          style={[styles.botonSecundario, !pokemon && styles.botonDeshabilitado]}
          onPress={siguiente}
          disabled={!pokemon || cargando}
        >
          <Text style={styles.textoSecundario}>Siguiente</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.botonDatos, !pokemon && styles.botonDeshabilitado]}
        onPress={() => router.push('/detalles')}
        disabled={!pokemon}
      >
        <Text style={styles.textoDatos}>Ver datos</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    padding: 22,
    paddingTop: 55,
  },
  encabezado: {
    height: 85,
    backgroundColor: '#d93636',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  circuloGrande: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#7fd5ff',
    borderWidth: 4,
    borderColor: 'white',
    marginRight: 10,
  },
  circuloPequeno: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#ffd94a',
    marginRight: 15,
  },
  titulo: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  buscador: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#bdbdbd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  botonBuscar: {
    backgroundColor: '#333333',
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
    marginBottom: 8,
  },
  tarjetaImagen: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#333333',
    borderRadius: 12,
    minHeight: 330,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  imagen: {
    width: 250,
    height: 250,
    resizeMode: 'contain',
  },
  nombre: {
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  mensaje: {
    color: '#666666',
    fontSize: 16,
    textAlign: 'center',
  },
  botonesCambio: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  botonSecundario: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#333333',
    padding: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoSecundario: {
    fontWeight: 'bold',
  },
  botonDatos: {
    backgroundColor: '#d93636',
    marginTop: 12,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoDatos: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  botonDeshabilitado: {
    opacity: 0.4,
  },
});

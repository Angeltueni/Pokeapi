import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { usePokemon } from '@/context/PokemonContext';
import { obtenerPersonajeDragonBall, type PersonajeDragonBall } from '@/services/dragonBallApi';

export default function Index() {
  const [texto, setTexto] = useState('');
  const [personaje, setPersonaje] = useState<PersonajeDragonBall | null>(null);
  const [cargandoDragonBall, setCargandoDragonBall] = useState(false);
  const [errorDragonBall, setErrorDragonBall] = useState('');

  const { pokemon, cargando, error, buscarPokemon, anterior, siguiente } = usePokemon();

  const buscar = async () => {
    const encontrado = await buscarPokemon(texto);

    if (encontrado) {
      setTexto('');
    }
  };

  const cargarDragonBall = async () => {
    try {
      setCargandoDragonBall(true);
      setErrorDragonBall('');
      const datos = await obtenerPersonajeDragonBall();
      setPersonaje(datos);
    } catch (e) {
      setErrorDragonBall(e instanceof Error ? e.message : 'Ocurrió un error');
    } finally {
      setCargandoDragonBall(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.pantalla}>
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
            {pokemon.imagen ? (
              <Image source={{ uri: pokemon.imagen }} style={styles.imagen} />
            ) : (
              <Text>Sin imagen</Text>
            )}
            <Text style={styles.nombre}>{pokemon.nombre}</Text>
          </>
        ) : (
          <Text style={styles.mensaje}>Busca un Pokémon para comenzar</Text>
        )}
      </View>

      {pokemon ? (
        <View style={styles.filaImagenes}>
          <View style={styles.tarjetaPequena}>
            {pokemon.imagen2 ? (
              <Image source={{ uri: pokemon.imagen2 }} style={styles.imagenPequena} />
            ) : (
              <Text style={styles.sinImagen}>Sin imagen</Text>
            )}
          </View>

          <View style={styles.tarjetaPequena}>
            {pokemon.imagen3 ? (
              <Image source={{ uri: pokemon.imagen3 }} style={styles.imagenPequena} />
            ) : (
              <Text style={styles.sinImagen}>Sin imagen</Text>
            )}
          </View>
        </View>
      ) : null}

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

      <Pressable style={styles.botonDragonBall} onPress={cargarDragonBall}>
        <Text style={styles.textoDatos}>Consultar otra API</Text>
      </Pressable>

      {cargandoDragonBall ? (
        <ActivityIndicator size="large" style={styles.cargandoExtra} />
      ) : null}

      {errorDragonBall ? <Text style={styles.error}>{errorDragonBall}</Text> : null}

      {personaje ? (
        <View style={styles.tarjetaDragonBall}>
          <Text style={styles.tituloDragonBall}>Dragon Ball API</Text>
          <Image source={{ uri: personaje.imagen }} style={styles.imagenDragonBall} />
          <Text style={styles.nombreDragonBall}>{personaje.nombre}</Text>
          <Text style={styles.datoDragonBall}>Raza: {personaje.raza}</Text>
          <Text style={styles.datoDragonBall}>Ki: {personaje.ki}</Text>
          <Text style={styles.descripcion}>{personaje.descripcion}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flexGrow: 1,
    backgroundColor: '#f2f2f2',
    padding: 22,
    paddingTop: 55,
    paddingBottom: 40,
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
    marginTop: 8,
    marginBottom: 8,
  },
  tarjetaImagen: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#333333',
    borderRadius: 12,
    minHeight: 310,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  imagen: {
    width: 240,
    height: 240,
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
    borderColor: '#46aee8',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagenPequena: {
    width: 135,
    height: 135,
    resizeMode: 'contain',
  },
  sinImagen: {
    color: '#777777',
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
  botonDragonBall: {
    backgroundColor: '#e48a20',
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
  cargandoExtra: {
    marginTop: 18,
  },
  tarjetaDragonBall: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#bbbbbb',
    borderRadius: 10,
    padding: 16,
    marginTop: 18,
    alignItems: 'center',
  },
  tituloDragonBall: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  imagenDragonBall: {
    width: 180,
    height: 220,
    resizeMode: 'contain',
  },
  nombreDragonBall: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 8,
  },
  datoDragonBall: {
    fontSize: 16,
    marginTop: 5,
  },
  descripcion: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'justify',
  },
});

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

import { usePokemon } from '@/context/PokemonContext';

export default function PokemonScreen() {
  const [texto, setTexto] = useState('');
  const { pokemon, cargando, error, buscarPokemon, anterior, siguiente } = usePokemon();

  const buscar = async () => {
    const encontrado = await buscarPokemon(texto);
    if (encontrado) setTexto('');
  };

  return (
    <ScrollView contentContainerStyle={styles.pantalla}>
      <Text style={styles.titulo}>Pokémon</Text>

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
          <ActivityIndicator size="large" />
        ) : pokemon ? (
          <>
            {pokemon.imagen ? (
              <Image source={{ uri: pokemon.imagen }} style={styles.imagenPrincipal} />
            ) : (
              <Text>Sin imagen</Text>
            )}
            <Text style={styles.nombre}>{pokemon.nombre}</Text>
          </>
        ) : (
          <Text style={styles.mensaje}>Busca un Pokémon</Text>
        )}
      </View>

      {pokemon ? (
        <View style={styles.filaImagenes}>
          <View style={styles.tarjetaPequena}>
            {pokemon.imagen2 ? (
              <Image source={{ uri: pokemon.imagen2 }} style={styles.imagenPequena} />
            ) : (
              <Text>Sin imagen</Text>
            )}
          </View>
          <View style={styles.tarjetaPequena}>
            {pokemon.imagen3 ? (
              <Image source={{ uri: pokemon.imagen3 }} style={styles.imagenPequena} />
            ) : (
              <Text>Sin imagen</Text>
            )}
          </View>
        </View>
      ) : null}

      <View style={styles.botonesCambio}>
        <Pressable
          style={[styles.botonSecundario, !pokemon && styles.deshabilitado]}
          onPress={anterior}
          disabled={!pokemon || pokemon.id <= 1 || cargando}
        >
          <Text>Anterior</Text>
        </Pressable>
        <Pressable
          style={[styles.botonSecundario, !pokemon && styles.deshabilitado]}
          onPress={siguiente}
          disabled={!pokemon || cargando}
        >
          <Text>Siguiente</Text>
        </Pressable>
      </View>

      <Text style={styles.ayuda}>Los datos completos están en la pestaña Datos Pokémon.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flexGrow: 1, backgroundColor: '#f2f2f2', padding: 20, paddingTop: 55, paddingBottom: 100 },
  titulo: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#d93636' },
  buscador: { flexDirection: 'row', marginBottom: 10 },
  input: { flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#aaa', borderRadius: 8, paddingHorizontal: 12, marginRight: 8 },
  botonBuscar: { backgroundColor: '#333', borderRadius: 8, justifyContent: 'center', paddingHorizontal: 16 },
  textoBoton: { color: 'white', fontWeight: 'bold' },
  error: { color: '#b00020', marginBottom: 10 },
  tarjetaPrincipal: { minHeight: 300, backgroundColor: 'white', borderWidth: 2, borderColor: '#333', borderRadius: 10, justifyContent: 'center', alignItems: 'center', padding: 15 },
  imagenPrincipal: { width: 230, height: 230, resizeMode: 'contain' },
  nombre: { fontSize: 24, fontWeight: 'bold', textTransform: 'capitalize' },
  mensaje: { color: '#666' },
  filaImagenes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  tarjetaPequena: { width: '48%', height: 150, backgroundColor: 'white', borderWidth: 2, borderColor: '#46aee8', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  imagenPequena: { width: 135, height: 135, resizeMode: 'contain' },
  botonesCambio: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  botonSecundario: { width: '48%', backgroundColor: 'white', borderWidth: 1, borderColor: '#333', padding: 13, borderRadius: 8, alignItems: 'center' },
  deshabilitado: { opacity: 0.4 },
  ayuda: { textAlign: 'center', color: '#666', marginTop: 18 },
});

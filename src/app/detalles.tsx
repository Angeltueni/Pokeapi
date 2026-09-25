import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { usePokemon } from '@/context/PokemonContext';

export default function Detalles() {
  const { pokemon } = usePokemon();

  if (!pokemon) {
    return (
      <View style={styles.centro}>
        <Text style={styles.sinPokemon}>Primero busca un Pokémon.</Text>
        <Pressable style={styles.botonVolver} onPress={() => router.back()}>
          <Text style={styles.textoVolver}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pantalla}>
      <Text style={styles.titulo}>Datos del Pokémon</Text>
      <Text style={styles.nombre}>{pokemon.nombre}</Text>
      <Text style={styles.id}>#{pokemon.id}</Text>

      <View style={styles.fila}>
        <View style={styles.cajaPequena}>
          <Text style={styles.etiqueta}>Altura</Text>
          <Text style={styles.valor}>{pokemon.altura}</Text>
        </View>

        <View style={styles.cajaPequena}>
          <Text style={styles.etiqueta}>Peso</Text>
          <Text style={styles.valor}>{pokemon.peso}</Text>
        </View>
      </View>

      <View style={styles.caja}>
        <Text style={styles.etiqueta}>Tipos</Text>
        {pokemon.tipos.map((tipo) => (
          <Text key={tipo} style={styles.item}>
            • {tipo}
          </Text>
        ))}
      </View>

      <View style={styles.caja}>
        <Text style={styles.etiqueta}>Movimientos</Text>
        {pokemon.movimientos.map((movimiento, index) => (
          <Text key={`${movimiento}-${index}`} style={styles.item}>
            {index + 1}. {movimiento}
          </Text>
        ))}
      </View>

      <Pressable style={styles.botonVolver} onPress={() => router.back()}>
        <Text style={styles.textoVolver}>Volver a la imagen</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flexGrow: 1,
    backgroundColor: '#f2f2f2',
    padding: 22,
    paddingTop: 60,
  },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#d93636',
  },
  nombre: {
    fontSize: 25,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'capitalize',
    marginTop: 8,
  },
  id: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 25,
    color: '#666666',
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cajaPequena: {
    width: '48%',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
  },
  caja: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 10,
    padding: 18,
    marginTop: 15,
  },
  etiqueta: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  valor: {
    fontSize: 22,
  },
  item: {
    fontSize: 16,
    textTransform: 'capitalize',
    marginBottom: 5,
  },
  botonVolver: {
    backgroundColor: '#333333',
    marginTop: 22,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoVolver: {
    color: 'white',
    fontWeight: 'bold',
  },
  sinPokemon: {
    fontSize: 18,
    marginBottom: 15,
  },
});

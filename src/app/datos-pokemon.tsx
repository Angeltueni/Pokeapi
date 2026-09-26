import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { usePokemon } from '@/context/PokemonContext';

export default function DatosPokemonScreen() {
  const { pokemon } = usePokemon();

  if (!pokemon) {
    return (
      <View style={styles.centro}>
        <Text style={styles.mensaje}>Primero busca un Pokémon en la pestaña Pokémon.</Text>
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
          <Text key={tipo} style={styles.item}>• {tipo}</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flexGrow: 1, backgroundColor: '#f2f2f2', padding: 22, paddingTop: 60, paddingBottom: 100 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25, backgroundColor: '#f2f2f2' },
  mensaje: { fontSize: 18, textAlign: 'center' },
  titulo: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#d93636' },
  nombre: { fontSize: 25, fontWeight: 'bold', textAlign: 'center', textTransform: 'capitalize', marginTop: 8 },
  id: { textAlign: 'center', fontSize: 16, marginBottom: 25, color: '#666' },
  fila: { flexDirection: 'row', justifyContent: 'space-between' },
  cajaPequena: { width: '48%', backgroundColor: 'white', borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 18, alignItems: 'center' },
  caja: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 18, marginTop: 15 },
  etiqueta: { fontSize: 17, fontWeight: 'bold', marginBottom: 8 },
  valor: { fontSize: 22 },
  item: { fontSize: 16, textTransform: 'capitalize', marginBottom: 5 },
});

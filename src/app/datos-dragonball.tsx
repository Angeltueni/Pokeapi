import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDragonBall } from '@/context/DragonBallContext';

export default function DatosDragonBallScreen() {
  const { personaje } = useDragonBall();

  if (!personaje) {
    return (
      <View style={styles.centro}>
        <Text style={styles.mensaje}>Primero busca un personaje en la pestaña Dragon Ball.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pantalla}>
      <Text style={styles.titulo}>Datos de Dragon Ball</Text>
      <Text style={styles.nombre}>{personaje.nombre}</Text>

      <View style={styles.caja}>
        <Text style={styles.etiqueta}>Raza</Text>
        <Text style={styles.valor}>{personaje.raza || 'Sin dato'}</Text>
      </View>

      <View style={styles.caja}>
        <Text style={styles.etiqueta}>Ki</Text>
        <Text style={styles.valor}>{personaje.ki || 'Sin dato'}</Text>
      </View>

      <View style={styles.caja}>
        <Text style={styles.etiqueta}>Género</Text>
        <Text style={styles.valor}>{personaje.genero || 'Sin dato'}</Text>
      </View>

      <View style={styles.caja}>
        <Text style={styles.etiqueta}>Afiliación</Text>
        <Text style={styles.valor}>{personaje.afiliacion || 'Sin dato'}</Text>
      </View>

      <View style={styles.caja}>
        <Text style={styles.etiqueta}>Descripción</Text>
        <Text style={styles.descripcion}>{personaje.descripcion || 'Sin descripción'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flexGrow: 1, backgroundColor: '#f6f1e8', padding: 22, paddingTop: 60, paddingBottom: 100 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25, backgroundColor: '#f6f1e8' },
  mensaje: { fontSize: 18, textAlign: 'center' },
  titulo: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#e47713' },
  nombre: { fontSize: 25, fontWeight: 'bold', textAlign: 'center', marginTop: 8, marginBottom: 20 },
  caja: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 18, marginBottom: 12 },
  etiqueta: { fontSize: 17, fontWeight: 'bold', marginBottom: 6 },
  valor: { fontSize: 18 },
  descripcion: { fontSize: 16, lineHeight: 23 },
});

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

import { useDragonBall } from '@/context/DragonBallContext';

export default function DragonBallScreen() {
  const [texto, setTexto] = useState('');
  const { personaje, cargando, error, buscarPersonaje } = useDragonBall();

  const buscar = async () => {
    const encontrado = await buscarPersonaje(texto);
    if (encontrado) setTexto('');
  };

  return (
    <ScrollView contentContainerStyle={styles.pantalla}>
      <Text style={styles.titulo}>Dragon Ball</Text>

      <View style={styles.buscador}>
        <TextInput
          style={styles.input}
          placeholder="Ej: Goku"
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={buscar}
          autoCapitalize="words"
        />
        <Pressable style={styles.botonBuscar} onPress={buscar}>
          <Text style={styles.textoBoton}>Buscar</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.tarjetaPrincipal}>
        {cargando ? (
          <ActivityIndicator size="large" />
        ) : personaje ? (
          <>
            {personaje.imagen ? (
              <Image source={{ uri: personaje.imagen }} style={styles.imagenPrincipal} />
            ) : (
              <Text>Sin imagen</Text>
            )}
            <Text style={styles.nombre}>{personaje.nombre}</Text>
          </>
        ) : (
          <Text style={styles.mensaje}>Busca un personaje de Dragon Ball</Text>
        )}
      </View>

      {personaje ? (
        <View style={styles.filaImagenes}>
          <View style={styles.tarjetaPequena}>
            {personaje.imagen2 ? (
              <Image source={{ uri: personaje.imagen2 }} style={styles.imagenPequena} />
            ) : (
              <Text>Sin imagen</Text>
            )}
          </View>
          <View style={styles.tarjetaPequena}>
            {personaje.imagen3 ? (
              <Image source={{ uri: personaje.imagen3 }} style={styles.imagenPequena} />
            ) : (
              <Text>Sin imagen</Text>
            )}
          </View>
        </View>
      ) : null}

      <Text style={styles.ayuda}>Los datos completos están en la pestaña Datos DB.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flexGrow: 1, backgroundColor: '#f6f1e8', padding: 20, paddingTop: 55, paddingBottom: 100 },
  titulo: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#e47713' },
  buscador: { flexDirection: 'row', marginBottom: 10 },
  input: { flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#aaa', borderRadius: 8, paddingHorizontal: 12, marginRight: 8 },
  botonBuscar: { backgroundColor: '#e47713', borderRadius: 8, justifyContent: 'center', paddingHorizontal: 16 },
  textoBoton: { color: 'white', fontWeight: 'bold' },
  error: { color: '#b00020', marginBottom: 10 },
  tarjetaPrincipal: { minHeight: 330, backgroundColor: 'white', borderWidth: 2, borderColor: '#333', borderRadius: 10, justifyContent: 'center', alignItems: 'center', padding: 15 },
  imagenPrincipal: { width: 240, height: 260, resizeMode: 'contain' },
  nombre: { fontSize: 24, fontWeight: 'bold', marginTop: 5 },
  mensaje: { color: '#666', textAlign: 'center' },
  filaImagenes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  tarjetaPequena: { width: '48%', height: 170, backgroundColor: 'white', borderWidth: 2, borderColor: '#e47713', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  imagenPequena: { width: 140, height: 155, resizeMode: 'contain' },
  ayuda: { textAlign: 'center', color: '#666', marginTop: 18 },
});

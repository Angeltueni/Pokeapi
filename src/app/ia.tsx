import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { preguntarIA, RespuestaIA } from '@/services/iaApi';

export default function IAScreen() {
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState<RespuestaIA | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePreguntar = async () => {
    const textoLimpio = pregunta.trim();
    if (!textoLimpio) {
      setError('Por favor escribe una pregunta antes de consultar.');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const data = await preguntarIA(textoLimpio);
      setRespuesta(data);
    } catch (err: any) {
      setError(err?.message || 'Error al comunicarse con el asistente de IA.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.pantalla}>
      <Text style={styles.titulo}>Asistente Pokeanime</Text>
      <Text style={styles.subtitulo}>
        Pregunta sobre nuestros Pokémon y personajes de Anime
      </Text>

      <View style={styles.contenedorInput}>
        <Text style={styles.label}>Pregunta:</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: ¿Cuánto pesa Gengar?"
          placeholderTextColor="#888"
          value={pregunta}
          onChangeText={(texto) => {
            setPregunta(texto);
            if (error) setError(null);
          }}
          multiline
          numberOfLines={3}
          editable={!cargando}
        />

        <Pressable
          style={[styles.boton, cargando && styles.botonDeshabilitado]}
          onPress={handlePreguntar}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.textoBoton}>Preguntar</Text>
          )}
        </Pressable>
      </View>

      {error ? (
        <View style={styles.cajaError}>
          <Text style={styles.textoError}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.tarjetaRespuesta}>
        <Text style={styles.encabezadoRespuesta}>Respuesta:</Text>
        {cargando ? (
          <View style={styles.cargandoContenedor}>
            <ActivityIndicator size="large" color="#1e88e5" />
            <Text style={styles.mensajeCargando}>Consultando con la IA...</Text>
          </View>
        ) : respuesta ? (
          <View style={styles.contenidoRespuesta}>
            <Text style={styles.textoRespuesta}>{respuesta.respuesta}</Text>
            {respuesta.contexto ? (
              <Text style={styles.metaContexto}>
                Contexto verificado: {respuesta.contexto.pokemones} Pokémon y{' '}
                {respuesta.contexto.personajes} personajes de Anime.
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.placeholderRespuesta}>
            Escribe una pregunta para consultar al asistente.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    minHeight: '100%',
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    color: '#1e88e5',
  },
  subtitulo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  contenedorInput: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 14,
    color: '#222',
  },
  boton: {
    backgroundColor: '#1e88e5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoBoton: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cajaError: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ef9a9a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  textoError: {
    color: '#c62828',
    fontSize: 14,
  },
  tarjetaRespuesta: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 180,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  encabezadoRespuesta: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 6,
  },
  cargandoContenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  mensajeCargando: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  contenidoRespuesta: {
    paddingVertical: 6,
  },
  textoRespuesta: {
    fontSize: 16,
    lineHeight: 24,
    color: '#222',
  },
  metaContexto: {
    marginTop: 14,
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  placeholderRespuesta: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 30,
  },
});

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  ConfiguracionIA,
  obtenerConfiguracionIA,
  preguntarIA,
  ProveedorIA,
  RespuestaIA,
  TimeoutIA,
} from '@/services/iaApi';

const TIMEOUT_OPCIONES: TimeoutIA[] = [20, 40, 80, 160];

export default function IAScreen() {
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState<RespuestaIA | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [proveedor, setProveedor] = useState<ProveedorIA>('gemini');
  const [timeout, setTimeout] = useState<TimeoutIA>(40);
  const [configuracion, setConfiguracion] = useState<ConfiguracionIA | null>(null);

  useEffect(() => {
    let montado = true;
    obtenerConfiguracionIA().then((cfg) => {
      if (montado && cfg) {
        setConfiguracion(cfg);
        if (cfg.proveedorPorDefecto) {
          setProveedor(cfg.proveedorPorDefecto);
        }
        if (cfg.timeoutPorDefecto) {
          setTimeout(cfg.timeoutPorDefecto);
        }
      }
    });
    return () => {
      montado = false;
    };
  }, []);

  const groqInfo = configuracion?.proveedores.find((p) => p.id === 'groq');
  const groqDisponible = groqInfo ? groqInfo.disponible : true;

  const handlePreguntar = async () => {
    const textoLimpio = pregunta.trim();
    if (!textoLimpio) {
      setError('Por favor escribe una pregunta antes de consultar.');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const data = await preguntarIA(textoLimpio, proveedor, timeout);
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
        {/* Selector de Proveedor */}
        <Text style={styles.label}>Proveedor de IA:</Text>
        <View style={styles.grupoBotones}>
          <Pressable
            style={[
              styles.opcionBoton,
              proveedor === 'gemini' && styles.opcionBotonActivo,
              cargando && styles.opcionBotonDeshabilitado,
            ]}
            onPress={() => setProveedor('gemini')}
            disabled={cargando}
          >
            <Text
              style={[
                styles.textoOpcionBoton,
                proveedor === 'gemini' && styles.textoOpcionBotonActivo,
              ]}
            >
              Gemini
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.opcionBoton,
              proveedor === 'groq' && styles.opcionBotonActivo,
              (!groqDisponible || cargando) && styles.opcionBotonDeshabilitado,
            ]}
            onPress={() => {
              if (groqDisponible) {
                setProveedor('groq');
              }
            }}
            disabled={!groqDisponible || cargando}
          >
            <Text
              style={[
                styles.textoOpcionBoton,
                proveedor === 'groq' && styles.textoOpcionBotonActivo,
                !groqDisponible && styles.textoOpcionBotonDesactivado,
              ]}
            >
              {groqDisponible ? 'Groq' : 'Groq (No configurado)'}
            </Text>
          </Pressable>
        </View>

        {/* Selector de Timeout */}
        <Text style={[styles.label, { marginTop: 12 }]}>Tiempo de espera:</Text>
        <View style={styles.grupoBotones}>
          {TIMEOUT_OPCIONES.map((opc) => {
            const activo = timeout === opc;
            return (
              <Pressable
                key={opc}
                style={[
                  styles.opcionBotonTimeout,
                  activo && styles.opcionBotonActivo,
                  cargando && styles.opcionBotonDeshabilitado,
                ]}
                onPress={() => setTimeout(opc)}
                disabled={cargando}
              >
                <Text
                  style={[
                    styles.textoOpcionBoton,
                    activo && styles.textoOpcionBotonActivo,
                  ]}
                >
                  {opc} s
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { marginTop: 14 }]}>Pregunta:</Text>
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
            <Text style={styles.mensajeCargando}>
              Consultando con {proveedor === 'gemini' ? 'Gemini' : 'Groq'} (máx {timeout}s)...
            </Text>
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

            {/* Metadatos de la respuesta requeridos */}
            <View style={styles.contenedorMetadatos}>
              <Text style={styles.textoMetadato}>
                IA utilizada: <Text style={styles.valorMetadato}>{respuesta.proveedor || proveedor}</Text>
              </Text>
              <Text style={styles.textoMetadato}>
                Tiempo configurado: <Text style={styles.valorMetadato}>{respuesta.timeout || timeout} segundos</Text>
              </Text>
              {respuesta.tiempoTotalMs ? (
                <Text style={styles.textoMetadato}>
                  Tiempo de respuesta real: <Text style={styles.valorMetadato}>{(respuesta.tiempoTotalMs / 1000).toFixed(2)} s</Text>
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <Text style={styles.placeholderRespuesta}>
            Selecciona el proveedor, el tiempo de espera y escribe una pregunta.
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
  grupoBotones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  opcionBoton: {
    flex: 1,
    minWidth: 120,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionBotonTimeout: {
    flex: 1,
    minWidth: 60,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionBotonActivo: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1e88e5',
  },
  opcionBotonDeshabilitado: {
    opacity: 0.5,
  },
  textoOpcionBoton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  textoOpcionBotonActivo: {
    color: '#1e88e5',
    fontWeight: 'bold',
  },
  textoOpcionBotonDesactivado: {
    color: '#999',
    fontSize: 12,
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
  contenedorMetadatos: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  textoMetadato: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  valorMetadato: {
    fontWeight: 'bold',
    color: '#1e88e5',
  },
  placeholderRespuesta: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 30,
  },
});

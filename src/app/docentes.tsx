import { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';

import { Docente, obtenerDocente, obtenerDocentes } from '@/services/docentesApi';

export default function DocentesScreen() {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [docente, setDocente] = useState<Docente | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [verPerfil, setVerPerfil] = useState(false);

  useEffect(() => {
    async function cargarDocentes() {
      try {
        setCargando(true);
        setError('');
        // Obtiene la lista completa de docentes: GET /docentes
        const datos = await obtenerDocentes();
        setDocentes(datos);
        if (datos.length > 0) {
          setDocente(datos[0]);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar la información de los docentes.'
        );
      } finally {
        setCargando(false);
      }
    }

    cargarDocentes();
  }, []);

  async function seleccionarDocente(id: number) {
    try {
      // Consulta individual con Path Param: GET /docentes/{id}
      const datos = await obtenerDocente(id);
      setDocente(datos);
      setBusqueda('');
      setVerPerfil(false);
    } catch {
      setError('No se pudo cargar el docente seleccionado.');
    }
  }

  const docentesFiltrados = docentes.filter((item) =>
    item.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#1e88e5" />
        <Text style={styles.mensajeCarga}>
          Cargando información de docentes...
        </Text>
      </View>
    );
  }

  if (error || !docente) {
    return (
      <View style={styles.centro}>
        <Ionicons name="alert-circle-outline" size={60} color="#b00020" />
        <Text style={styles.error}>
          {error || 'No se pudo cargar la información de los docentes.'}
        </Text>
      </View>
    );
  }

  // ==========================================
  // VISTA 2: PERFIL COMPLETO (verPerfil === true)
  // ==========================================
  if (verPerfil) {
    return (
      <View style={styles.contenedorPerfil}>
        <View style={styles.cabeceraFija}>
          {docente.imagen ? (
            <Image
              source={{ uri: docente.imagen }}
              style={styles.imagenPerfil}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person-circle" size={100} color="#888" />
          )}
          <Text style={styles.nombrePerfil}>{docente.nombre}</Text>
          <Text style={styles.subtituloSeccion}>PERFIL ACADÉMICO</Text>
        </View>

        <ScrollView
          style={styles.scrollInformacion}
          contentContainerStyle={styles.contenidoScroll}
        >
          <View style={styles.tarjeta}>
            <Text style={styles.etiqueta}>Cargo</Text>
            <Text style={styles.valor}>{docente.cargo || 'No disponible'}</Text>
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.etiqueta}>Programa</Text>
            <Text style={styles.valor}>{docente.programa || 'No disponible'}</Text>
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.etiqueta}>Pregrado</Text>
            <Text style={styles.valor}>{docente.pregrado || 'No disponible'}</Text>
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.etiqueta}>Posgrado</Text>
            <Text style={styles.valor}>{docente.posgrado || 'No disponible'}</Text>
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.etiqueta}>Experiencia</Text>
            <Text style={styles.valor}>
              {docente.experiencia || 'No disponible'}
            </Text>
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.etiqueta}>Resumen</Text>
            <Text style={styles.valor}>{docente.resumen || 'No disponible'}</Text>
          </View>

          <Pressable
            style={styles.botonAccion}
            onPress={() => setVerPerfil(false)}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
            <Text style={styles.textoBoton}>Regresar</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ==========================================
  // VISTA 1: RESUMEN Y BÚSQUEDA (verPerfil === false)
  // ==========================================
  return (
    <ScrollView contentContainerStyle={styles.pantalla}>
      <Text style={styles.titulo}>Datos de Docentes UNINPAHU</Text>

      {/* Buscador de docentes */}
      <View style={styles.contenedorBuscador}>
        <Ionicons name="search" size={20} color="#666" style={styles.iconoBuscador} />
        <TextInput
          style={styles.inputBusqueda}
          placeholder="Buscar docente..."
          placeholderTextColor="#888"
          value={busqueda}
          onChangeText={setBusqueda}
          autoCapitalize="none"
        />
        {busqueda.length > 0 && (
          <Pressable onPress={() => setBusqueda('')}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </Pressable>
        )}
      </View>

      {/* Resultados de la búsqueda */}
      {busqueda.trim().length > 0 && (
        <View style={styles.contenedorResultados}>
          {docentesFiltrados.length === 0 ? (
            <Text style={styles.sinResultados}>No se encontraron docentes</Text>
          ) : (
            docentesFiltrados.map((item) => (
              <Pressable
                key={item.id}
                style={styles.resultadoDocente}
                onPress={() => seleccionarDocente(item.id)}
              >
                <Text style={styles.nombreResultado}>{item.nombre}</Text>
                {item.cargo ? (
                  <Text style={styles.cargoResultado}>{item.cargo}</Text>
                ) : null}
                {item.programa ? (
                  <Text style={styles.programaResultado}>{item.programa}</Text>
                ) : null}
              </Pressable>
            ))
          )}
        </View>
      )}

      {/* Docente seleccionado actualmente */}
      <Text style={styles.nombreResumen}>{docente.nombre}</Text>

      <View style={styles.tarjetaPrincipal}>
        {docente.imagen ? (
          <Image
            source={{ uri: docente.imagen }}
            style={styles.imagenGrande}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="person-circle" size={140} color="#888" />
        )}

        {docente.cargo ? (
          <Text style={styles.cargoResumen}>{docente.cargo}</Text>
        ) : null}

        {docente.programa ? (
          <Text style={styles.programaResumen}>{docente.programa}</Text>
        ) : null}
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.etiqueta}>Resumen</Text>
        <Text style={styles.valor}>{docente.resumen || 'No disponible'}</Text>
      </View>

      <Pressable
        style={styles.botonAccion}
        onPress={() => setVerPerfil(true)}
      >
        <Text style={styles.textoBoton}>Ver más</Text>
        <Ionicons name="arrow-forward" size={20} color="white" />
      </Pressable>
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
  contenedorPerfil: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  cabeceraFija: {
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#f2f2f2',
  },
  scrollInformacion: {
    flex: 1,
  },
  contenidoScroll: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    padding: 25,
  },
  mensajeCarga: {
    marginTop: 15,
    fontSize: 16,
    color: '#555',
  },
  error: {
    marginTop: 15,
    fontSize: 16,
    color: '#b00020',
    textAlign: 'center',
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1565c0',
    marginBottom: 16,
  },
  contenedorBuscador: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  iconoBuscador: {
    marginRight: 8,
  },
  inputBusqueda: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  contenedorResultados: {
    marginBottom: 16,
  },
  resultadoDocente: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  nombreResultado: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565c0',
  },
  cargoResultado: {
    fontSize: 14,
    color: '#444',
    marginTop: 2,
  },
  programaResultado: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  sinResultados: {
    textAlign: 'center',
    fontSize: 15,
    color: '#777',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  nombreResumen: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 16,
  },
  tarjetaPrincipal: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  imagenGrande: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginBottom: 15,
  },
  cargoResumen: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565c0',
    textAlign: 'center',
    marginBottom: 4,
  },
  programaResumen: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  imagenPerfil: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: 12,
  },
  nombrePerfil: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
  },
  subtituloSeccion: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1565c0',
    letterSpacing: 1.5,
    marginTop: 8,
  },
  tarjeta: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  etiqueta: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1565c0',
    marginBottom: 6,
  },
  valor: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  botonAccion: {
    backgroundColor: '#1565c0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  textoBoton: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

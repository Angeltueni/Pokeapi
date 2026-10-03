import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Docente, obtenerDocente } from '@/services/docentesApi';

export default function DocentesScreen() {
  const [docente, setDocente] = useState<Docente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [verPerfil, setVerPerfil] = useState(false);

  useEffect(() => {
    async function cargarDocente() {
      try {
        setCargando(true);
        setError('');
        // Consulta usando el endpoint con Path Param: GET /docentes/1
        const datos = await obtenerDocente(1);
        setDocente(datos);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar la información del docente.'
        );
      } finally {
        setCargando(false);
      }
    }

    cargarDocente();
  }, []);

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#1e88e5" />
        <Text style={styles.mensajeCarga}>
          Cargando información del docente...
        </Text>
      </View>
    );
  }

  if (error || !docente) {
    return (
      <View style={styles.centro}>
        <Ionicons name="alert-circle-outline" size={60} color="#b00020" />
        <Text style={styles.error}>
          {error || 'No se pudo cargar la información del docente.'}
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
  // VISTA 1: RESUMEN (verPerfil === false)
  // ==========================================
  return (
    <ScrollView contentContainerStyle={styles.pantalla}>
      <Text style={styles.titulo}>Datos de Docentes UNINPAHU</Text>
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
    marginBottom: 8,
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
  cabeceraPerfil: {
    alignItems: 'center',
    marginBottom: 20,
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

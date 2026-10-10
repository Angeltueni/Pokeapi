import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  DocenteInput,
  DocenteModel,
  actualizarDocente,
  consultarDocente,
  crearDocente,
  eliminarDocente,
  inicializarRepositorio,
  listarDocentes,
} from '@/repositories/docentesRepository';
import {
  sincronizarDocentesPendientes,
  suscribirCambiosDeRed,
} from '@/services/docentesSync';

type Modo = 'principal' | 'crear' | 'editar' | 'perfil';

export default function DocentesScreen() {
  const [modo, setModo] = useState<Modo>('principal');
  const [docentes, setDocentes] = useState<DocenteModel[]>([]);
  const [docente, setDocente] = useState<DocenteModel | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  // Estado del formulario para Crear / Editar
  const [formulario, setFormulario] = useState<DocenteInput>({
    nombre: '',
    cargo: '',
    programa: '',
    resumen: '',
    pregrado: '',
    posgrado: '',
    experiencia: '',
    imagen: '',
  });

  // Carga de docentes utilizando el Repositorio (identificación unívoca por local_id)
  async function cargarDocentes(idSeleccionar?: number) {
    try {
      setCargando(true);
      setError('');
      const datos = await listarDocentes();
      setDocentes(datos);

      if (datos.length > 0) {
        if (idSeleccionar !== undefined) {
          const encontrado = datos.find((d) => d.id === idSeleccionar);
          setDocente(encontrado || datos[0]);
        } else {
          setDocente((prev) => {
            if (prev && datos.some((d) => d.id === prev.id)) {
              return datos.find((d) => d.id === prev.id) || datos[0];
            }
            return datos[0];
          });
        }
      } else {
        setDocente(null);
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

  // Inicialización de SQLite y suscripción a reconexión de red en tiempo real
  useEffect(() => {
    async function iniciar() {
      try {
        await inicializarRepositorio();
      } catch (err) {
        console.warn('Error en la inicialización del repositorio:', err);
      }
      await cargarDocentes();
    }

    iniciar();

    // Listener de reconexión: al pasar de offline a online sincroniza automáticamente
    const desuscribirRed = suscribirCambiosDeRed(async () => {
      try {
        await sincronizarDocentesPendientes();
        await cargarDocentes();
      } catch (err) {
        console.warn('Error al sincronizar tras reconexión:', err);
      }
    });

    return () => {
      desuscribirRed();
    };
  }, []);

  // Seleccionar docente por local_id
  async function seleccionarDocente(localId: number) {
    try {
      const datos = await consultarDocente(localId);
      setDocente(datos);
      setBusqueda('');
      setModo('principal');
    } catch {
      Alert.alert('Error', 'No se pudo cargar el docente seleccionado.');
    }
  }

  // Abrir formulario de creación
  function abrirCrear() {
    setFormulario({
      nombre: '',
      cargo: '',
      programa: '',
      resumen: '',
      pregrado: '',
      posgrado: '',
      experiencia: '',
      imagen: '',
    });
    setModo('crear');
  }

  // Abrir formulario de edición con los datos actuales
  function abrirEditar() {
    if (!docente) return;
    setFormulario({
      nombre: docente.nombre || '',
      cargo: docente.cargo || '',
      programa: docente.programa || '',
      resumen: docente.resumen || '',
      pregrado: docente.pregrado || '',
      posgrado: docente.posgrado || '',
      experiencia: docente.experiencia || '',
      imagen: docente.imagen || '',
    });
    setModo('editar');
  }

  // Guardar docente (Crear o Actualizar)
  async function guardarDocente() {
    if (!formulario.nombre.trim()) {
      Alert.alert('Campo obligatorio', 'El nombre del docente es obligatorio.');
      return;
    }

    try {
      setProcesando(true);

      if (modo === 'crear') {
        const nuevo = await crearDocente(formulario);
        Alert.alert('Éxito', 'Docente creado correctamente.');
        await cargarDocentes(nuevo.id);
        setModo('principal');
      } else if (modo === 'editar' && docente) {
        const actualizado = await actualizarDocente(docente.id, formulario);
        Alert.alert('Éxito', 'Docente actualizado correctamente.');
        setDocente(actualizado);
        await cargarDocentes(docente.id);
        setModo('principal');
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la información del docente.'
      );
    } finally {
      setProcesando(false);
    }
  }

  // Confirmar y eliminar docente
  function confirmarEliminar() {
    if (!docente) return;

    Alert.alert(
      'Eliminar docente',
      `¿Está seguro de eliminar a ${docente.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: ejecutarEliminar,
        },
      ]
    );
  }

  // Ejecución de eliminación por local_id
  async function ejecutarEliminar() {
    if (!docente) return;

    try {
      setProcesando(true);
      await eliminarDocente(docente.id);
      Alert.alert('Éxito', 'Docente eliminado correctamente.');
      const listaActualizada = await listarDocentes();
      setDocentes(listaActualizada);
      if (listaActualizada.length > 0) {
        setDocente(listaActualizada[0]);
      } else {
        setDocente(null);
      }
      setModo('principal');
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar el docente.'
      );
    } finally {
      setProcesando(false);
    }
  }

  // Filtro de docentes por nombre
  const docentesFiltrados = docentes.filter((item) =>
    item.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Vista de Carga
  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#1565c0" />
        <Text style={styles.mensajeCarga}>Cargando información de docentes...</Text>
      </View>
    );
  }

  // Vista de Error Global
  if (error && !docente && docentes.length === 0) {
    return (
      <View style={styles.centro}>
        <Ionicons name="alert-circle-outline" size={60} color="#b00020" />
        <Text style={styles.error}>{error}</Text>
        <Pressable
          style={styles.botonReintentar}
          onPress={() => cargarDocentes()}
        >
          <Ionicons name="refresh" size={20} color="white" />
          <Text style={styles.textoBoton}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  // ==================================================
  // VISTA: PERFIL COMPLETO (modo === 'perfil')
  // ==================================================
  if (modo === 'perfil' && docente) {
    return (
      <View style={styles.contenedorPerfil}>
        {/* CABECERA FIJA (Fuera del ScrollView) */}
        <View style={styles.cabeceraFija}>
          {docente.imagen ? (
            <Image
              source={{ uri: docente.imagen }}
              style={styles.imagenPerfil}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person-circle" size={110} color="#888" />
          )}
          <Text style={styles.nombrePerfil}>{docente.nombre}</Text>
          <Text style={styles.subtituloSeccion}>PERFIL ACADÉMICO</Text>
        </View>

        {/* ZONA DE INFORMACIÓN SCROLLABLE */}
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
            <Text style={styles.valor}>
              {docente.programa || 'No disponible'}
            </Text>
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.etiqueta}>Pregrado</Text>
            <Text style={styles.valor}>
              {docente.pregrado || 'No disponible'}
            </Text>
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.etiqueta}>Posgrado</Text>
            <Text style={styles.valor}>
              {docente.posgrado || 'No disponible'}
            </Text>
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
            style={styles.botonRegresar}
            onPress={() => setModo('principal')}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
            <Text style={styles.textoBoton}>Regresar</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ==================================================
  // VISTA: FORMULARIO (modo === 'crear' | 'editar')
  // ==================================================
  if (modo === 'crear' || modo === 'editar') {
    return (
      <ScrollView contentContainerStyle={styles.pantallaFormulario}>
        <Text style={styles.tituloFormulario}>
          {modo === 'crear' ? 'Agregar Nuevo Docente' : 'Editar Docente'}
        </Text>

        <View style={styles.campoFormulario}>
          <Text style={styles.labelFormulario}>Nombre *</Text>
          <TextInput
            style={styles.inputFormulario}
            placeholder="Nombre completo"
            value={formulario.nombre}
            onChangeText={(texto) =>
              setFormulario((prev) => ({ ...prev, nombre: texto }))
            }
          />
        </View>

        <View style={styles.campoFormulario}>
          <Text style={styles.labelFormulario}>Cargo</Text>
          <TextInput
            style={styles.inputFormulario}
            placeholder="Ej: Docente de Tiempo Completo"
            value={formulario.cargo}
            onChangeText={(texto) =>
              setFormulario((prev) => ({ ...prev, cargo: texto }))
            }
          />
        </View>

        <View style={styles.campoFormulario}>
          <Text style={styles.labelFormulario}>Programa</Text>
          <TextInput
            style={styles.inputFormulario}
            placeholder="Ej: Ingeniería de Software"
            value={formulario.programa}
            onChangeText={(texto) =>
              setFormulario((prev) => ({ ...prev, programa: texto }))
            }
          />
        </View>

        <View style={styles.campoFormulario}>
          <Text style={styles.labelFormulario}>Resumen</Text>
          <TextInput
            style={[styles.inputFormulario, styles.inputMultiline]}
            placeholder="Breve descripción del perfil académico y profesional"
            multiline
            numberOfLines={3}
            value={formulario.resumen}
            onChangeText={(texto) =>
              setFormulario((prev) => ({ ...prev, resumen: texto }))
            }
          />
        </View>

        <View style={styles.campoFormulario}>
          <Text style={styles.labelFormulario}>Pregrado</Text>
          <TextInput
            style={styles.inputFormulario}
            placeholder="Ej: Ingeniero de Sistemas"
            value={formulario.pregrado}
            onChangeText={(texto) =>
              setFormulario((prev) => ({ ...prev, pregrado: texto }))
            }
          />
        </View>

        <View style={styles.campoFormulario}>
          <Text style={styles.labelFormulario}>Posgrado</Text>
          <TextInput
            style={styles.inputFormulario}
            placeholder="Ej: Magíster en Informática"
            value={formulario.posgrado}
            onChangeText={(texto) =>
              setFormulario((prev) => ({ ...prev, posgrado: texto }))
            }
          />
        </View>

        <View style={styles.campoFormulario}>
          <Text style={styles.labelFormulario}>Experiencia</Text>
          <TextInput
            style={[styles.inputFormulario, styles.inputMultiline]}
            placeholder="Años y áreas de experiencia laboral y docente"
            multiline
            numberOfLines={3}
            value={formulario.experiencia}
            onChangeText={(texto) =>
              setFormulario((prev) => ({ ...prev, experiencia: texto }))
            }
          />
        </View>

        <View style={styles.campoFormulario}>
          <Text style={styles.labelFormulario}>URL de Imagen</Text>
          <TextInput
            style={styles.inputFormulario}
            placeholder="https://ejemplo.com/foto.jpg"
            autoCapitalize="none"
            value={formulario.imagen}
            onChangeText={(texto) =>
              setFormulario((prev) => ({ ...prev, imagen: texto }))
            }
          />
        </View>

        {/* Botones de acción del formulario */}
        <View style={styles.filaBotonesFormulario}>
          <Pressable
            style={[styles.botonGuardar, procesando && styles.botonDesactivado]}
            disabled={procesando}
            onPress={guardarDocente}
          >
            {procesando ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="white" />
                <Text style={styles.textoBoton}>
                  {modo === 'crear' ? 'Guardar' : 'Guardar cambios'}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.botonCancelar, procesando && styles.botonDesactivado]}
            disabled={procesando}
            onPress={() => setModo('principal')}
          >
            <Ionicons name="close-circle-outline" size={20} color="white" />
            <Text style={styles.textoBoton}>Cancelar</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ==================================================
  // VISTA: PRINCIPAL DE DOCENTES (modo === 'principal')
  // ==================================================
  return (
    <ScrollView contentContainerStyle={styles.pantalla}>
      <Text style={styles.titulo}>Datos de Docentes UNINPAHU</Text>

      {/* Buscador de docentes */}
      <View style={styles.contenedorBuscador}>
        <Ionicons
          name="search"
          size={20}
          color="#666"
          style={styles.iconoBuscador}
        />
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

      {/* Botón para Agregar Nuevo Docente */}
      <Pressable style={styles.botonAgregar} onPress={abrirCrear}>
        <Ionicons name="add-circle-outline" size={22} color="white" />
        <Text style={styles.textoBotonAgregar}>Agregar docente</Text>
      </Pressable>

      {/* Tarjeta del Docente Seleccionado */}
      {docente ? (
        <>
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
            <Text style={styles.valor}>
              {docente.resumen || 'No disponible'}
            </Text>
          </View>

          {/* Botones de Acción CRUD */}
          <View style={styles.contenedorAccionesCrud}>
            <Pressable
              style={styles.botonVerMas}
              onPress={() => setModo('perfil')}
            >
              <Ionicons name="eye-outline" size={20} color="white" />
              <Text style={styles.textoBoton}>Ver más</Text>
            </Pressable>

            <Pressable style={styles.botonEditar} onPress={abrirEditar}>
              <Ionicons name="create-outline" size={20} color="white" />
              <Text style={styles.textoBoton}>Editar</Text>
            </Pressable>

            <Pressable
              style={[
                styles.botonEliminar,
                procesando && styles.botonDesactivado,
              ]}
              disabled={procesando}
              onPress={confirmarEliminar}
            >
              {procesando ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color="white" />
                  <Text style={styles.textoBoton}>Eliminar</Text>
                </>
              )}
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.tarjetaVacia}>
          <Ionicons name="school-outline" size={60} color="#999" />
          <Text style={styles.textoVacio}>
            No hay docentes registrados en la base de datos.
          </Text>
        </View>
      )}
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
  pantallaFormulario: {
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
  botonReintentar: {
    backgroundColor: '#1565c0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1565c0',
    marginBottom: 16,
  },
  tituloFormulario: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1565c0',
    marginBottom: 20,
  },
  contenedorBuscador: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
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
    marginBottom: 14,
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
  botonAgregar: {
    backgroundColor: '#2e7d32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  textoBotonAgregar: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
    width: 170,
    height: 170,
    borderRadius: 85,
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
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },
  nombrePerfil: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
  },
  subtituloSeccion: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1565c0',
    letterSpacing: 1.5,
    marginTop: 6,
  },
  tarjeta: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  tarjetaVacia: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  textoVacio: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
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
  contenedorAccionesCrud: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 6,
  },
  botonVerMas: {
    backgroundColor: '#1565c0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
  },
  botonEditar: {
    backgroundColor: '#0288d1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
  },
  botonEliminar: {
    backgroundColor: '#d32f2f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
  },
  botonRegresar: {
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
  // Estilos del Formulario
  campoFormulario: {
    marginBottom: 14,
  },
  labelFormulario: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  inputFormulario: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  filaBotonesFormulario: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  botonGuardar: {
    flex: 1,
    backgroundColor: '#2e7d32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  botonCancelar: {
    flex: 1,
    backgroundColor: '#757575',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  botonDesactivado: {
    opacity: 0.6,
  },
});

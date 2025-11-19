import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

function getWebSocketURL(): string {
  const wsUrl = API_URL.replace(/^https?:\/\//, (match: string) => {
    return match.startsWith('https') ? 'wss://' : 'ws://';
  });
  console.log('[ConversationsScreen] WebSocket URL:', wsUrl);
  return `${wsUrl}/ws`;
}

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol?: string;
}

interface Conversacion {
  id: number;
  tipo: string;
  ultimoMensaje: {
    cuerpo: string;
    fecha: string;
    esMio: boolean;
  } | null;
  otroUsuario: Usuario | null;
  fechaCreacion: string;
}

export default function ConversationsScreen({ navigation }: any) {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState<Record<number, number>>({});
  const socketRef = useRef<WebSocket | null>(null);
  const mensajesProcesados = useRef<Set<number>>(new Set()); // Para evitar duplicados
  const [isFocused, setIsFocused] = useState(true); // Track si esta pantalla está visible

  // Modal para nueva conversación
  const [showModal, setShowModal] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar usuario actual
  useEffect(() => {
    const getUser = async () => {
      console.log('[ConversationsScreen] Obteniendo usuario actual...');
      try {
        // Obtener usuario del backend en lugar de Supabase Auth
        const res = await fetch(`${API_URL}/profile`, {
          credentials: 'include',
        });
        
        console.log('[ConversationsScreen] Profile response status:', res.status);
        
        if (!res.ok) {
          console.log('[ConversationsScreen] Error obteniendo perfil');
          return;
        }

        const data = await res.json();
        console.log('[ConversationsScreen] Profile obtenido:', data.user ? data.user.id : 'null');
        setUsuarioActual(data.user);
      } catch (error) {
        console.error('[ConversationsScreen] Error obteniendo usuario:', error);
      }
    };
    getUser();
  }, []);

  // Manejar notificaciones tocadas
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const conversacionId = response.notification.request.content.data.conversacionId;
      console.log('[ConversationsScreen] Notificación tocada, conversacionId:', conversacionId);
      
      if (conversacionId) {
        // Buscar la conversación para obtener el título
        const conv = conversaciones.find(c => c.id === conversacionId);
        if (conv) {
          navigation.navigate('Chat', {
            conversacionId: conv.id,
            titulo: conv.otroUsuario
              ? `${conv.otroUsuario.nombre} ${conv.otroUsuario.apellido}`
              : 'Chat',
          });
        }
      }
    });

    return () => subscription.remove();
  }, [conversaciones, navigation]);

  // Detectar cuando esta pantalla está enfocada/visible
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      console.log('[ConversationsScreen] Pantalla enfocada');
      setIsFocused(true);
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      console.log('[ConversationsScreen] Pantalla desenfocada');
      setIsFocused(false);
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  // Cargar contadores desde AsyncStorage
  useEffect(() => {
    const loadCounters = async () => {
      try {
        const saved = await AsyncStorage.getItem('mensajesNoLeidos');
        if (saved) {
          setMensajesNoLeidos(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Error cargando contadores:', err);
      }
    };
    loadCounters();
  }, []);

  // Guardar contadores en AsyncStorage
  useEffect(() => {
    AsyncStorage.setItem('mensajesNoLeidos', JSON.stringify(mensajesNoLeidos));
  }, [mensajesNoLeidos]);

  // Cargar conversaciones
  const fetchConversaciones = async () => {
    console.log('[ConversationsScreen] Iniciando fetchConversaciones...');
    console.log('[ConversationsScreen] API_URL:', API_URL);
    try {
      console.log('[ConversationsScreen] Haciendo fetch a:', `${API_URL}/conversaciones`);
      const res = await fetch(`${API_URL}/conversaciones`, {
        credentials: 'include',
      });

      console.log('[ConversationsScreen] Response status:', res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.log('[ConversationsScreen] Error response:', errorText);
        throw new Error('Error al cargar conversaciones');
      }

      const data = await res.json();
      console.log('[ConversationsScreen] Conversaciones recibidas:', data.length);
      console.log('[ConversationsScreen] Primera conversacion:', data[0]);
      
      // Ordenar por fecha del último mensaje (más reciente primero)
      const conversacionesOrdenadas = data.sort((a: Conversacion, b: Conversacion) => {
        const fechaA = a.ultimoMensaje?.fecha || a.fechaCreacion;
        const fechaB = b.ultimoMensaje?.fecha || b.fechaCreacion;
        return new Date(fechaB).getTime() - new Date(fechaA).getTime();
      });
      
      setConversaciones(conversacionesOrdenadas);
    } catch (error) {
      console.error('[ConversationsScreen] Error al cargar conversaciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las conversaciones');
    } finally {
      console.log('[ConversationsScreen] Finalizando fetchConversaciones');
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('[ConversationsScreen] useEffect usuarioActual triggered');
    console.log('[ConversationsScreen] usuarioActual:', usuarioActual ? usuarioActual.id : 'null');
    if (usuarioActual) {
      console.log('[ConversationsScreen] Llamando a fetchConversaciones...');
      fetchConversaciones();
    } else {
      console.log('[ConversationsScreen] usuarioActual es null, no se llama a fetchConversaciones');
    }
  }, [usuarioActual]);

  // WebSocket para actualizaciones en tiempo real
  useEffect(() => {
    if (!usuarioActual) return;

    console.log('[ConversationsScreen] Iniciando WebSocket useEffect');
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY_MS = 2000;

    const connectWebSocket = () => {
      // Cerrar socket anterior si existe
      if (socketRef.current) {
        console.log('[ConversationsScreen] Cerrando WebSocket anterior');
        socketRef.current.close();
        socketRef.current = null;
      }

      try {
        const wsUrl = getWebSocketURL();
        console.log('[ConversationsScreen] Conectando a WebSocket:', wsUrl);
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;
        reconnectAttempts = 0;

        socket.onopen = () => {
          console.log('[ConversationsScreen] WebSocket conectado exitosamente');
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            console.log('[ConversationsScreen] WebSocket mensaje recibido:', msg);
            if (msg.tipo === 'mensaje') {
              console.log('[ConversationsScreen] Mensaje para conversacion:', msg.conversacionId);
              
              // Verificar si ya procesamos este mensaje (evitar duplicados)
              if (mensajesProcesados.current.has(msg.id)) {
                console.log('[ConversationsScreen] Mensaje ya procesado, ignorando');
                return;
              }
              mensajesProcesados.current.add(msg.id);
              
              // Actualizar la conversación correspondiente
              setConversaciones((prev) => {
                const updated = prev.map((conv) => {
                  if (conv.id === msg.conversacionId) {
                    return {
                      ...conv,
                      ultimoMensaje: {
                        cuerpo: msg.cuerpo,
                        fecha: msg.creadoEn,
                        esMio: msg.remitenteId === usuarioActual?.id,
                      },
                    };
                  }
                  return conv;
                });
                
                // Ordenar por fecha del último mensaje (más reciente primero)
                return updated.sort((a, b) => {
                  const fechaA = a.ultimoMensaje?.fecha || a.fechaCreacion;
                  const fechaB = b.ultimoMensaje?.fecha || b.fechaCreacion;
                  return new Date(fechaB).getTime() - new Date(fechaA).getTime();
                });
              });

              // Incrementar contador si no es mío
              if (msg.remitenteId !== usuarioActual?.id) {
                console.log('[ConversationsScreen] Mensaje de otro usuario');
                console.log('[ConversationsScreen] Remitente:', msg.remitenteId, 'Usuario actual:', usuarioActual?.id);
                console.log('[ConversationsScreen] Pantalla enfocada?:', isFocused);
                
                setMensajesNoLeidos((prev) => {
                  const updated = {
                    ...prev,
                    [msg.conversacionId]: (prev[msg.conversacionId] || 0) + 1,
                  };
                  // Persistir en AsyncStorage
                  AsyncStorage.setItem('mensajesNoLeidos', JSON.stringify(updated)).catch(err =>
                    console.error('Error guardando contadores:', err)
                  );
                  return updated;
                });

                // Mostrar notificación SOLO si esta pantalla está visible (no estás en un chat)
                if (isFocused) {
                  console.log('[ConversationsScreen] Mostrando notificación');
                  const nombreRemitente = msg.remitente 
                    ? `${msg.remitente.nombre} ${msg.remitente.apellido}`
                    : 'Nuevo mensaje';
                  
                  Notifications.scheduleNotificationAsync({
                    content: {
                      title: nombreRemitente,
                      body: msg.cuerpo,
                      data: { conversacionId: msg.conversacionId },
                    },
                    trigger: null,
                  }).then(() => {
                    console.log('[ConversationsScreen] ✅ Notificación enviada');
                  }).catch(err => {
                    console.error('[ConversationsScreen] ❌ Error enviando notificación:', err);
                  });
                } else {
                  console.log('[ConversationsScreen] No mostrar notificación - estás en un chat');
                }
              } else {
                console.log('[ConversationsScreen] Es mensaje propio, no mostrar notificación');
              }
            }
          } catch (err) {
            console.error('Error procesando mensaje WebSocket:', err);
          }
        };

        socket.onerror = (err) => {
          console.error('[ConversationsScreen] Error WebSocket:', err);
        };

        socket.onclose = () => {
          console.log('[ConversationsScreen] WebSocket cerrado');
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            setTimeout(connectWebSocket, RECONNECT_DELAY_MS);
          }
        };
      } catch (err) {
        console.error('Error creando WebSocket:', err);
      }
    };

    connectWebSocket();

    return () => {
      console.log('[ConversationsScreen] Cleanup: cerrando WebSocket');
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [usuarioActual?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversaciones();
  };

  // Abrir conversación
  const abrirConversacion = (conv: Conversacion) => {
    // Limpiar contador de no leídos
    setMensajesNoLeidos((prev) => {
      const updated = { ...prev };
      delete updated[conv.id];
      // Persistir en AsyncStorage
      AsyncStorage.setItem('mensajesNoLeidos', JSON.stringify(updated)).catch(err =>
        console.error('Error guardando contadores:', err)
      );
      return updated;
    });

    navigation.navigate('Chat', {
      conversacionId: conv.id,
      titulo: conv.otroUsuario
        ? `${conv.otroUsuario.nombre} ${conv.otroUsuario.apellido}`
        : 'Chat',
    });
  };

  // Cargar usuarios disponibles
  const fetchUsuarios = async () => {
    if (!usuarioActual) {
      console.log('[ConversationsScreen] No se puede cargar usuarios, usuarioActual es null');
      return;
    }
    console.log('[ConversationsScreen] Cargando usuarios...');
    setLoadingUsuarios(true);
    try {
      const url = `${API_URL}/usuarios/buscar?excludeId=${usuarioActual.id}`;
      console.log('[ConversationsScreen] Fetch usuarios URL:', url);
      const res = await fetch(url, { credentials: 'include' });
      console.log('[ConversationsScreen] Usuarios response status:', res.status);
      if (!res.ok) throw new Error('Error al cargar usuarios');
      const data = await res.json();
      console.log('[ConversationsScreen] Usuarios recibidos:', data.length);
      setUsuarios(data);
    } catch (err) {
      console.error('[ConversationsScreen] Error al cargar usuarios:', err);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoadingUsuarios(false);
    }
  };

  // Crear nueva conversación
  const crearConversacion = async (usuarioId: number) => {
    console.log('[ConversationsScreen] Creando conversacion con usuario:', usuarioId);
    try {
      const body = {
        participanteId: usuarioId,
        tipo: 'directa',
      };
      console.log('[ConversationsScreen] Request body:', body);
      const res = await fetch(`${API_URL}/conversaciones`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      console.log('[ConversationsScreen] Crear conversacion response status:', res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.log('[ConversationsScreen] Error creating conversation:', errorText);
        throw new Error('Error al crear conversación');
      }

      const nuevaConv = await res.json();
      setShowModal(false);
      setSearchTerm('');
      
      // Abrir la conversación creada
      const usuario = usuarios.find((u) => u.id === usuarioId);
      navigation.navigate('Chat', {
        conversacionId: nuevaConv.id,
        titulo: usuario
          ? `${usuario.nombre} ${usuario.apellido}`
          : 'Chat',
      });

      // Recargar lista
      fetchConversaciones();
    } catch (err) {
      console.error('Error al crear conversación:', err);
      Alert.alert('Error', 'No se pudo crear la conversación');
    }
  };

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderConversacion = ({ item }: { item: Conversacion }) => {
    const noLeidos = mensajesNoLeidos[item.id] || 0;
    const fecha = item.ultimoMensaje
      ? new Date(item.ultimoMensaje.fecha)
      : new Date(item.fechaCreacion);
    const fechaTexto = fecha.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
    });

    return (
      <TouchableOpacity
        style={styles.conversacionItem}
        onPress={() => abrirConversacion(item)}
      >
        <View style={styles.avatar}>
          <Ionicons name="person" size={24} color="#6b7280" />
        </View>
        <View style={styles.conversacionInfo}>
          <View style={styles.conversacionHeader}>
            <Text style={styles.nombreUsuario}>
              {item.otroUsuario
                ? `${item.otroUsuario.nombre} ${item.otroUsuario.apellido}`
                : 'Usuario'}
            </Text>
            <Text style={styles.fecha}>{fechaTexto}</Text>
          </View>
          <View style={styles.mensajePreview}>
            <Text
              style={[
                styles.ultimoMensaje,
                noLeidos > 0 && styles.mensajeNoLeido,
              ]}
              numberOfLines={1}
            >
              {item.ultimoMensaje?.esMio && 'Tú: '}
              {item.ultimoMensaje?.cuerpo || 'Sin mensajes'}
            </Text>
            {noLeidos > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{noLeidos}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <FlatList
          data={conversaciones}
          renderItem={renderConversacion}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={80} color="#d1d5db" />
            <Text style={styles.emptyText}>No tienes conversaciones</Text>
            <Text style={styles.emptySubtext}>
              Inicia una nueva conversación tocando el botón +
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setShowModal(true);
          fetchUsuarios();
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Conversación</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Buscar usuario..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9ca3af"
            />

            {loadingUsuarios ? (
              <ActivityIndicator size="large" color="#22c55e" />
            ) : (
              <FlatList
                data={usuariosFiltrados}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.usuarioItem}
                    onPress={() => crearConversacion(item.id)}
                  >
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={24} color="#6b7280" />
                    </View>
                    <View>
                      <Text style={styles.usuarioNombre}>
                        {item.nombre} {item.apellido}
                      </Text>
                      <Text style={styles.usuarioEmail}>{item.email}</Text>
                      {item.rol && (
                        <Text style={styles.usuarioRol}>{item.rol}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fefaf2',
  },
  container: {
    flex: 1,
    backgroundColor: '##fefaf2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversacionItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversacionInfo: {
    flex: 1,
  },
  conversacionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nombreUsuario: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  fecha: {
    fontSize: 12,
    color: '#9ca3af',
  },
  mensajePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ultimoMensaje: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  mensajeNoLeido: {
    fontWeight: '600',
    color: '#1f2937',
  },
  badge: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  usuarioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  usuarioNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  usuarioEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  usuarioRol: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
});

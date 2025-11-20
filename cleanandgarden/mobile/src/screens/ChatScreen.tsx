import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChatRealtime } from '../hooks/useChatRealtime';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// Variable global para rastrear qué conversación está abierta
let conversacionAbierta: number | null = null;

export function getConversacionAbierta(): number | null {
  return conversacionAbierta;
}

export default function ChatScreen({ route, navigation }: any) {
  const { conversacionId, titulo } = route.params;
  const [inputText, setInputText] = useState('');
  const [usuarioActual, setUsuarioActual] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  // Marcar esta conversación como abierta cuando el componente se monta
  useEffect(() => {
    console.log('[ChatScreen] Conversación abierta:', conversacionId);
    conversacionAbierta = Number(conversacionId);
    
    return () => {
      console.log('[ChatScreen] Conversación cerrada:', conversacionId);
      conversacionAbierta = null;
    };
  }, [conversacionId]);

  // Obtener usuario actual primero
  useEffect(() => {
    const getUser = async () => {
      try {
        // Obtener usuario del backend en lugar de Supabase Auth
        const res = await fetch(`${API_URL}/profile`, {
          credentials: 'include',
        });
        
        if (!res.ok) {
          console.log('[ChatScreen] Error obteniendo perfil');
          return;
        }

        const data = await res.json();
        console.log('[ChatScreen] Usuario actual:', data.user ? data.user.id : 'null');
        setUsuarioActual(data.user);
      } catch (error) {
        console.error('[ChatScreen] Error obteniendo usuario:', error);
      }
    };
    getUser();
  }, []);

  const { mensajes, loading, connected, enviarMensaje } = useChatRealtime(
    Number(conversacionId),
    usuarioActual?.id
  );

  // Configurar título y status
  useEffect(() => {
    navigation.setOptions({
      title: titulo || 'Chat',
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleLimpiarHistorial}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: connected ? '#22c55e' : '#9ca3af' },
            ]}
          />
          <Text style={styles.statusText}>
            {connected ? 'Conectado' : 'Desconectado'}
          </Text>
        </View>
      ),
    });
  }, [titulo, connected, navigation]);

  const handleLimpiarHistorial = () => {
    Alert.alert(
      'Limpiar historial',
      '¿Estás seguro de que quieres eliminar todos los mensajes de este chat?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(
                `${API_URL}/conversaciones/${conversacionId}/mensajes`,
                {
                  method: 'DELETE',
                  credentials: 'include',
                }
              );

              if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Error al eliminar mensajes');
              }

              const result = await res.json();
              console.log('Historial eliminado:', result);
              
              Alert.alert(
                'Historial eliminado', 
                `Se eliminaron ${result.mensajesEliminados} mensajes`,
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } catch (error) {
              console.error('Error eliminando historial:', error);
              Alert.alert('Error', 'No se pudo eliminar el historial');
            }
          },
        },
      ]
    );
  };

  const handleEnviar = async () => {
    if (!inputText.trim()) return;

    const texto = inputText;
    setInputText('');

    try {
      await enviarMensaje(texto);
      // Scroll automático al final
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      // Restaurar el texto si falla
      setInputText(texto);
    }
  };

  const renderMensaje = ({ item }: { item: any }) => {
    const esMio = item.remitenteId === usuarioActual?.id;
    const fecha = new Date(item.creadoEn);
    const hora = fecha.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View
        style={[
          styles.mensajeContainer,
          esMio ? styles.mensajeMio : styles.mensajeOtro,
        ]}
      >
        <View
          style={[
            styles.burbuja,
            esMio ? styles.burbujaMia : styles.burbujaOtra,
          ]}
        >
          <Text style={esMio ? styles.textoMio : styles.textoOtro}>
            {item.cuerpo}
          </Text>
          <Text style={esMio ? styles.horaMia : styles.horaOtra}>{hora}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Cargando mensajes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={mensajes}
          renderItem={renderMensaje}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyText}>No hay mensajes aún</Text>
              <Text style={styles.emptySubtext}>
                Envía un mensaje para iniciar la conversación
              </Text>
            </View>
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleEnviar}
            disabled={!inputText.trim() || !connected}
          >
            <Ionicons
              name="send"
              size={24}
              color={inputText.trim() && connected ? '#fff' : '#9ca3af'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: '#fefaf2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  deleteButton: {
    padding: 6,
    marginRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  mensajeContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  mensajeMio: {
    alignSelf: 'flex-end',
  },
  mensajeOtro: {
    alignSelf: 'flex-start',
  },
  burbuja: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  burbujaMia: {
    backgroundColor: '#22c55e',
    borderBottomRightRadius: 4,
  },
  burbujaOtra: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textoMio: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 4,
  },
  textoOtro: {
    color: '#1f2937',
    fontSize: 15,
    marginBottom: 4,
  },
  horaMia: {
    color: '#f0fdf4',
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  horaOtra: {
    color: '#9ca3af',
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
});

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConversacionAbierta } from '../screens/ChatScreen';

const API_URL = 'http://192.168.1.33:3001';

let socket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 2000;
const mensajesProcesados = new Set<number>();

// Callbacks para notificar actualizaciones
type ConversacionUpdateCallback = (conversacionId: number, mensaje: any) => void;
const conversacionUpdateCallbacks: ConversacionUpdateCallback[] = [];

export function addConversacionUpdateListener(callback: ConversacionUpdateCallback) {
  conversacionUpdateCallbacks.push(callback);
  return () => {
    const index = conversacionUpdateCallbacks.indexOf(callback);
    if (index > -1) {
      conversacionUpdateCallbacks.splice(index, 1);
    }
  };
}

function notifyConversacionUpdate(conversacionId: number, mensaje: any) {
  conversacionUpdateCallbacks.forEach(callback => callback(conversacionId, mensaje));
}

function getWebSocketURL() {
  const wsProtocol = API_URL.startsWith('https') ? 'wss' : 'ws';
  const cleanUrl = API_URL.replace(/^https?:\/\//, '');
  return `${wsProtocol}://${cleanUrl}/ws`;
}

export function connectGlobalWebSocket(usuarioId: number) {
  if (socket) {
    console.log('[GlobalWebSocket] Ya existe una conexión, cerrando anterior');
    socket.close();
    socket = null;
  }

  const connect = () => {
    try {
      const wsUrl = getWebSocketURL();
      console.log('[GlobalWebSocket] Conectando a:', wsUrl);
      socket = new WebSocket(wsUrl);
      reconnectAttempts = 0;

      socket.onopen = () => {
        console.log('[GlobalWebSocket] ✅ Conectado exitosamente');
      };

      socket.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log('[GlobalWebSocket] Mensaje recibido:', msg);

          if (msg.tipo === 'mensaje') {
            // Verificar duplicados
            if (mensajesProcesados.has(msg.id)) {
              console.log('[GlobalWebSocket] Mensaje ya procesado, ignorando');
              return;
            }
            mensajesProcesados.add(msg.id);

            // Notificar a los listeners (ConversationsScreen)
            notifyConversacionUpdate(msg.conversacionId, msg);

            // Incrementar contador si no es mío
            if (msg.remitenteId !== usuarioId) {
              console.log('[GlobalWebSocket] Mensaje de otro usuario');

              // Actualizar contador en AsyncStorage
              try {
                const saved = await AsyncStorage.getItem('mensajesNoLeidos');
                const contadores = saved ? JSON.parse(saved) : {};
                
                // Solo incrementar si la conversación NO está abierta
                const conversacionAbierta = getConversacionAbierta();
                if (conversacionAbierta !== msg.conversacionId) {
                  contadores[msg.conversacionId] = (contadores[msg.conversacionId] || 0) + 1;
                  await AsyncStorage.setItem('mensajesNoLeidos', JSON.stringify(contadores));
                  console.log('[GlobalWebSocket] Contador actualizado:', contadores);
                }
              } catch (err) {
                console.error('[GlobalWebSocket] Error actualizando contador:', err);
              }
            }
          }
        } catch (err) {
          console.error('[GlobalWebSocket] Error procesando mensaje:', err);
        }
      };

      socket.onerror = () => {
        // Error silencioso - se manejará en onclose
        console.log('[GlobalWebSocket] ⚠️ Error de conexión');
      };

      socket.onclose = (event) => {
        console.log('[GlobalWebSocket] Conexión cerrada');
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`[GlobalWebSocket] 🔄 Reintentando conexión (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          setTimeout(connect, RECONNECT_DELAY_MS);
        } else {
          console.log('[GlobalWebSocket] ❌ No se pudo conectar al servidor. Verifica que el backend esté corriendo.');
        }
      };
    } catch (err) {
      console.error('[GlobalWebSocket] Error creando WebSocket');
    }
  };

  connect();
}

export function disconnectGlobalWebSocket() {
  if (socket) {
    console.log('[GlobalWebSocket] Desconectando...');
    socket.close();
    socket = null;
    reconnectAttempts = 0;
    mensajesProcesados.clear();
  }
}

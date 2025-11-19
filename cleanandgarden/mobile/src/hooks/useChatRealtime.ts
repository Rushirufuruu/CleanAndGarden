import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// Ya no es necesario configurar aquí, se configura en App.tsx

// Función para obtener URL del WebSocket
function getWebSocketURL(): string {
  const wsUrl = API_URL.replace(/^https?:\/\//, (match: string) => {
    return match.startsWith('https') ? 'wss://' : 'ws://';
  });
  return `${wsUrl}/ws`;
}

export interface Mensaje {
  id: number;
  conversacionId: number;
  remitenteId: number;
  cuerpo: string;
  creadoEn: string;
}

export function useChatRealtime(conversacionId: number, usuarioActualId?: number) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // 1) Cargar historial inicial desde el backend
  useEffect(() => {
    async function fetchMensajes() {
      console.log('[useChatRealtime] Cargando historial de mensajes...');
      console.log('[useChatRealtime] conversacionId:', conversacionId);
      try {
        const url = `${API_URL}/conversaciones/${conversacionId}/mensajes`;
        console.log('[useChatRealtime] URL:', url);
        
        const res = await fetch(url, {
          credentials: 'include',
        });

        console.log('[useChatRealtime] Response status:', res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.log('[useChatRealtime] Error response:', errorText);
          throw new Error('Error al cargar mensajes');
        }

        const data = await res.json();
        console.log('[useChatRealtime] Mensajes recibidos:', data.length);

        // Convertimos snake_case → camelCase para todos los mensajes
        const mensajesFormateados: Mensaje[] = data.map((m: any) => ({
          id: m.id,
          conversacionId: m.conversacionId ?? m.conversacion_id,
          remitenteId: m.remitenteId ?? m.remitente_id,
          cuerpo: m.cuerpo,
          creadoEn: m.creadoEn ?? m.creado_en,
        }));

        console.log('[useChatRealtime] Primer mensaje:', mensajesFormateados[0]);
        setMensajes(mensajesFormateados);
      } catch (error) {
        console.error('[useChatRealtime] Error al cargar historial:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMensajes();
  }, [conversacionId]);

  // 2) Conectarse al WebSocket
  useEffect(() => {
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY_MS = 2000;

    const connectWebSocket = () => {
      try {
        const wsUrl = getWebSocketURL();
        console.log('Conectando a WebSocket:', wsUrl);
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;
        reconnectAttempts = 0;

        socket.onopen = () => {
          console.log('Conectado al WebSocket');
          setConnected(true);
          socket.send(
            JSON.stringify({
              tipo: 'join',
              conversacionId,
            })
          );
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            console.log('WebSocket recibido:', msg);

            if (msg.tipo === 'error') {
              console.error('WebSocket error:', msg.error);
            }

            if (msg.tipo === 'mensaje') {
              if (msg.conversacionId === conversacionId) {
                const nuevoMensaje: Mensaje = {
                  id: msg.id,
                  conversacionId: msg.conversacionId,
                  remitenteId: msg.remitenteId,
                  cuerpo: msg.cuerpo,
                  creadoEn: msg.creadoEn,
                };

                setMensajes((prev) => {
                  const existe = prev.some((m) => m.id === nuevoMensaje.id);
                  if (existe) return prev;
                  return [...prev, nuevoMensaje];
                });

                // NO mostrar notificaciones en el hook del chat
                // Las notificaciones se manejan solo en ConversationsScreen
                console.log('[useChatRealtime] Mensaje recibido en chat activo, sin notificación');
              }
            }
          } catch (err) {
            console.error('Error procesando mensaje WebSocket:', err);
          }
        };

        socket.onerror = (err) => {
          console.error('Error WebSocket:', err);
          setConnected(false);
        };

        socket.onclose = () => {
          console.log('WebSocket cerrado');
          setConnected(false);
          
          // Solo reconectar si la app está activa
          if (appStateRef.current === 'active' && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(`Reintentando (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, RECONNECT_DELAY_MS);
          }
        };
      } catch (err) {
        console.error('Error creando WebSocket:', err);
        setConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [conversacionId]);

  // 3) Manejar ciclo de vida de la app (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App volvió al foreground, reconectar si no está conectado
        console.log('App volvió al foreground');
        if (!connected && socketRef.current?.readyState !== WebSocket.OPEN) {
          socketRef.current?.close();
        }
      } else if (nextAppState === 'background') {
        // App fue al background
        console.log('App fue al background');
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [connected]);

  // 4) Función para enviar mensaje
  const enviarMensaje = async (cuerpo: string) => {
    if (!cuerpo.trim()) {
      console.log('[useChatRealtime] Mensaje vacío, ignorando');
      return;
    }

    console.log('[useChatRealtime] Enviando mensaje...');
    console.log('[useChatRealtime] conversacionId:', conversacionId);
    console.log('[useChatRealtime] cuerpo:', cuerpo);

    try {
      const url = `${API_URL}/mensajes`;
      console.log('[useChatRealtime] URL:', url);
      
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversacionId, cuerpo }),
      });

      console.log('[useChatRealtime] Response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.log('[useChatRealtime] Error response:', errorText);
        throw new Error('Error al enviar mensaje');
      }

      const nuevoMensaje = await res.json();
      console.log('[useChatRealtime] Mensaje enviado exitosamente:', nuevoMensaje);
      
      // El mensaje llegará vía WebSocket, pero lo agregamos localmente
      // por si hay delay
      const mensajeFormateado: Mensaje = {
        id: nuevoMensaje.id,
        conversacionId: nuevoMensaje.conversacionId ?? nuevoMensaje.conversacion_id,
        remitenteId: nuevoMensaje.remitenteId ?? nuevoMensaje.remitente_id,
        cuerpo: nuevoMensaje.cuerpo,
        creadoEn: nuevoMensaje.creadoEn ?? nuevoMensaje.creado_en,
      };

      setMensajes((prev) => {
        const existe = prev.some((m) => m.id === mensajeFormateado.id);
        if (existe) return prev;
        return [...prev, mensajeFormateado];
      });
    } catch (error) {
      console.error('[useChatRealtime] Error al enviar mensaje:', error);
      throw error;
    }
  };

  return {
    mensajes,
    loading,
    connected,
    enviarMensaje,
  };
}

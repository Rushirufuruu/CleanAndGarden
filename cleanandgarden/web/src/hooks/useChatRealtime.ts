"use client";

import { useEffect, useRef, useState } from "react";

export interface Mensaje {
  id: number;
  conversacionId: number;
  remitenteId: number;
  cuerpo: string;
  creadoEn: string;
}

export function useChatRealtime(conversacionId: number) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<WebSocket | null>(null);

  // 1) Cargar historial inicial desde el backend
  useEffect(() => {
    async function fetchMensajes() {
      try {
        const res = await fetch(
          `http://localhost:3001/conversaciones/${conversacionId}/mensajes`,
          {
            credentials: "include", // envía la cookie JWT
          }
        );

        if (!res.ok) throw new Error("Error al cargar mensajes");

        const data = await res.json();

        // Convertimos snake_case → camelCase para todos los mensajes
        const mensajesFormateados: Mensaje[] = data.map((m: any) => ({
          id: m.id,
          conversacionId: m.conversacionId ?? m.conversacion_id,
          remitenteId: m.remitenteId ?? m.remitente_id,
          cuerpo: m.cuerpo,
          creadoEn: m.creadoEn ?? m.creado_en,
        }));

        setMensajes(mensajesFormateados);
        console.log("Mensajes recibidos: ", mensajesFormateados);
      } catch (error) {
        console.error("Error al cargar historial:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMensajes();
  }, [conversacionId]);

  // 2) Conectarse al WebSocket para recibir mensajes en tiempo real
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3001/ws");
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("Conectado al WebSocket");
      socket.send(
        JSON.stringify({
          tipo: "join",
          conversacionId,
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log('WebSocket recibido:', msg);
        if (msg.tipo === 'error') {
          console.error('WebSocket error:', msg.error, 'Datos recibidos:', event.data);
        }

        if (msg.tipo === "mensaje") {
          // Solo agregar si el mensaje es de la conversación actual
          if (msg.conversacionId === conversacionId) {
            const mensajeFormateado: Mensaje = {
              id: msg.id,
              conversacionId: msg.conversacionId,
              remitenteId: msg.remitenteId,
              cuerpo: msg.cuerpo,
              creadoEn: msg.creadoEn,
            };
            setMensajes((prev) => {
              // Evitar duplicados por si el mensaje ya está
              if (prev.some(m => m.id === mensajeFormateado.id)) return prev;
              return [...prev, mensajeFormateado];
            });
          }
        }
      } catch (err) {
        console.error("Error al procesar mensaje WebSocket:", err);
      }
    };

    socket.onerror = (err) => console.error("Error WebSocket:", err);
    socket.onclose = () => console.log("Conexión WebSocket cerrada");

    return () => socket.close();
  }, [conversacionId]);

  // 3) Enviar mensaje (HTTP + WebSocket broadcast)
  async function sendMessage(cuerpo: string) {
    const text = cuerpo.trim();
    if (!text) return;

    try {
      const res = await fetch(`http://localhost:3001/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conversacionId,
          cuerpo: text,
        }),
      });

      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);

      const nuevoMensaje = await res.json();

      // Convertir snake_case → camelCase para que el renderizado funcione igual que con WebSocket
      const mensajeFormateado: Mensaje = {
        id: nuevoMensaje.id,
        conversacionId: nuevoMensaje.conversacionId ?? nuevoMensaje.conversacion_id,
        remitenteId: nuevoMensaje.remitenteId ?? nuevoMensaje.remitente_id,
        cuerpo: nuevoMensaje.cuerpo,
        creadoEn: nuevoMensaje.creadoEn ?? nuevoMensaje.creado_en,
      };

      // Ya no agregamos el mensaje localmente, solo esperamos el WebSocket
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
    }
  }

  return { mensajes, loading, sendMessage };
}

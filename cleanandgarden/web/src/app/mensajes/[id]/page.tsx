'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useChatRealtime } from '@hooks/useChatRealtime';

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  rol?: string;
}

export default function ConversacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const conversacionId = Number(resolvedParams.id);
  const router = useRouter();

  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [otroUsuario, setOtroUsuario] = useState<Usuario | null>(null);

  // Ref para hacer scroll automático al final
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hook que maneja historial + realtime + envío
  const { mensajes, sendMessage } = useChatRealtime(conversacionId);

  // Scroll automático al final cuando llegan nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // Cargar el usuario logueado
  useEffect(() => {
    fetchUsuarioActual();
  }, []);

  const fetchUsuarioActual = async () => {
    try {
      const res = await fetch('http://localhost:3001/profile', {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Error al cargar perfil');
      }

      const data = await res.json();
      setUsuarioActual({
        id: data.user.id,
        nombre: data.user.nombre,
        apellido: data.user.apellido,
      });

      // Obtener el otroUsuario de la conversación
      const resConversaciones = await fetch('http://localhost:3001/conversaciones', {
        credentials: 'include',
      });
      if (resConversaciones.ok) {
        const conversaciones = await resConversaciones.json();
        const conversacionActual = conversaciones.find((conv: any) => conv.id === conversacionId);
        if (conversacionActual) {
          setOtroUsuario(conversacionActual.otroUsuario);
        }
      }
    } catch (err) {
      console.error('Error al cargar usuario:', err);
    }
  };

  // Enviar mensaje con debounce para evitar doble envío
  let debounceTimeout: NodeJS.Timeout | null = null;
  const enviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || sending || !usuarioActual) return;
    if (debounceTimeout) return; // Si hay un envío pendiente, no enviar de nuevo

    setSending(true);
    setError('');
    debounceTimeout = setTimeout(async () => {
      try {
        await sendMessage(nuevoMensaje.trim());
        setNuevoMensaje('');
      } catch (err) {
        console.error('Error al enviar mensaje:', err);
        setError('No se pudo enviar el mensaje');
      } finally {
        setSending(false);
        debounceTimeout = null;
      }
    }, 400); // 400ms de protección contra doble envío
  };

  const formatHora = (fecha: string) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Función para agrupar mensajes por fecha y agregar separadores
  const groupMessagesByDate = (messages: any[]) => {
    const grouped: (any | { type: 'separator', date: string })[] = [];
    let lastDate: string | null = null;

    messages.forEach((msg) => {
      const msgDate = new Date(msg.creadoEn).toDateString();
      if (msgDate !== lastDate) {
        grouped.push({ type: 'separator', date: msgDate });
        lastDate = msgDate;
      }
      grouped.push(msg);
    });

    return grouped;
  };

  // Función para formatear el separador de fecha
  const formatDateSeparator = (date: string) => {
    const today = new Date();
    const msgDate = new Date(date);
    const diffTime = today.getTime() - msgDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    return msgDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const groupedMessages = groupMessagesByDate(mensajes);

  return (
    <div className="flex min-h-screen flex-col bg-[#fefaf2]">
      {/* Header */}
      <div className="sticky top-16 z-10 border-b bg-white p-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <Link
            href="/mensajes"
            className="text-[#2E5430] transition-colors hover:text-[#234624]"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2E5430] text-white">
              {otroUsuario
                  ? `${otroUsuario.nombre[0]}${otroUsuario.apellido[0]}`
                  : '??'}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                {otroUsuario && (
                  <>
                    {otroUsuario.nombre} {otroUsuario.apellido}
                    {otroUsuario.rol && (
                      <span className="italic text-gray-400 ml-1">({otroUsuario.rol})</span>
                    )}
                  </>
                )}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {mensajes.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500">
              No hay mensajes aún. ¡Inicia la conversación!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages.map((item, index) => {
              if (item.type === 'separator') {
                return (
                  <div key={`sep-${index}`} className="text-center my-4">
                    <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm">
                      {formatDateSeparator(item.date)}
                    </span>
                  </div>
                );
              }

              const mensaje = item;
              const esMio =
                usuarioActual && mensaje.remitenteId === usuarioActual.id;

              return (
                <div
                  key={mensaje.id}
                  className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] ${
                      esMio ? 'items-end' : 'items-start'
                    } flex flex-col gap-1`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        esMio
                          ? 'bg-[#2E5430] text-white'
                          : 'bg-white text-gray-900 shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {mensaje.cuerpo}
                      </p>
                      <span
                        className={`mt-1 block text-right text-xs ${
                          esMio ? 'text-green-200' : 'text-gray-500'
                        }`}
                      >
                        {mensaje.creadoEn ? formatHora(mensaje.creadoEn) : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Elemento invisible para hacer scroll al final */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensaje */}
      <div className="border-t bg-white p-4 shadow-lg">
        <form
          onSubmit={enviarMensaje}
          className="mx-auto flex max-w-4xl items-center gap-2"
        >
          <input
            type="text"
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
            placeholder="Escribe un mensaje..."
            disabled={sending}
            className="flex-1 rounded-full border border-gray-300 px-4 py-3 focus:border-[#2E5430] focus:outline-none focus:ring-2 focus:ring-[#2E5430]/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!nuevoMensaje.trim() || sending}
            className="flex items-center justify-center rounded-full bg-[#2E5430] p-3 text-white transition-colors hover:bg-[#234624] disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

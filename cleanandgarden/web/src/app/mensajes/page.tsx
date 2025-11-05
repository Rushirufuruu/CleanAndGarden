'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Search, Plus } from 'lucide-react'
import Link from 'next/link'

interface Usuario {
  id: number
  nombre: string
  apellido: string
  email: string
  rol?: string
}

interface Conversacion {
  id: number
  tipo: string
  ultimoMensaje: {
    cuerpo: string
    fecha: string
    esMio: boolean
  } | null
  otroUsuario: Usuario | null
  fechaCreacion: string
}

export default function MensajesPage() {
  const router = useRouter()
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null)

    // Estado para usuarios disponibles y modal
    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [showModal, setShowModal] = useState(false)
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const socketRef = useRef<WebSocket | null>(null)
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState<Record<number, number>>({})

  // Cargar contadores desde localStorage al inicializar
  useEffect(() => {
    const saved = localStorage.getItem('mensajesNoLeidos')
    if (saved) {
      try {
        setMensajesNoLeidos(JSON.parse(saved))
      } catch (err) {
        console.error('Error cargando contadores de localStorage:', err)
      }
    }
  }, [])

  // Guardar contadores en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('mensajesNoLeidos', JSON.stringify(mensajesNoLeidos))
  }, [mensajesNoLeidos])  // Verificar sesión apenas carga
  useEffect(() => {
    const verificarSesion = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
          credentials: 'include',
        })
        if (!res.ok) {
          // Limpiar contadores si no hay sesión válida
          localStorage.removeItem('mensajesNoLeidos')
          setMensajesNoLeidos({})
          router.push('/login')
          return
        }
        const data = await res.json()
        setUsuarioActual(data.user)
        fetchConversaciones()
      } catch (err) {
        console.error('Error al verificar sesión:', err)
        // Limpiar contadores en caso de error
        localStorage.removeItem('mensajesNoLeidos')
        setMensajesNoLeidos({})
        router.push('/login')
      }
    }

    verificarSesion()
  }, [router])

  // WebSocket para actualizar conversaciones en tiempo real
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3001/ws')
    socketRef.current = socket

    socket.onopen = () => {
      console.log('Conectado al WebSocket en conversaciones')
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.tipo === 'mensaje') {
          // Actualizar la conversación correspondiente
          setConversaciones((prev) =>
            prev.map((conv) => {
              if (conv.id === msg.conversacionId) {
                return {
                  ...conv,
                  ultimoMensaje: {
                    cuerpo: msg.cuerpo,
                    fecha: msg.creadoEn,
                    esMio: msg.remitenteId === usuarioActual?.id,
                  },
                }
              }
              return conv
            })
          )

          // Si el mensaje no es mío, incrementar contador de no leídos
          if (msg.remitenteId !== usuarioActual?.id) {
            setMensajesNoLeidos((prev) => ({
              ...prev,
              [msg.conversacionId]: (prev[msg.conversacionId] || 0) + 1,
            }))
          }
        }
      } catch (err) {
        console.error('Error procesando mensaje WebSocket:', err)
      }
    }

    socket.onerror = (err) => console.log('Error WebSocket:', err)
    socket.onclose = () => console.log('WebSocket cerrado en conversaciones')

    return () => {
      socket.close()
    }
  }, [usuarioActual?.id])

    // Traer usuarios disponibles para nueva conversación
    const fetchUsuarios = async () => {
      if (!usuarioActual) return;
      setLoadingUsuarios(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios/buscar?excludeId=${usuarioActual.id}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Error al cargar usuarios');
        const data = await res.json();
        setUsuarios(data);
      } catch (err) {
        console.error('Error al cargar usuarios:', err);
      } finally {
        setLoadingUsuarios(false);
      }
    };

  // Traer conversaciones
  const fetchConversaciones = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversaciones`, {
        credentials: 'include',
      })

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Error al cargar conversaciones')
      }

      const data = await res.json()
      setConversaciones(data)

      // Limpiar contadores de conversaciones que ya no existen
      setMensajesNoLeidos((prev) => {
        const nuevasConversacionesIds = data.map((conv: Conversacion) => conv.id)
        const nuevosContadores: Record<number, number> = {}
        nuevasConversacionesIds.forEach((id: number) => {
          nuevosContadores[id] = prev[id] || 0
        })
        return nuevosContadores
      })
    } catch (err) {
      console.error('Error:', err)
      setError('No se pudieron cargar las conversaciones')
    } finally {
      setLoading(false)
    }
  }

  // Resetear contador de mensajes no leídos para una conversación
  const resetMensajesNoLeidos = (conversacionId: number) => {
    setMensajesNoLeidos((prev) => ({
      ...prev,
      [conversacionId]: 0,
    }))
  }

  // Función para manejar click en conversación
  const handleConversacionClick = (conversacionId: number) => {
    resetMensajesNoLeidos(conversacionId)
  }

  // Crear nueva conversación (redirige automáticamente)
  // Abre el modal y carga usuarios
  const handleAbrirModal = () => {
    setShowModal(true);
    fetchUsuarios();
  };

  // Crea la conversación con el usuario seleccionado
  const handleCrearConversacion = async (otroUsuarioId: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversaciones`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otroUsuarioId }),
      });
      if (!res.ok) throw new Error('Error al crear conversación');
      const nueva = await res.json();
      setShowModal(false);
      router.push(`/mensajes/${nueva.id}`);
    } catch (err) {
      alert('No se pudo crear la conversación');
      console.error('Error al crear conversación:', err);
    }
  };

  // Formatear fecha
  const formatFecha = (fecha: string) => {
    const ahora = new Date()
    const fechaMensaje = new Date(fecha)
    const diffMs = ahora.getTime() - fechaMensaje.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) {
      return 'Hace un momento'
    } else if (diffMinutes < 60) {
      return `Hace ${diffMinutes} minuto${diffMinutes === 1 ? '' : 's'}`
    } else if (diffHours < 24) {
      return `Hace ${diffHours} hora${diffHours === 1 ? '' : 's'}`
    } else if (diffHours < 48) {
      return 'Ayer'
    } else {
      return `Hace ${diffDays} día${diffDays === 1 ? '' : 's'}`
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fefaf2]">
        <p className="text-gray-600">Cargando conversaciones...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fefaf2] py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-[#2E5430]" />
            <h1 className="text-2xl font-bold text-[#2E5430]">Mensajes</h1>
          </div>
          <button
            onClick={handleAbrirModal}
            className="flex items-center gap-2 rounded-md bg-[#2E5430] px-4 py-2 text-white transition-colors hover:bg-[#234624]"
          >
            <Plus className="h-5 w-5" />
            <span>Nueva conversación</span>
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar conversaciones..."
            className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:border-[#2E5430] focus:outline-none focus:ring-2 focus:ring-[#2E5430]/20"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Lista de conversaciones */}
        {conversaciones.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <MessageCircle className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <h3 className="mb-2 text-lg font-semibold text-gray-700">
              No tienes conversaciones
            </h3>
            <p className="mb-4 text-gray-500">
              Inicia una conversación con un jardinero o administrador
            </p>
            <button
              onClick={handleAbrirModal}
              className="inline-flex items-center gap-2 rounded-md bg-[#2E5430] px-6 py-3 text-white transition-colors hover:bg-[#234624]"
            >
              <Plus className="h-5 w-5" />
              <span>Nueva conversación</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {conversaciones
              .sort((a, b) => {
                // Ordenar por fecha del último mensaje, o fecha de creación si no hay mensajes
                const fechaA = a.ultimoMensaje
                  ? new Date(a.ultimoMensaje.fecha).getTime()
                  : new Date(a.fechaCreacion).getTime()
                const fechaB = b.ultimoMensaje
                  ? new Date(b.ultimoMensaje.fecha).getTime()
                  : new Date(b.fechaCreacion).getTime()
                return fechaB - fechaA // Descendente: más reciente primero
              })
              .filter((conv) =>
                conv.otroUsuario &&
                `${conv.otroUsuario.nombre} ${conv.otroUsuario.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((conv) => (
              <Link
                key={conv.id}
                href={`/mensajes/${conv.id}`}
                onClick={() => handleConversacionClick(conv.id)}
                className="block rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {/* Avatar */}
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2E5430] text-white">
                        {conv.otroUsuario
                          ? `${conv.otroUsuario.nombre[0]}${conv.otroUsuario.apellido[0]}`
                          : '??'}
                        {/* Indicador de mensajes no leídos */}
                        {mensajesNoLeidos[conv.id] > 0 && (
                          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                            {mensajesNoLeidos[conv.id] > 99 ? '99+' : mensajesNoLeidos[conv.id]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {conv.otroUsuario
                            ? <>
                                {conv.otroUsuario.nombre} {conv.otroUsuario.apellido}
                                {conv.otroUsuario.rol && (
                                  <span className="italic text-gray-400 ml-2"> ({conv.otroUsuario.rol})</span>
                                )}
                              </>
                            : 'Usuario desconocido'}
                        </h3>
                        {conv.ultimoMensaje ? (
                          <p className="text-sm text-gray-600">
                            {conv.ultimoMensaje.esMio && 'Tú: '}
                            {conv.ultimoMensaje.cuerpo.length > 50
                              ? `${conv.ultimoMensaje.cuerpo.substring(0, 50)}...`
                              : conv.ultimoMensaje.cuerpo}
                          </p>
                        ) : (
                          <p className="text-sm italic text-gray-400">
                            Sin mensajes aún
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    {conv.ultimoMensaje && (
                      <span className="text-xs text-gray-500">
                        {formatFecha(conv.ultimoMensaje.fecha)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Modal de selección de usuario */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-bold text-[#2E5430]">Selecciona usuario</h2>
              {loadingUsuarios ? (
                <p className="text-gray-500">Cargando usuarios...</p>
              ) : usuarios.length === 0 ? (
                <p className="text-gray-500">No hay usuarios disponibles</p>
              ) : (
                <ul className="mb-4 max-h-64 overflow-y-auto divide-y">
                  {usuarios.map((u) => (
                    <li key={u.id} className="py-2 flex items-center justify-between">
                      <span>
                        {u.nombre} {u.apellido}
                        {u.rol && (
                          <span className="italic text-gray-400 ml-1">({u.rol})</span>
                        )}
                      </span>
                      <button
                        onClick={() => handleCrearConversacion(u.id)}
                        className="rounded bg-[#2E5430] px-3 py-1 text-white hover:bg-[#234624]"
                      >
                        Seleccionar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="mt-2 w-full rounded bg-gray-200 py-2 text-gray-700 hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

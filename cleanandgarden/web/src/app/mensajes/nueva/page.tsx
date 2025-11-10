'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowLeft, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface Usuario {
  id: number
  nombre: string
  apellido: string
  email: string
  roles: {
    codigo: string
    nombre: string
  }[]
}

export default function NuevaConversacionPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (busqueda.trim()) {
      const timer = setTimeout(() => {
        buscarUsuarios()
      }, 500)
      return () => clearTimeout(timer)
    } else {
      buscarUsuarios()
    }
  }, [busqueda])

  const buscarUsuarios = async () => {
    setLoading(true)
    setError('')
    try {
      const query = busqueda ? `?query=${encodeURIComponent(busqueda)}` : ''
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios/buscar${query}`, {
        credentials: 'include'
      })

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Error al buscar usuarios')
      }

      const data = await res.json()
      setUsuarios(data)
    } catch (err) {
      console.error('Error:', err)
      setError('No se pudieron cargar los usuarios')
    } finally {
      setLoading(false)
    }
  }

  const crearConversacion = async (usuarioId: number) => {
    setCreating(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ otroUsuarioId: usuarioId })
      })

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Error al crear conversación')
      }

      const data = await res.json()
      router.push(`/mensajes/${data.id}`)
    } catch (err) {
      console.error('Error:', err)
      setError('No se pudo crear la conversación')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fefaf2] py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/mensajes"
            className="flex items-center gap-2 text-[#2E5430] transition-colors hover:text-[#234624]"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-[#2E5430]" />
            <h1 className="text-2xl font-bold text-[#2E5430]">Nueva conversación</h1>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar usuarios por nombre o email..."
            className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:border-[#2E5430] focus:outline-none focus:ring-2 focus:ring-[#2E5430]/20"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Lista de usuarios */}
        {loading ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <p className="text-gray-600">Buscando usuarios...</p>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <p className="text-gray-600">
              {busqueda ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {usuarios.map((usuario) => (
              <button
                key={usuario.id}
                onClick={() => crearConversacion(usuario.id)}
                disabled={creating}
                className="flex w-full items-center gap-4 rounded-lg bg-white p-4 text-left shadow-sm transition-all hover:shadow-md disabled:opacity-50"
              >
                {/* Avatar */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2E5430] text-white">
                  {usuario.nombre[0]}{usuario.apellido[0]}
                </div>

                {/* Info del usuario */}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {usuario.nombre} {usuario.apellido}
                  </h3>
                  <p className="text-sm text-gray-600">{usuario.email}</p>
                  {usuario.roles.length > 0 && (
                    <div className="mt-1 flex gap-2">
                      {usuario.roles.map((rol) => (
                        <span
                          key={rol.codigo}
                          className="rounded-full bg-[#2E5430]/10 px-2 py-1 text-xs text-[#2E5430]"
                        >
                          {rol.nombre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Icono de mensaje */}
                <MessageCircle className="h-6 w-6 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}



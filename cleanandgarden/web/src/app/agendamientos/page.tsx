"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const API = process.env.NEXT_PUBLIC_API_URL ?? ""

export default function AgendamientosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [citas, setCitas] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API}/citas/mis`, { credentials: 'include' })
        if (res.status === 401) {
          if (!mounted) return
          setCitas([])
          setError('Debes iniciar sesión para ver tus agendamientos.')
          return
        }
        if (!res.ok) throw new Error('Error cargando agendamientos')
        const body = await res.json()
        const items = Array.isArray(body) ? body : body?.data ?? []
        if (!mounted) return
        setCitas(items)
      } catch (err: any) {
        console.error('load agendamientos error', err)
        if (!mounted) return
        setError(err?.message ?? 'Error cargando agendamientos')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const weekdayName = (d: Date) => {
    const names = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
    return names[d.getDay()]
  }

  const formatDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const time = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    return `${weekdayName(d)} ${day}-${month}-${year} • ${time}`
  }

  const parseDateFromCita = (c: any) => {
    // prefer fecha_hora, luego hora_inicio, luego fecha
    const raw = c.fecha_hora ?? c.hora_inicio ?? c.fecha
    if (!raw) return null
    return new Date(raw)
  }

  return (
    <div className="min-h-screen bg-[#fefaf2] py-8 px-4">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-4 text-2xl font-bold text-[#2E5430]">Mis agendamientos</h1>

        {loading ? (
          <div>Cargando agendamientos...</div>
        ) : error ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-700">{error}</div>
            {error.includes('iniciar sesión') ? (
              <div className="flex gap-3">
                <button onClick={() => router.push('/login')} className="rounded bg-[#2E5430] px-4 py-2 text-white">Iniciar sesión</button>
                <button onClick={() => router.push('/register')} className="rounded border px-4 py-2">Crear cuenta</button>
              </div>
            ) : null}
          </div>
        ) : citas.length === 0 ? (
          <div className="text-center py-8">
            <p className="mb-4 text-gray-600">No tienes agendamientos próximos.</p>
            <button onClick={() => router.push('/book-appointment')} className="rounded bg-[#2E5430] px-4 py-2 text-white">Agendar una cita</button>
          </div>
        ) : (
          <div className="space-y-4">
            {citas.map((c: any) => {
              const id = Number(c.id)
              const date = parseDateFromCita(c)
              const label = date ? formatDate(date) : 'Fecha no disponible'
              const expanded = expandedId === id
              return (
                <div key={id} className="border rounded p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{c.servicio?.nombre ?? 'Servicio'}</div>
                      <div className="text-sm text-gray-600">{label}</div>
                      <div className="text-sm text-gray-600">Jardín: {c.jardin?.nombre ?? '—'}</div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-sm mb-2">{c.estado ?? '—'}</div>
                      <button onClick={() => setExpandedId(expanded ? null : id)} className="text-sm px-3 py-1 rounded bg-gray-100">{expanded ? 'Ocultar' : 'Ver detalle'}</button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="mt-3 text-sm text-gray-700 space-y-1">
                      <div><strong>Cliente:</strong> {c.usuario?.nombre ?? c.usuario_nombre ?? '—'}</div>
                      <div><strong>Servicio:</strong> {c.servicio?.nombre ?? '—'}</div>
                      <div><strong>Jardín:</strong> {c.jardin?.nombre ?? '—'}</div>
                      <div><strong>Dirección:</strong> {c.jardin?.direccion ? `${c.jardin.direccion.calle}, ${c.jardin.direccion.comuna?.nombre ?? ''}` : '—'}</div>
                      <div><strong>Estado:</strong> {c.estado ?? '—'}</div>
                      {c.notas_cliente && <div><strong>Notas:</strong> {c.notas_cliente}</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}

"use client"

import React, { useEffect, useState } from "react"
import Swal from 'sweetalert2'
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

  const canCancel = (c: any) => {
    // admin bypass handled server-side; here compute client-side eligibility
    const fecha = parseDateFromCita(c)
    if (!fecha) return false
    const deadline = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - 1, 12, 0, 0, 0)
    const now = new Date()
    return now <= deadline
  }

  const handleCancel = async (citaId: number) => {
    const ok = await Swal.fire({
      title: '¿Confirmar cancelación?',
      text: 'Puedes cancelar hasta las 12:00 del día anterior. ¿Deseas continuar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Mantener',
    })
    if (!ok.isConfirmed) return

    try {
      // pedir motivo opcional
      const reasonRes = await Swal.fire({
        title: 'Motivo de cancelación (opcional)',
        input: 'textarea',
        inputPlaceholder: 'Escribe el motivo o deja vacío',
        showCancelButton: true,
        confirmButtonText: 'Enviar y cancelar',
        cancelButtonText: 'Cancelar',
        inputAttributes: { 'aria-label': 'Motivo de cancelación' }
      })
      if (reasonRes.isDismissed) return

      const payload: any = {}
      if (reasonRes.value) payload.motivo_cancelacion = reasonRes.value
      // enviar la solicitud con motivo (si existe)
      const res = await fetch(`${API}/cita/${citaId}/cancelar`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        await Swal.fire('Error', body?.error ?? 'No se pudo cancelar la cita', 'error')
        return
      }
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cita cancelada', showConfirmButton: false, timer: 1500 })
      // quitar cita del listado
      setCitas(prev => prev.filter(x => Number(x.id) !== Number(citaId)))
    } catch (err) {
      console.error('cancel error', err)
      await Swal.fire('Error', 'Error de conexión al cancelar', 'error')
    }
  }

  const getClientName = (c: any) => {
    // varios posibles paths que llegó en distintas versiones
    const u = c.usuario ?? c.cliente ?? c.usuario_cita_cliente_idTousuario ?? null
    if (u) {
      const full = [u.nombre, u.apellido].filter(Boolean).join(' ')
      if (full) return full
      if (u.nombre) return u.nombre
    }
    // campos planos
    if (c.usuario_nombre) return c.usuario_nombre
    if (c.cliente_nombre) return c.cliente_nombre
    if (c.nombre_cliente) return c.nombre_cliente
    return '—'
  }

  const getDireccionText = (c: any) => {
    // prefer explicit direccion object
    const d = c.direccion ?? c.jardin?.direccion ?? null
    if (d) {
      const parts: string[] = []
      if (d.calle) parts.push(d.calle)
      if (d.numero) parts.push(String(d.numero))
      if (d.comuna?.nombre) parts.push(d.comuna.nombre)
      if (d.comuna?.region?.nombre) parts.push(d.comuna.region.nombre)
      const txt = parts.join(', ')
      if (txt) return txt
    }
    // some APIs return a single direccion string
    if (c.direccion_text) return c.direccion_text
    if (c.direccion_calle) return c.direccion_calle
    return '—'
  }

  const getTecnicoName = (c: any) => {
    // soportar varias formas en las que el servidor puede devolver el técnico
    const t = c.tecnico ?? c.jardinero ?? c.usuario_tecnico ?? c.usuario_asignado ?? c.usuario_cita_tecnico_idTousuario ?? null
    if (t) {
      const full = [t.nombre, t.apellido].filter(Boolean).join(' ')
      if (full) return full
      if (t.nombre) return t.nombre
    }
    if (c.tecnico_nombre) return c.tecnico_nombre
    if (c.jardinero_nombre) return c.jardinero_nombre
    return '—'
  }

  // Componente interno: intenta cargar la dirección del jardín por fallback
  // Removido, ahora la dirección viene incluida en la cita

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
              const cardClass = `rounded p-4 border ${c.estado === 'cancelada' ? 'border-red-500' : (c.estado === 'pendiente' || c.estado === 'confirmada') ? 'border-green-500' : 'border-gray-300'} bg-[#fefaf2]`
              return (
                <div key={id} className={cardClass}>
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
                      {/* La dirección ahora viene incluida en la cita */}
                      <div><strong>Cliente:</strong> {getClientName(c)}</div>
                      <div><strong>Servicio:</strong> {c.servicio?.nombre ?? '—'}</div>
                      <div><strong>Jardín:</strong> {c.jardin?.nombre ?? '—'}</div>
                      <div><strong>Dirección:</strong> {getDireccionText(c)}</div>
                      <div><strong>Jardinero:</strong> {getTecnicoName(c)}</div>
                      <div><strong>Estado:</strong> {c.estado ?? '—'}</div>
                      {c.notas_cliente && <div><strong>Notas:</strong> {c.notas_cliente}</div>}
                      { (c.estado === 'pendiente' || c.estado === 'confirmada') && canCancel(c) && (
                        <div className="mt-2">
                          <button onClick={() => handleCancel(id)} className="rounded bg-red-600 px-3 py-1 text-white">Cancelar cita</button>
                        </div>
                      )}

                      { c.estado === 'cancelada' && (
                        <div className="mt-2 flex gap-2">
                          <span className="px-2 py-1 rounded bg-gray-100 text-sm">Cancelada</span>
                          <button onClick={() => router.push('/book-appointment')} className="rounded bg-[#2E5430] px-3 py-1 text-white">Agendar otra hora</button>
                        </div>
                      )}
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

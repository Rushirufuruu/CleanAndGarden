"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

export default function PagoTestPage() {
  const [loading, setLoading] = useState(true)
  const [citas, setCitas] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/citas/mis`, { credentials: 'include' })
        if (res.status === 401) {
          if (!mounted) return
          setError('No autenticado. Por favor inicia sesión.')
          setCitas([])
          return
        }
        if (!res.ok) throw new Error('Error cargando citas')
        const body = await res.json()
        const items = Array.isArray(body) ? body : body?.data ?? []
        if (!mounted) return
        setCitas(items)
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message ?? 'Error')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const startPago = async (citaId: number) => {
    try {
      const res = await fetch(`${API}/pago/init`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cita_id: citaId }) })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        alert('Error iniciando pago: ' + (b?.error ?? res.statusText))
        return
      }
      const body = await res.json()
      // body should include url and token (or raw)
      const url = body.url ?? body.raw?.url ?? null
      const token = body.token ?? body.raw?.token_ws ?? body.raw?.token ?? null
      if (!url || !token) {
        alert('Respuesta incompleta del servidor. Mira consola.')
        console.debug('pago/init response', body)
        return
      }

      // crear form y submit automático (POST token_ws)
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = url
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'token_ws'
      input.value = token
      form.appendChild(input)
      document.body.appendChild(form)
      form.submit()
    } catch (err) {
      console.error('startPago error', err)
      alert('Error de conexión al iniciar pago')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-3xl rounded bg-white p-6 shadow">
        <h1 className="text-xl font-bold mb-4">Prueba de pago (Webpay integración)</h1>
        <p className="text-sm text-gray-600 mb-4">Esta página inicia el flujo real de Webpay (integración). Usa las tarjetas de prueba en ambiente de integración.</p>

        {loading ? (
          <div>Cargando...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : citas.length === 0 ? (
          <div>No tienes citas.</div>
        ) : (
          <div className="space-y-4">
            {citas.map((c: any) => (
              <div key={c.id} className="p-4 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{c.servicio?.nombre ?? 'Servicio'}</div>
                  <div className="text-sm text-gray-600">Id: {c.id} • Precio: {c.precio_aplicado ?? c.servicio?.precio_clp ?? '0'}</div>
                </div>
                <div>
                  <button onClick={() => startPago(Number(c.id))} className="rounded bg-[#2E5430] px-3 py-1 text-white">Pagar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

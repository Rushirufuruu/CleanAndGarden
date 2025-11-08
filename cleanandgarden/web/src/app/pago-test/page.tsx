"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const API = process.env.NEXT_PUBLIC_API_URL ?? ""

export default function PagoTestPage() {
  const [loading, setLoading] = useState(true)
  const [citas, setCitas] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Cargar citas del cliente autenticado
  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/citas/mis`, { credentials: "include" })
        if (res.status === 401) {
          if (!mounted) return
          setError("No autenticado. Por favor inicia sesión.")
          setCitas([])
          return
        }
        if (!res.ok) throw new Error("Error cargando citas")
        const body = await res.json()
        const items = Array.isArray(body) ? body : body?.data ?? []
        if (!mounted) return
        setCitas(items)
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message ?? "Error")
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  // Inicia el flujo Webpay (sandbox)
  const startPagoWebpay = async (cita: any) => {
    try {
      const monto = Number(cita.precio_aplicado || 0)
      if (!monto || monto <= 0) {
        alert("Precio inválido.")
        return
      }

      const res = await fetch(`${API}/payments/webpay/create`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyOrder: `cita-${cita.id}`,
          sessionId: `usuario-${cita.usuario_id}`,
          amount: monto,
          returnUrl: "http://localhost:3000/pago-test" // mismo front como retorno
        })
      })

      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        alert("Error iniciando pago: " + (b?.error ?? res.statusText))
        return
      }

      const body = await res.json()
      const url = body.url ?? body.raw?.url
      const token = body.token ?? body.raw?.token_ws ?? body.raw?.token
      if (!url || !token) {
        alert("Respuesta incompleta del servidor. Mira consola.")
        console.debug("Respuesta Webpay:", body)
        return
      }

      // Crear formulario y enviarlo automáticamente (POST token_ws)
      const form = document.createElement("form")
      form.method = "POST"
      form.action = url
      const input = document.createElement("input")
      input.type = "hidden"
      input.name = "token_ws"
      input.value = token
      form.appendChild(input)
      document.body.appendChild(form)
      form.submit()
    } catch (err) {
      console.error("Error en startPagoWebpay:", err)
      alert("Error de conexión al iniciar pago.")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-3xl rounded bg-white p-6 shadow">
        <h1 className="text-xl font-bold mb-4">Prueba de pago con Webpay (sandbox)</h1>
        <p className="text-sm text-gray-600 mb-4">
          Esta página inicia el flujo real de Webpay en modo integración. Usa las tarjetas de prueba
          publicadas por Transbank.
        </p>

        {loading ? (
          <div>Cargando...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : citas.length === 0 ? (
          <div>No tienes citas pendientes.</div>
        ) : (
          <div className="space-y-4">
            {citas.map((cita: any) => (
              <div key={cita.id} className="p-4 border rounded">
                <div>
                  <div className="font-medium">{cita.servicio?.nombre ?? "Servicio"}</div>
                  <div className="text-sm text-gray-600">
                    ID: {cita.id} • Precio: ${cita.precio_aplicado ?? 0}
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => startPagoWebpay(cita)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Pagar con Webpay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

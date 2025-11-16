"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const API = process.env.NEXT_PUBLIC_API_URL ?? ""

export default function PagoTestPage() {
  const [loading, setLoading] = useState(true)
  const [citas, setCitas] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [paymentResult, setPaymentResult] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

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

  // Procesar retorno de Webpay si hay token_ws en URL
  useEffect(() => {
    const tokenWs = searchParams.get('token_ws')
    if (tokenWs && !paymentResult) {
      const processPayment = async () => {
        try {
          const res = await fetch(`${API}/payments/webpay/commit`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token_ws: tokenWs })
          })

          if (!res.ok) {
            const b = await res.json().catch(() => ({}))
            setPaymentResult({ error: b?.error ?? res.statusText })
            return
          }

          const result = await res.json()
          setPaymentResult(result)

          // Limpiar la URL
          router.replace('/pago-test', { scroll: false })

          // Recargar citas después de un breve delay
          setTimeout(() => {
            window.location.reload()
          }, 2000)

        } catch (err: any) {
          console.error("Error procesando pago:", err)
          setPaymentResult({ error: err?.message ?? "Error de conexión" })
        }
      }
      processPayment()
    }
  }, [searchParams, paymentResult, router])

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
          returnUrl: typeof window !== 'undefined' ? `${window.location.origin}/pago-exitoso` : "http://localhost:3000/pago-exitoso"
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
        <h1 className="text-xl font-bold mb-4">Mis Citas y Pagos - Webpay</h1>
        <p className="text-sm text-gray-600 mb-4">
          Revisa el estado de tus citas y pagos. Las citas pagadas aparecen en verde con detalles del pago.
          Usa tarjetas de prueba de Transbank para probar pagos.
        </p>

        {loading ? (
          <div>Cargando...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : citas.length === 0 ? (
          <div>No tienes citas pendientes.</div>
        ) : (
          <div className="space-y-4">
            {citas.map((cita: any) => {
              const pagos = cita.pago || []
              const pagoAprobado = pagos.find((p: any) => p.estado === 'aprobado')
              const tienePagoPendiente = pagos.some((p: any) => p.estado === 'pendiente')
              const estaPagada = !!pagoAprobado

              return (
                <div key={cita.id} className={`p-4 border rounded ${estaPagada ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{cita.servicio?.nombre ?? "Servicio"}</div>
                      <div className="text-sm text-gray-600">
                        ID: {cita.id} • Precio: ${cita.precio_aplicado ?? 0}
                      </div>
                      <div className="text-sm">
                        Estado cita: <span className={`font-medium ${cita.estado === 'confirmada' ? 'text-green-600' : 'text-orange-600'}`}>
                          {cita.estado}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {estaPagada ? (
                        <div className="text-green-600 font-medium">✓ PAGADO</div>
                      ) : tienePagoPendiente ? (
                        <div className="text-orange-600 font-medium">⏳ Pago pendiente</div>
                      ) : (
                        <div className="text-red-600 font-medium">❌ Sin pagar</div>
                      )}
                    </div>
                  </div>

                  {pagoAprobado && (
                    <div className="mt-3 p-3 bg-green-100 rounded text-sm">
                      <div className="font-medium text-green-800 mb-1">Detalles del pago:</div>
                      <div className="text-green-700">
                        <div>Método: {pagoAprobado.metodo}</div>
                        <div>Monto: ${pagoAprobado.monto_clp}</div>
                        <div>Fecha: {new Date(pagoAprobado.creado_en).toLocaleString()}</div>
                        <div>Transacción: {pagoAprobado.flow_order_id}</div>
                        <div>Estado: {pagoAprobado.flow_status}</div>
                      </div>
                    </div>
                  )}

                  <div className="mt-3">
                    {estaPagada ? (
                      <button
                        disabled
                        className="bg-gray-400 text-white px-4 py-2 rounded cursor-not-allowed"
                      >
                        Ya pagado
                      </button>
                    ) : (
                      <button
                        onClick={() => startPagoWebpay(cita)}
                        disabled={tienePagoPendiente}
                        className={`px-4 py-2 rounded ${
                          tienePagoPendiente 
                            ? 'bg-orange-400 hover:bg-orange-500 text-white cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {tienePagoPendiente ? 'Pago en proceso...' : 'Pagar con Webpay'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

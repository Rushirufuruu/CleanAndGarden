"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL ?? ""

export default function PagoExitosoPage() {
  const [loading, setLoading] = useState(true)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const [citaDetails, setCitaDetails] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenWs = searchParams.get('token_ws')
    
    if (tokenWs) {
      const processPayment = async () => {
        try {
          const res = await fetch(`${API}/payments/webpay/commit`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token_ws: tokenWs })
          })

          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setError(data?.error ?? "Error al procesar el pago")
            setLoading(false)
            return
          }

          const result = await res.json()
          setPaymentDetails(result)
          
          // Obtener detalles de la cita si existe buy_order
          if (result.buy_order) {
            try {
              const citaRes = await fetch(`${API}/citas/by-order/${result.buy_order}`, {
                credentials: "include",
                headers: { "Content-Type": "application/json" }
              })
              
              if (citaRes.ok) {
                const citaData = await citaRes.json()
                setCitaDetails(citaData)
              }
            } catch (citaErr) {
              console.error("Error obteniendo detalles de la cita:", citaErr)
            }
          }
          
          setLoading(false)

          // Limpiar la URL después de procesar
          window.history.replaceState({}, document.title, '/pago-exitoso')
        } catch (err: any) {
          console.error("Error procesando pago:", err)
          setError(err?.message ?? "Error de conexión")
          setLoading(false)
        }
      }

      processPayment()
    } else {
      setLoading(false)
    }
  }, [searchParams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Procesando pago...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Error en el Pago</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Link href="/pago-test" className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition">
              Intentar de Nuevo
            </Link>
            <Link href="/" className="block w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-3 rounded-lg transition">
              Ir al Inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4 py-8">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
        {/* Icono de éxito */}
        <div className="mb-6 flex justify-center">
          <CheckCircle className="w-20 h-20 text-green-600" strokeWidth={1.5} />
        </div>

        {/* Titulo */}
        <h1 className="text-3xl font-bold text-gray-800 mb-2">¡Pago Exitoso!</h1>
        <p className="text-gray-600 mb-6">
          Tu pago ha sido procesado correctamente
        </p>

        {/* Detalles del pago */}
        {paymentDetails && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left space-y-3">
            <div className="border-b pb-3">
              <p className="text-sm text-gray-600">Número de Orden</p>
              <p className="text-lg font-semibold text-gray-800">{paymentDetails.buy_order}</p>
            </div>
            <div className="border-b pb-3">
              <p className="text-sm text-gray-600">Monto Pagado</p>
              <p className="text-lg font-semibold text-green-600">
                ${paymentDetails.amount?.toLocaleString('es-CL') ?? 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estado del Pago</p>
              <p className="text-lg font-semibold text-green-600 capitalize">
                {paymentDetails.status === 'AUTHORIZED' ? 'Autorizado' : paymentDetails.status}
              </p>
            </div>
          </div>
        )}

        {/* Mensaje informativo */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-blue-800">
            ✓ Los detalles han sido enviados a tu correo.
          </p>
        </div>

        {/* Botones de acción */}
        <div className="space-y-3">
          <Link
            href="/agendamientos"
            className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition transform hover:scale-105"
          >
            Ver Mis Agendamientos
          </Link>
          <Link
            href="/"
            className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition"
          >
            Ir al Inicio
          </Link>
        </div>

        {/* Footer con info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Si tienes problemas, contacta con un administrador en la sección de mensajes por favor.
          </p>
        </div>
      </div>
    </div>
  )
}

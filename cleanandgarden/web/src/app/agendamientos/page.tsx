"use client"

import React, { useEffect, useState, Suspense } from "react"
import Swal from 'sweetalert2'
import { useRouter, useSearchParams } from "next/navigation"

const API = process.env.NEXT_PUBLIC_API_URL ?? ""

// Componente que usa useSearchParams envuelto en Suspense
function AgendamientosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [citas, setCitas] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  
  // Estados para filtros y ordenamiento
  const [estadoFilter, setEstadoFilter] = useState<string>('todas')
  const [sortBy, setSortBy] = useState<string>('fecha_desc')
  const [filteredCitas, setFilteredCitas] = useState<any[]>([])
  const [paymentResult, setPaymentResult] = useState<any>(null)
  
  // Estado para modal de detalles de pago
  const [paymentModalData, setPaymentModalData] = useState<any>(null)

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
            await Swal.fire('Error en el pago', `No se pudo procesar el pago: ${b?.error ?? res.statusText}`, 'error')
            return
          }

          const result = await res.json()
          setPaymentResult(result)

          // Limpiar la URL
          router.replace('/agendamientos', { scroll: false })

          // Recargar citas después del pago exitoso
          if (result.status === 'AUTHORIZED' || result.status === 'success') {
            await Swal.fire({
              title: '¡Pago exitoso!',
              text: 'Tu pago ha sido procesado correctamente.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            })
            
            // Recargar las citas para mostrar el estado actualizado
            setTimeout(() => {
              window.location.reload()
            }, 1000)
          }

        } catch (err: any) {
          console.error("Error procesando pago:", err)
          setPaymentResult({ error: err?.message ?? "Error de conexión" })
          await Swal.fire('Error', 'Error de conexión al procesar el pago.', 'error')
        }
      }
      processPayment()
    }
  }, [searchParams, paymentResult, router])

  // Efecto para aplicar filtros y ordenamiento
  useEffect(() => {
    let filtered = [...citas]

    // Aplicar filtro por estado
    if (estadoFilter !== 'todas') {
      filtered = filtered.filter(cita => cita.estado === estadoFilter)
    }

    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'fecha_asc':
          const dateA = parseDateFromCita(a)
          const dateB = parseDateFromCita(b)
          if (!dateA && !dateB) return 0
          if (!dateA) return 1
          if (!dateB) return -1
          return dateA.getTime() - dateB.getTime()
        
        case 'fecha_desc':
          const dateADesc = parseDateFromCita(a)
          const dateBDesc = parseDateFromCita(b)
          if (!dateADesc && !dateBDesc) return 0
          if (!dateADesc) return 1
          if (!dateBDesc) return -1
          return dateBDesc.getTime() - dateADesc.getTime()
        
        case 'estado':
          const estadoOrder: { [key: string]: number } = { 'pendiente': 1, 'confirmada': 2, 'realizada': 3, 'cancelada': 4 }
          return (estadoOrder[a.estado as string] || 5) - (estadoOrder[b.estado as string] || 5)
        
        case 'servicio':
          const servicioA = a.servicio?.nombre || ''
          const servicioB = b.servicio?.nombre || ''
          return servicioA.localeCompare(servicioB)
        
        default:
          return 0
      }
    })

    setFilteredCitas(filtered)
  }, [citas, estadoFilter, sortBy])

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

  // Función para verificar si una cita está pagada
  const isCitaPagada = (c: any) => {
    const pagos = c.pago || []
    return pagos.some((p: any) => p.estado === 'aprobado')
  }

  // Función para verificar si una cita tiene pago pendiente
  const tienePagoPendiente = (c: any) => {
    const pagos = c.pago || []
    return pagos.some((p: any) => p.estado === 'pendiente')
  }

  // Función para iniciar pago con WebPay
  const iniciarPagoWebPay = async (cita: any) => {
    try {
      const monto = Number(cita.precio_aplicado || 0)
      if (!monto || monto <= 0) {
        await Swal.fire('Error', 'Precio inválido para esta cita.', 'error')
        return
      }

      const res = await fetch(`${API}/payments/webpay/create`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyOrder: `cita-${cita.id}`,
          sessionId: `usuario-${cita.usuario_cita_cliente_idTousuario?.id || 'cliente'}`,
          amount: monto,
          returnUrl: `${window.location.origin}/agendamientos`
        })
      })

      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        await Swal.fire('Error', `Error iniciando pago: ${b?.error ?? res.statusText}`, 'error')
        return
      }

      const body = await res.json()
      const url = body.url ?? body.raw?.url
      const token = body.token ?? body.raw?.token_ws ?? body.raw?.token
      
      if (!url || !token) {
        console.debug("Respuesta Webpay:", body)
        await Swal.fire('Error', 'Respuesta incompleta del servidor de pagos.', 'error')
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
      console.error("Error en iniciarPagoWebPay:", err)
      await Swal.fire('Error', 'Error de conexión al iniciar pago.', 'error')
    }
  }

  // Función para abrir modal de detalles de pago
  const abrirModalPago = (cita: any) => {
    const pagoAprobado = (cita.pago || []).find((p: any) => p.estado === 'aprobado')
    if (pagoAprobado) {
      setPaymentModalData({ cita, pago: pagoAprobado })
    }
  }

  // Función para cerrar modal
  const cerrarModalPago = () => {
    setPaymentModalData(null)
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

        {/* Controles de filtros y ordenamiento */}
        {!loading && !error && citas.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filtrar por estado:
                </label>
                <select
                  value={estadoFilter}
                  onChange={(e) => setEstadoFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
                >
                  <option value="todas">Todas las citas</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="confirmada">Confirmadas</option>
                  <option value="realizada">Realizadas</option>
                  <option value="cancelada">Canceladas</option>
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordenar por:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
                >
                  <option value="fecha_desc">Fecha (más recientes primero)</option>
                  <option value="fecha_asc">Fecha (más antiguas primero)</option>
                  <option value="estado">Estado</option>
                  <option value="servicio">Servicio</option>
                </select>
              </div>
            </div>
            
            <div className="mt-2 text-sm text-gray-600">
              Mostrando {filteredCitas.length} de {citas.length} citas
            </div>
          </div>
        )}

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
        ) : filteredCitas.length === 0 ? (
          <div className="text-center py-8">
            <p className="mb-4 text-gray-600">
              {estadoFilter === 'todas' 
                ? 'No tienes agendamientos.' 
                : `No tienes agendamientos ${estadoFilter === 'pendiente' ? 'pendientes' : 
                    estadoFilter === 'confirmada' ? 'confirmados' :
                    estadoFilter === 'realizada' ? 'realizados' :
                    estadoFilter === 'cancelada' ? 'cancelados' : ''}.`}
            </p>
            <div className="flex gap-2 justify-center">
              {estadoFilter !== 'todas' && (
                <button 
                  onClick={() => setEstadoFilter('todas')} 
                  className="rounded bg-gray-500 px-4 py-2 text-white text-sm"
                >
                  Ver todas
                </button>
              )}
              <button onClick={() => router.push('/book-appointment')} className="rounded bg-[#2E5430] px-4 py-2 text-white">Agendar una cita</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCitas.map((c: any) => {
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
                      <div><strong>Precio:</strong> {c.precio_aplicado ? `$${Number(c.precio_aplicado).toLocaleString('es-CL')}` : '—'}</div>
                      <div><strong>Estado:</strong> {c.estado ?? '—'}</div>
                      {c.notas_cliente && <div><strong>Notas:</strong> {c.notas_cliente}</div>}
                      { (c.estado === 'pendiente' || c.estado === 'confirmada') && (
                        <div className="mt-2">
                          <button 
                            onClick={() => canCancel(c) ? handleCancel(id) : null}
                            disabled={!canCancel(c)}
                            title={!canCancel(c) ? "Ya no puedes cancelar la hora. Si necesitas cancelarla o hacer alguna modificación, habla con un Administrador por mensaje" : "Cancelar cita"}
                            className={`rounded px-3 py-1 text-white ${canCancel(c) ? 'bg-red-600' : 'bg-gray-400 cursor-not-allowed'}`}
                          >
                            Cancelar cita
                          </button>
                        </div>
                      )}

                      { c.estado === 'realizada' && c.visita?.visita_producto && c.visita.visita_producto.length > 0 && (
                        <div className="mt-2">
                          <strong>Productos utilizados:</strong>
                          <ul className="ml-4 mt-1 space-y-1">
                            {c.visita.visita_producto.map((vp: any, idx: number) => (
                              <li key={idx} className="text-sm">
                                • {vp.producto?.nombre ?? 'Producto'} {vp.cantidad ? `(x${vp.cantidad})` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      { c.estado === 'realizada' && (!c.visita?.visita_producto || c.visita.visita_producto.length === 0) && (
                        <div className="mt-2">
                          <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-sm">Servicio completado</span>
                        </div>
                      )}

                      {/* Estado de pago para citas realizadas */}
                      { c.estado === 'realizada' && (
                        <div className="mt-2">
                          {isCitaPagada(c) ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-sm font-medium">
                                ✓ Servicio pagado
                              </span>
                              <button
                                onClick={() => abrirModalPago(c)}
                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                              >
                                Ver detalles
                              </button>
                            </div>
                          ) : tienePagoPendiente(c) ? (
                            <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-sm font-medium">
                              ⏳ Pago pendiente
                            </span>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-sm font-medium">
                                ❌ Servicio sin pagar
                              </span>
                              <button
                                onClick={() => iniciarPagoWebPay(c)}
                                className="bg-[#2E5430] text-white px-3 py-2 rounded text-sm font-medium hover:bg-[#1f3a24] transition-colors"
                              >
                                Pagar ahora - ${Number(c.precio_aplicado || 0).toLocaleString('es-CL')}
                              </button>
                            </div>
                          )}
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

      {/* Modal de detalles de pago */}
      {paymentModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-[#2E5430]">Detalles del Pago</h3>
                <button
                  onClick={cerrarModalPago}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                {/* Información de la cita */}
                <div className="border-b pb-3">
                  <h4 className="font-semibold text-gray-800 mb-2">Servicio</h4>
                  <p className="text-sm text-gray-600">
                    {paymentModalData.cita.servicio?.nombre || 'Servicio'}
                  </p>
                  <p className="text-sm text-gray-600">
                    ID Cita: {paymentModalData.cita.id}
                  </p>
                </div>

                {/* Información del pago */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-800">Información del Pago</h4>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">ID Pago:</span>
                      <p className="text-gray-800">{paymentModalData.pago.id}</p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-600">Estado:</span>
                      <p className="text-green-600 font-medium">{paymentModalData.pago.estado}</p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-600">Método:</span>
                      <p className="text-gray-800">{paymentModalData.pago.metodo || 'WebPay'}</p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-600">Monto:</span>
                      <p className="text-gray-800 font-medium">
                        ${Number(paymentModalData.pago.monto_clp || 0).toLocaleString('es-CL')} CLP
                      </p>
                    </div>
                    
                    <div className="col-span-2">
                      <span className="font-medium text-gray-600">Fecha de pago:</span>
                      <p className="text-gray-800">
                        {paymentModalData.pago.creado_en 
                          ? new Date(paymentModalData.pago.creado_en).toLocaleString('es-CL')
                          : 'No disponible'
                        }
                      </p>
                    </div>
                    
                    {paymentModalData.pago.flow_order_id && (
                      <div className="col-span-2">
                        <span className="font-medium text-gray-600">Orden Flow:</span>
                        <p className="text-gray-800 text-xs break-all">{paymentModalData.pago.flow_order_id}</p>
                      </div>
                    )}
                    
                    {paymentModalData.pago.flow_status && (
                      <div className="col-span-2">
                        <span className="font-medium text-gray-600">Estado Flow:</span>
                        <p className="text-gray-800">{paymentModalData.pago.flow_status}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={cerrarModalPago}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// Componente principal con Suspense boundary
export default function AgendamientosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando agendamientos...</p>
        </div>
      </div>
    }>
      <AgendamientosContent />
    </Suspense>
  )
}

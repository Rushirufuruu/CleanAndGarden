"use client"

import React, { useEffect, useState } from "react"
import Swal from 'sweetalert2'
import { useRouter, useSearchParams } from "next/navigation"
import { Download } from "lucide-react"
import jsPDF from "jspdf"

const API = process.env.NEXT_PUBLIC_API_URL ?? ""

export default function AgendamientosPage() {
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
  const [downloadingPdf, setDownloadingPdf] = useState(false)

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
  // Nota: Ahora esto se maneja en /pago-exitoso
  // Este código se mantiene por compatibilidad pero no debería ejecutarse

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
          returnUrl: `${window.location.origin}/pago-exitoso`
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

  // Función para descargar boleta en PDF
  const descargarBoleta = async (cita: any) => {
    const pago = (cita.pago || []).find((p: any) => p.estado === 'aprobado')
    if (!pago) {
      await Swal.fire('Error', 'No hay pago aprobado para esta cita', 'error')
      return
    }

    setDownloadingPdf(true)
    try {
      // Obtener detalles completos de la cita del backend
      let citaCompleta = cita
      try {
        const res = await fetch(`${API}/citas/${cita.id}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
        if (res.ok) {
          citaCompleta = await res.json()
          console.log('Cita completa obtenida:', citaCompleta)
          console.log('Visita producto:', citaCompleta.visita?.visita_producto)
        }
      } catch (err) {
        console.error('Error obteniendo detalles completos:', err)
        // Continuar con los datos que tenemos
      }

      const pdf = new jsPDF()
      const pageHeight = pdf.internal.pageSize.getHeight()

      const pageWidth = pdf.internal.pageSize.getWidth()
      let yPosition = 15

      // Encabezado
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(18)
      pdf.text("CLEAN & GARDEN", pageWidth / 2, yPosition, { align: "center" })
      yPosition += 8

      pdf.setFontSize(10)
      pdf.setFont("helvetica", "normal")
      pdf.text("Servicios de Limpieza y Jardinería", pageWidth / 2, yPosition, { align: "center" })
      yPosition += 5
      pdf.text("RUT: 76.123.456-K | Tel: (2) 2345 6789", pageWidth / 2, yPosition, { align: "center" })
      yPosition += 10

      // Línea separadora
      pdf.setDrawColor(0, 120, 50)
      pdf.line(15, yPosition, pageWidth - 15, yPosition)
      yPosition += 8

      // Título del documento
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(14)
      pdf.text("BOLETA DE PAGO", pageWidth / 2, yPosition, { align: "center" })
      yPosition += 10

      // Información de la boleta
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(10)
      pdf.text(`Número de Orden: cita-${citaCompleta.id}`, 15, yPosition)
      yPosition += 6
      pdf.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, 15, yPosition)
      yPosition += 6
      pdf.text(`Hora: ${new Date().toLocaleTimeString('es-CL')}`, 15, yPosition)
      yPosition += 10

      // Detalles de pago
      pdf.setFont("helvetica", "bold")
      pdf.text("DETALLES DE PAGO", 15, yPosition)
      yPosition += 7

      pdf.setFont("helvetica", "normal")
      pdf.text(`Monto: $${Number(pago.monto_clp || citaCompleta.precio_aplicado || 0).toLocaleString('es-CL')}`, 20, yPosition)
      yPosition += 6
      pdf.text(`Método: ${pago.metodo || 'WebPay'}`, 20, yPosition)
      yPosition += 6
      pdf.text(`Estado: PAGADO`, 20, yPosition)
      yPosition += 10

      // Detalles del servicio
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(10)
      pdf.text("DETALLES DEL SERVICIO", 15, yPosition)
      yPosition += 7

      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(9)
      
      if (citaCompleta.servicio?.nombre) {
        pdf.text(`Servicio: ${citaCompleta.servicio.nombre}`, 20, yPosition)
        yPosition += 5
      }
      
      if (citaCompleta.fecha || citaCompleta.fecha_hora || citaCompleta.hora_inicio) {
        const fecha = new Date(citaCompleta.fecha_hora || citaCompleta.hora_inicio || citaCompleta.fecha)
        pdf.text(`Fecha: ${fecha.toLocaleDateString('es-CL')}`, 20, yPosition)
        yPosition += 5
      }
      
      if (citaCompleta.hora) {
        pdf.text(`Hora: ${citaCompleta.hora}`, 20, yPosition)
        yPosition += 5
      }

      // Dirección
      const dir = getDireccionText(citaCompleta)
      if (dir !== '—') {
        pdf.text(`Dirección: ${dir}`, 20, yPosition)
        yPosition += 5
      }

      // TABLA DE RESUMEN DE PRECIOS
      yPosition += 5
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(10)
      pdf.text("RESUMEN DE PRECIOS", 15, yPosition)
      yPosition += 8

      // Encabezados de tabla
      const col1 = 15
      const col2 = 90
      const col3 = 130
      const col4 = 160
      const col5 = 190
      const rowHeight = 6

      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(8)
      
      // Línea de encabezado
      pdf.rect(col1, yPosition - 3, 180, rowHeight)
      pdf.text("Concepto", col1 + 2, yPosition)
      pdf.text("Cantidad", col2 + 2, yPosition)
      pdf.text("P. Unitario", col3 + 2, yPosition)
      pdf.text("Total", col5 - 10, yPosition)
      yPosition += rowHeight + 1

      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(8)

      // Fila del servicio
      const servicioName = citaCompleta.servicio?.nombre || 'Servicio'
      // Obtener el precio del servicio, si no está disponible, calcular restando los insumos del total
      let precioServicio = Number(citaCompleta.servicio?.precio || 0)
      
      // Si no tenemos el precio del servicio, intentar obtenerlo del diferencial
      if (precioServicio === 0 && citaCompleta.precio_aplicado) {
        const totalInsumosPrevio = (citaCompleta.visita?.visita_producto || []).reduce((sum: number, vp: any) => {
          return sum + Number(vp.costo_total || 0)
        }, 0)
        precioServicio = Number(citaCompleta.precio_aplicado) - totalInsumosPrevio
      }
      
      pdf.text(servicioName, col1 + 2, yPosition)
      pdf.text("1", col2 + 2, yPosition)
      pdf.text(`$${precioServicio.toLocaleString('es-CL')}`, col3 + 2, yPosition)
      pdf.text(`$${precioServicio.toLocaleString('es-CL')}`, col5 - 10, yPosition)
      yPosition += rowHeight

      // Filas de insumos (si existen)
      let totalInsumos = 0
      if (citaCompleta.visita?.visita_producto && citaCompleta.visita.visita_producto.length > 0) {
        citaCompleta.visita.visita_producto.forEach((vp: any) => {
          const insumeName = vp.producto?.nombre || 'Insumo desconocido'
          const cantidad = vp.cantidad || 1
          // Los precios vienen directamente en visita_producto
          const precioUnitario = Number(vp.costo_unitario || vp.precio || vp.producto?.precio || 0)
          const precioTotal = Number(vp.costo_total || precioUnitario * cantidad || 0)
          totalInsumos += precioTotal

          pdf.text(insumeName, col1 + 2, yPosition)
          pdf.text(String(cantidad), col2 + 2, yPosition)
          pdf.text(`$${precioUnitario.toLocaleString('es-CL')}`, col3 + 2, yPosition)
          pdf.text(`$${precioTotal.toLocaleString('es-CL')}`, col5 - 10, yPosition)
          yPosition += rowHeight
        })
      }

      // Línea de separación
      pdf.setDrawColor(150, 150, 150)
      pdf.line(col1, yPosition, col5, yPosition)
      yPosition += 2

      // Fila de total
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(9)
      const totalFinal = precioServicio + totalInsumos
      pdf.text("TOTAL", col1 + 2, yPosition + 2)
      pdf.text(`$${totalFinal.toLocaleString('es-CL')}`, col5 - 10, yPosition + 2)
      yPosition += 10

      yPosition += 5

      // Información del cliente
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(9)
      pdf.text("INFORMACIÓN DEL CLIENTE", 15, yPosition)
      yPosition += 6

      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(9)
      const clientName = getClientName(citaCompleta)
      if (clientName !== '—') {
        pdf.text(`Nombre: ${clientName}`, 20, yPosition)
        yPosition += 5
      }
      
      // Email del cliente
      const clientEmail = citaCompleta.usuario?.email || citaCompleta.usuario_cita_cliente_idTousuario?.email || citaCompleta.email || '—'
      if (clientEmail !== '—') {
        pdf.text(`Email: ${clientEmail}`, 20, yPosition)
        yPosition += 5
      }
      
      // Teléfono del cliente
      const clientPhone = citaCompleta.usuario?.telefono || citaCompleta.usuario_cita_cliente_idTousuario?.telefono || citaCompleta.telefono || '—'
      if (clientPhone && clientPhone !== '—') {
        pdf.text(`Teléfono: ${clientPhone}`, 20, yPosition)
        yPosition += 5
      }

      yPosition += 5

      // Línea separadora
      pdf.setDrawColor(200, 200, 200)
      pdf.line(15, yPosition, pageWidth - 15, yPosition)
      yPosition += 8

      // Footer
      pdf.setFont("helvetica", "italic")
      pdf.setFontSize(8)
      pdf.text("Muchas gracias por tu pago", pageWidth / 2, yPosition, { align: "center" })
      yPosition += 5
      pdf.text("Para consultas o problemas, contacta a soporte@cleanandgarden.cl", pageWidth / 2, yPosition, { align: "center" })
      yPosition += 5
      pdf.text(`Comprobante generado: ${new Date().toLocaleString('es-CL')}`, pageWidth / 2, yPosition, { align: "center" })

      // Descargar PDF
      pdf.save(`Boleta_cita-${cita.id}.pdf`)
      await Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Boleta descargada',
        showConfirmButton: false,
        timer: 1500
      })
      setDownloadingPdf(false)
    } catch (err) {
      console.error("Error descargando PDF:", err)
      await Swal.fire('Error', 'Error al descargar la boleta. Intenta nuevamente.', 'error')
      setDownloadingPdf(false)
    }
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
                      <div className="text-sm mb-2">
                        {c.estado === 'realizada' ? (
                          isCitaPagada(c) ? (
                            <span className="text-green-600 font-medium">Realizado ✓</span>
                          ) : (
                            <span className="text-orange-600 font-medium">Realizado sin pagar</span>
                          )
                        ) : (
                          c.estado ? c.estado.charAt(0).toUpperCase() + c.estado.slice(1) : '—'
                        )}
                      </div>
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
                            <>
                              <div className="mb-2">
                                <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-sm font-medium">
                                  ✓ Servicio pagado
                                </span>
                              </div>
                              <button
                                onClick={() => descargarBoleta(c)}
                                disabled={downloadingPdf}
                                className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                              >
                                <Download className="w-4 h-4" />
                                {downloadingPdf ? 'Descargando...' : 'Descargar Boleta (PDF)'}
                              </button>
                            </>
                          ) : tienePagoPendiente(c) ? (
                            <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-sm font-medium">
                              ⏳ Pago pendiente
                            </span>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <span className="px-2 py-1 rounded bg-orange-100 text-orange-800 text-sm font-medium">
                                Realizado sin pagar
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

    </div>
  )
}

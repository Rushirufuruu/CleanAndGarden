"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Swal from 'sweetalert2'

const API = process.env.NEXT_PUBLIC_API_URL ?? ""

interface Cita {
  id: number
  fecha_hora: string
  duracion_minutos: number
  estado: string
  precio_aplicado: number
  notas_cliente: string
  motivo_cancelacion?: string
  notas_cancelacion?: string
  cancelada_por_usuario_id?: number
  cancelada_por_rol?: string
  usuario_cita_cancelada_por_usuario_idTousuario?: {
    id: number
    nombre: string
    apellido: string
  }
  servicio: {
    id: number
    nombre: string
  }
  jardin: {
    id: number
    nombre: string
    direccion: {
      comuna: {
        region: {
          nombre: string
        }
      }
    }
  }
  usuario_cita_cliente_idTousuario: {
    id: number
    nombre: string
    apellido: string
    email: string
    telefono: string
  }
  pago?: Array<{
    id: number
    estado: string
    monto_clp: number
    metodo: string
  }>
  visita?: {
    id: number
    insumos: any // Puede ser array o string JSON
    estado: string
    resumen: string | null
    inicio: string | null
    fin: string | null
    visita_producto?: Array<{
      cantidad: number
      producto: {
        id: number
        nombre: string
        precio_unitario: number
      }
    }>
  }
}

type FiltroFecha = 'todos' | 'hoy' | 'semana' | 'mes'
type FiltroEstado = 'todos' | 'pendiente' | 'confirmada' | 'realizada' | 'cancelada'

export default function AgendamientosJardineroPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [citas, setCitas] = useState<Cita[]>([])
  const [citasFiltradas, setCitasFiltradas] = useState<Cita[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Estado para el modal de completar cita
  const [modalCompletarOpen, setModalCompletarOpen] = useState(false)
  const [citaACompletar, setCitaACompletar] = useState<Cita | null>(null)
  const [productosDisponibles, setProductosDisponibles] = useState<Array<{id: number, nombre: string, descripcion?: string, precio_unitario: number, stock_actual?: number}>>([])
  const [productosAgregados, setProductosAgregados] = useState<Array<{producto_id: number, nombre: string, precio_unitario: number, cantidad: number}>>([])
  const [productoSeleccionado, setProductoSeleccionado] = useState('')
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState('1')
  const [completandoCita, setCompletandoCita] = useState(false)

  // Filtros
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>('todos')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroServicio, setFiltroServicio] = useState('')

  // Verificar autenticación y rol
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API}/profile`, { credentials: 'include' })
        if (res.status === 401) {
          router.push('/login')
          return
        }
        const data = await res.json()
        if (data.user) {
          const rol = data.user.rol?.codigo || data.user.rol
          if (rol !== 'jardinero' && rol !== 'tecnico') {
            Swal.fire({
              icon: 'error',
              title: 'Acceso denegado',
              text: 'Esta página es solo para jardineros.'
            })
            router.push('/')
            return
          }
          setIsAuthenticated(true)
          setUserRole(rol)
        }
      } catch (err) {
        console.error('Error verificando autenticación:', err)
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  // Cargar citas del jardinero
  useEffect(() => {
    if (!isAuthenticated) return

    const loadCitas = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/citas/jardinero`, { credentials: 'include' })
        if (!res.ok) throw new Error('Error cargando citas')
        const data = await res.json()
        const items = Array.isArray(data) ? data : data?.data ?? []
        setCitas(items)
        setCitasFiltradas(items)
      } catch (err: any) {
        console.error('Error cargando citas:', err)
        setError(err?.message ?? 'Error cargando citas')
      } finally {
        setLoading(false)
      }
    }
    loadCitas()
  }, [isAuthenticated])

  // Aplicar filtros
  useEffect(() => {
    let filtradas = [...citas]

    // Filtro por fecha
    if (filtroFecha !== 'todos') {
      const ahora = new Date()
      const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())

      filtradas = filtradas.filter(cita => {
        const fechaCita = new Date(cita.fecha_hora)
        const fechaCitaSolo = new Date(fechaCita.getFullYear(), fechaCita.getMonth(), fechaCita.getDate())

        switch (filtroFecha) {
          case 'hoy':
            return fechaCitaSolo.getTime() === hoy.getTime()
          case 'semana':
            const semanaInicio = new Date(hoy)
            semanaInicio.setDate(hoy.getDate() - hoy.getDay())
            const semanaFin = new Date(semanaInicio)
            semanaFin.setDate(semanaInicio.getDate() + 6)
            return fechaCitaSolo >= semanaInicio && fechaCitaSolo <= semanaFin
          case 'mes':
            return fechaCita.getMonth() === ahora.getMonth() && fechaCita.getFullYear() === ahora.getFullYear()
          default:
            return true
        }
      })
    }

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      filtradas = filtradas.filter(cita => cita.estado === filtroEstado)
    }

    // Filtro por cliente
    if (filtroCliente.trim()) {
      const searchTerm = filtroCliente.toLowerCase()
      filtradas = filtradas.filter(cita => {
        const cliente = cita.usuario_cita_cliente_idTousuario
        return cliente.nombre.toLowerCase().includes(searchTerm) ||
               cliente.apellido.toLowerCase().includes(searchTerm) ||
               cliente.email.toLowerCase().includes(searchTerm)
      })
    }

    // Filtro por servicio
    if (filtroServicio.trim()) {
      const searchTerm = filtroServicio.toLowerCase()
      filtradas = filtradas.filter(cita =>
        cita.servicio.nombre.toLowerCase().includes(searchTerm)
      )
    }

    setCitasFiltradas(filtradas)
  }, [citas, filtroFecha, filtroEstado, filtroCliente, filtroServicio])

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800'
      case 'confirmada': return 'bg-green-100 text-green-800'
      case 'realizada': return 'bg-blue-100 text-blue-800'
      case 'cancelada': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPagoEstado = (cita: Cita) => {
    if (!cita.pago || cita.pago.length === 0) return 'Sin pago'
    const pagoAprobado = cita.pago.find(p => p.estado === 'aprobado')
    if (pagoAprobado) return `Pagado: $${pagoAprobado.monto_clp}`
    return 'Pago pendiente'
  }

  const getCanceladoPor = (cita: Cita) => {
    if (cita.estado !== 'cancelada') return null

    const usuario = cita.usuario_cita_cancelada_por_usuario_idTousuario
    const rol = cita.cancelada_por_rol
    const usuarioId = cita.cancelada_por_usuario_id

    // Debug log
    console.log('Debug cancelación cita', cita.id, ':', {
      usuario,
      rol,
      usuarioId,
      cancelada_por_rol: cita.cancelada_por_rol,
      cancelada_por_usuario_id: cita.cancelada_por_usuario_id
    })

    // Si hay información del usuario, mostrar nombre completo con rol
    if (usuario) {
      const rolLabels: { [key: string]: string } = {
        'admin': 'Administrador',
        'cliente': 'Cliente',
        'jardinero': 'Jardinero',
        'tecnico': 'Técnico'
      }
      const rolDisplay = rolLabels[rol || ''] || rol || 'Usuario'
      return `${usuario.nombre} ${usuario.apellido} (${rolDisplay})`
    }

    // Si hay rol pero no usuario (usuario eliminado), mostrar solo el rol
    if (rol) {
      const rolLabels: { [key: string]: string } = {
        'admin': 'Administrador',
        'cliente': 'Cliente',
        'jardinero': 'Jardinero',
        'tecnico': 'Técnico'
      }
      return rolLabels[rol] || rol
    }

    // Si hay ID de usuario pero no relación (usuario eliminado), mostrar ID
    if (usuarioId) {
      return `Usuario ID: ${usuarioId}`
    }

    // Si no hay información, mostrar Sistema
    return 'Sistema'
  }

  const puedeMostrarBotonCancelar = (cita: Cita) => {
    // Mostrar botón si está en estado pendiente o confirmada
    return ['pendiente', 'confirmada'].includes(cita.estado)
  }

  const puedeCancelarCita = (cita: Cita) => {
    // Solo permitir cancelar si está en estado pendiente o confirmada
    if (!['pendiente', 'confirmada'].includes(cita.estado)) {
      return false
    }

    // Validar plazo de cancelación: hasta las 12:00 del día anterior
    const fechaCita = new Date(cita.fecha_hora)
    const deadline = new Date(fechaCita.getFullYear(), fechaCita.getMonth(), fechaCita.getDate() - 1, 12, 0, 0, 0)
    const ahora = new Date()

    return ahora <= deadline
  }

  const cancelarCita = async (citaId: number) => {
    // Pedir confirmación con motivo opcional
    const { value: motivo } = await Swal.fire({
      title: '¿Cancelar esta cita?',
      text: 'Esta acción no se puede deshacer. El cliente será notificado.',
      icon: 'warning',
      input: 'textarea',
      inputLabel: 'Motivo de cancelación (opcional)',
      inputPlaceholder: 'Ej: Imprevisto personal, enfermedad, etc.',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, cancelar cita',
      cancelButtonText: 'No, mantener cita'
    });

    if (motivo === undefined) return; // Usuario canceló

    try {
      const res = await fetch(`${API}/cita/${citaId}/cancelar`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivo_cancelacion: motivo || null,
          notas_cancelacion: null
        })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Error al cancelar la cita');
      }

      // Actualizar la lista de citas
      setCitas(prev => prev.map(c =>
        c.id === citaId ? { ...c, estado: 'cancelada' } : c
      ));

      Swal.fire({
        icon: 'success',
        title: 'Cita cancelada',
        text: 'La cita ha sido cancelada exitosamente.',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (err: any) {
      console.error('Error cancelando cita:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message || 'No se pudo cancelar la cita. Inténtalo de nuevo.'
      });
    }
  };

  // Funciones para completar cita con insumos
  const abrirModalCompletar = async (cita: Cita) => {
    // Si es una cita diferente, resetear productos
    if (!citaACompletar || citaACompletar.id !== cita.id) {
      setProductosAgregados([])
    }
    setCitaACompletar(cita)
    setProductoSeleccionado('')
    setCantidadSeleccionada('1')
    setModalCompletarOpen(true)

    // Cargar productos disponibles
    try {
      const res = await fetch(`${API}/productos`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setProductosDisponibles(data.productos || [])
      }
    } catch (err) {
      console.error('Error cargando productos:', err)
    }
  }

  const agregarProducto = () => {
    if (!productoSeleccionado || !cantidadSeleccionada) {
      Swal.fire('Error', 'Debes seleccionar un producto y cantidad', 'error')
      return
    }

    const productoId = parseInt(productoSeleccionado)
    const cantidad = parseInt(cantidadSeleccionada)
    const producto = productosDisponibles.find(p => p.id === productoId)

    if (!producto) {
      Swal.fire('Error', 'Producto no encontrado', 'error')
      return
    }

    if (cantidad <= 0) {
      Swal.fire('Error', 'La cantidad debe ser mayor a 0', 'error')
      return
    }

    if (producto.stock_actual !== null && producto.stock_actual !== undefined && producto.stock_actual < cantidad) {
      Swal.fire('Error', `Stock insuficiente. Disponible: ${producto.stock_actual}`, 'error')
      return
    }

    // Verificar si el producto ya está agregado
    const existente = productosAgregados.find(p => p.producto_id === productoId)
    if (existente) {
      setProductosAgregados(productosAgregados.map(p => 
        p.producto_id === productoId 
          ? { ...p, cantidad: p.cantidad + cantidad }
          : p
      ))
    } else {
      setProductosAgregados([...productosAgregados, {
        producto_id: productoId,
        nombre: producto.nombre,
        precio_unitario: Number(producto.precio_unitario || 0),
        cantidad: cantidad
      }])
    }

    setProductoSeleccionado('')
    setCantidadSeleccionada('1')
  }

  const quitarProducto = (productoId: number) => {
    setProductosAgregados(productosAgregados.filter(p => p.producto_id !== productoId))
  }

  const completarCita = async () => {
    if (!citaACompletar) return

    setCompletandoCita(true)
    try {
      const res = await fetch(`${API}/cita/${citaACompletar.id}/completar`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productos: productosAgregados })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'No se pudo completar la cita')
      }

      // Recargar citas
      try {
        const gRes = await fetch(`${API}/citas/jardinero`, { credentials: 'include' })
        if (gRes.ok) {
          const gBody = await gRes.json()
          const items = gBody?.citas ?? gBody?.data ?? gBody ?? []
          setCitas(Array.isArray(items) ? items : [])
        }
      } catch (err) {
        console.debug('reload citas failed', err)
      }

      setModalCompletarOpen(false)
      setCitaACompletar(null)

      Swal.fire({
        icon: 'success',
        title: 'Cita completada',
        text: 'La cita ha sido marcada como completada exitosamente.',
        timer: 2000,
        showConfirmButton: false
      })

    } catch (err: any) {
      console.error('Error completando cita:', err)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message || 'No se pudo completar la cita. Inténtalo de nuevo.'
      })
    } finally {
      setCompletandoCita(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fefaf2] py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2E5430] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tus citas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fefaf2] py-8 px-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#2E5430] hover:bg-[#1f3a23] text-white px-6 py-2 rounded"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fefaf2] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2E5430] mb-2">Mis Citas Asignadas</h1>
          <p className="text-gray-600">Gestiona todas las citas que tienes asignadas como jardinero</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#2E5430] mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro por fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
              <select
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value as FiltroFecha)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
              >
                <option value="todos">Todas las fechas</option>
                <option value="hoy">Hoy</option>
                <option value="semana">Esta semana</option>
                <option value="mes">Este mes</option>
              </select>
            </div>

            {/* Filtro por estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="confirmada">Confirmada</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            {/* Filtro por cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar cliente</label>
              <input
                type="text"
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                placeholder="Nombre, apellido o email"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
              />
            </div>

            {/* Filtro por servicio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Servicio</label>
              <input
                type="text"
                value={filtroServicio}
                onChange={(e) => setFiltroServicio(e.target.value)}
                placeholder="Nombre del servicio"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
              />
            </div>
          </div>

          {/* Botón para limpiar filtros */}
          <div className="mt-4">
            <button
              onClick={() => {
                setFiltroFecha('todos')
                setFiltroEstado('todos')
                setFiltroCliente('')
                setFiltroServicio('')
              }}
              className="text-[#2E5430] hover:text-[#1f3a23] underline text-sm"
            >
              Limpiar todos los filtros
            </button>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-[#2E5430]">{citasFiltradas.length}</div>
            <div className="text-gray-600">Citas encontradas</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {citasFiltradas.filter(c => c.estado === 'pendiente').length}
            </div>
            <div className="text-gray-600">Pendientes</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-green-600">
              {citasFiltradas.filter(c => c.estado === 'confirmada').length}
            </div>
            <div className="text-gray-600">Confirmadas</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-blue-600">
              {citasFiltradas.filter(c => c.estado === 'realizada').length}
            </div>
            <div className="text-gray-600">Realizadas</div>
          </div>
        </div>

        {/* Lista de citas */}
        <div className="space-y-4">
          {citasFiltradas.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay citas</h3>
              <p className="text-gray-500">
                {citas.length === 0
                  ? "Aún no tienes citas asignadas."
                  : "No se encontraron citas con los filtros aplicados."
                }
              </p>
            </div>
          ) : (
            citasFiltradas.map((cita) => (
              <div key={cita.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="text-lg font-semibold text-[#2E5430]">
                        {cita.servicio.nombre}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(cita.estado)}`}>
                        {cita.estado}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <strong>Cliente:</strong> {cita.usuario_cita_cliente_idTousuario.nombre} {cita.usuario_cita_cliente_idTousuario.apellido}
                      </div>
                      <div>
                        <strong>Email:</strong> {cita.usuario_cita_cliente_idTousuario.email}
                      </div>
                      <div>
                        <strong>Teléfono:</strong> {cita.usuario_cita_cliente_idTousuario.telefono || 'No especificado'}
                      </div>
                      <div>
                        <strong>Fecha y hora:</strong> {new Date(cita.fecha_hora).toLocaleString()}
                      </div>
                      <div>
                        <strong>Duración:</strong> {cita.duracion_minutos} minutos
                      </div>
                      <div>
                        <strong>Jardín:</strong> {cita.jardin.nombre}
                      </div>
                      <div>
                        <strong>Ubicación:</strong> {cita.jardin.direccion?.comuna?.region?.nombre || 'No especificada'}
                      </div>
                      <div>
                        <strong>Precio:</strong> ${cita.precio_aplicado || 0}
                      </div>
                      <div>
                        <strong>Pago:</strong> {getPagoEstado(cita)}
                      </div>
                    </div>

                    {cita.notas_cliente && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <strong>Notas del cliente:</strong> {cita.notas_cliente}
                      </div>
                    )}

                    {cita.estado === 'cancelada' && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
                        <div className="mb-2">
                          <strong>Cancelada por:</strong> {getCanceladoPor(cita)}
                        </div>
                        <div>
                          <strong>Motivo de cancelación:</strong> {cita.motivo_cancelacion || 'N/A'}
                        </div>
                        {cita.notas_cancelacion && (
                          <div className="mt-2">
                            <strong>Notas adicionales:</strong> {cita.notas_cancelacion}
                          </div>
                        )}
                      </div>
                    )}

                    {cita.estado === 'realizada' && cita.visita && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm">
                        <div className="mb-2">
                          <strong>✅ Cita completada</strong>
                        </div>
                        {cita.visita.resumen && (
                          <div className="mb-2">
                            <strong>Resumen:</strong> {cita.visita.resumen}
                          </div>
                        )}
                        {cita.visita.visita_producto && cita.visita.visita_producto.length > 0 && (() => {
                          const productos = cita.visita.visita_producto;
                          const totalProductos = productos.reduce((total: number, item: any) => 
                            total + (Number(item.producto.precio_unitario) * Number(item.cantidad)), 0
                          );
                          return (
                            <div>
                              <strong>Productos utilizados:</strong>
                              <ul className="mt-1 ml-4 list-disc">
                                {productos.map((item: any, index: number) => (
                                  <li key={index}>
                                    {item.producto.nombre} - ${Number(item.producto.precio_unitario).toFixed(2)} x {item.cantidad} = ${(Number(item.producto.precio_unitario) * Number(item.cantidad)).toFixed(2)}
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-2 font-semibold">
                                Total productos: ${totalProductos.toFixed(2)}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {(puedeMostrarBotonCancelar(cita) || cita.estado === 'confirmada') && (
                      <div className="mt-4 flex justify-end gap-2">
                        {cita.estado === 'confirmada' && (
                          <button
                            onClick={() => abrirModalCompletar(cita)}
                            className="px-4 py-2 rounded-lg font-medium transition-colors bg-green-500 hover:bg-green-600 text-white"
                          >
                            Completar Cita
                          </button>
                        )}
                        {puedeMostrarBotonCancelar(cita) && (
                          <button
                            onClick={() => puedeCancelarCita(cita) ? cancelarCita(cita.id) : null}
                            disabled={!puedeCancelarCita(cita)}
                            title={!puedeCancelarCita(cita) ? "Ya no puedes cancelar la hora. Si necesitas cancelarla o hacer alguna modificación, habla con un Administrador por mensaje" : "Cancelar cita"}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              puedeCancelarCita(cita)
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            Cancelar Cita
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal para completar cita */}
      {modalCompletarOpen && citaACompletar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Completar Cita</h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <h3 className="font-semibold">Detalles de la cita:</h3>
              <p><strong>Servicio:</strong> {citaACompletar.servicio.nombre}</p>
              <p><strong>Cliente:</strong> {citaACompletar.usuario_cita_cliente_idTousuario.nombre} {citaACompletar.usuario_cita_cliente_idTousuario.apellido}</p>
              <p><strong>Fecha:</strong> {new Date(citaACompletar.fecha_hora).toLocaleString()}</p>
              <p><strong>Precio base:</strong> ${Number(citaACompletar.precio_aplicado) || 0}</p>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2">Seleccionar Productos Utilizados</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                <select
                  value={productoSeleccionado}
                  onChange={(e) => setProductoSeleccionado(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="">Seleccionar producto</option>
                  {productosDisponibles.map(producto => (
                    <option key={producto.id} value={producto.id}>
                      {producto.nombre} - ${Number(producto.precio_unitario || 0).toFixed(2)} 
                      {producto.stock_actual !== null && producto.stock_actual !== undefined ? `(Stock: ${producto.stock_actual})` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Cantidad"
                  value={cantidadSeleccionada}
                  onChange={(e) => setCantidadSeleccionada(e.target.value)}
                  className="border rounded px-3 py-2"
                  min="1"
                />
                <div></div>
                <button
                  onClick={agregarProducto}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Agregar
                </button>
              </div>
            </div>

            {productosAgregados.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Productos seleccionados:</h3>
                <div className="space-y-2">
                  {productosAgregados.map((producto) => (
                    <div key={producto.producto_id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>{producto.nombre} - ${Number(producto.precio_unitario).toFixed(2)} x {producto.cantidad} = ${(Number(producto.precio_unitario) * Number(producto.cantidad)).toFixed(2)}</span>
                      <button
                        onClick={() => quitarProducto(producto.producto_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 p-2 bg-blue-50 rounded">
                  <strong>Total productos: ${productosAgregados.reduce((total, producto) => total + (Number(producto.precio_unitario) * Number(producto.cantidad)), 0).toFixed(2)}</strong>
                </div>
                <div className="mt-1 p-2 bg-green-50 rounded">
                  <strong>Total final: ${(Number(citaACompletar.precio_aplicado) || 0) + productosAgregados.reduce((total, producto) => total + (Number(producto.precio_unitario) * Number(producto.cantidad)), 0)}</strong>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalCompletarOpen(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
                disabled={completandoCita}
              >
                Cancelar
              </button>
              <button
                onClick={completarCita}
                disabled={completandoCita}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
              >
                {completandoCita ? 'Completando...' : 'Completar Cita'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

const API = process.env.NEXT_PUBLIC_API_URL ?? ""

// Función para subir imagen a Supabase Storage
const uploadImageToSupabase = async (file: File): Promise<string | null> => {
  try {
    console.log('🔄 Iniciando subida de imagen:', file.name, 'Tamaño:', file.size);
    
    // Generar nombre único para el archivo
    const fileName = `gardens/${Date.now()}-${file.name}`;
    console.log('📁 Nombre del archivo:', fileName);
    
    // Subir archivo al bucket
    const { data, error } = await supabase.storage
      .from('clean-and-garden-bucket')
      .upload(fileName, file);

    if (error) {
      throw error;
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('clean-and-garden-bucket')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};

export default function BookAppointmentPage() {
	const router = useRouter()
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isAuthenticated, setIsAuthenticated] = useState(false)

		// perfil del usuario (prefill)
		const [firstName, setFirstName] = useState("")
		const [lastName, setLastName] = useState("")
		const [email, setEmail] = useState("")
		const [phone, setPhone] = useState("")
		const [clienteId, setClienteId] = useState<number | null>(null)

		// direcciones del usuario
		const [direcciones, setDirecciones] = useState<Array<any>>([])
		const [selectedDireccionId, setSelectedDireccionId] = useState<number | null>(null)

		// crear nueva dirección
		const [creatingAddress, setCreatingAddress] = useState(false)
		const [regiones, setRegiones] = useState<Array<any>>([])
		const [comunasForAddress, setComunasForAddress] = useState<Array<any>>([])
		const [selectedRegionForAddress, setSelectedRegionForAddress] = useState<number | null>(null)
		const [selectedComunaForAddress, setSelectedComunaForAddress] = useState<number | null>(null)
		const [newAddressCalle, setNewAddressCalle] = useState("")
		const [savingAddress, setSavingAddress] = useState(false)

		// jardines del usuario
		const [gardens, setGardens] = useState<Array<any>>([])
		const [selectedGardenId, setSelectedGardenId] = useState<number | null>(null)
		const [creatingGarden, setCreatingGarden] = useState(false)
		const [newGardenName, setNewGardenName] = useState("")
		const [savingGarden, setSavingGarden] = useState(false)
		const [newGardenArea, setNewGardenArea] = useState<string>("")
		const [newGardenSoilType, setNewGardenSoilType] = useState<string>("")
		const [newGardenDescription, setNewGardenDescription] = useState<string>("")
		const [newGardenImage, setNewGardenImage] = useState<File | null>(null)

		// editar jardín
		const [editingGardenId, setEditingGardenId] = useState<number | null>(null)
		const [editGardenName, setEditGardenName] = useState("")
		const [editGardenArea, setEditGardenArea] = useState("")
		const [editGardenSoilType, setEditGardenSoilType] = useState("")
		const [editGardenDescription, setEditGardenDescription] = useState("")
		const [editGardenImage, setEditGardenImage] = useState<File | null>(null)
		const [editSelectedDireccionId, setEditSelectedDireccionId] = useState<number | null>(null)
		const [savingEdit, setSavingEdit] = useState(false)

		// agendamiento
		const [servicios, setServicios] = useState<Array<any>>([])
		const [tecnicos, setTecnicos] = useState<Array<any>>([])
		const [selectedServicioId, setSelectedServicioId] = useState<number | null>(null)
		const [selectedTecnicoId, setSelectedTecnicoId] = useState<number | null>(null)
		const [selectedMes, setSelectedMes] = useState<string>("")
		const [slots, setSlots] = useState<Array<any>>([])
		const [loadingSlots, setLoadingSlots] = useState(false)
		const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null)
		const [reservando, setReservando] = useState(false)

		// edit controls
		const [isEditing, setIsEditing] = useState(false)
		const [savingProfile, setSavingProfile] = useState(false)
		const [originalProfile, setOriginalProfile] = useState<{ nombre?: string; apellido?: string; email?: string; telefono?: string } | null>(null)

		useEffect(() => {
			// intentar prefijar perfil si el usuario está autenticado
			async function loadProfile() {
				try {
					const res = await fetch(`${API}/profile`, { credentials: 'include' })
					if (!res.ok) return // no hay sesión
					const body = await res.json()
					const user = body?.user
					if (user) {
						setFirstName(user.nombre ?? "")
						setLastName(user.apellido ?? "")
						setEmail(user.email ?? "")
						setPhone(user.telefono ?? "")
						setClienteId(user.id ?? null)
						setOriginalProfile({ nombre: user.nombre ?? "", apellido: user.apellido ?? "", email: user.email ?? "", telefono: user.telefono ?? "" })
						setIsAuthenticated(true)

						// después de cargar perfil, cargar jardines del usuario
						try {
							const gRes = await fetch(`${API}/jardines`, { credentials: 'include' })
							if (gRes.ok) {
								const gBody = await gRes.json()
								const items = gBody?.jardines ?? gBody?.data ?? gBody ?? []
								setGardens(Array.isArray(items) ? items : [])
								if (Array.isArray(items) && items.length > 0) {
									// preseleccionar el primero si existe
									setSelectedGardenId(items[0].id ?? null)
								}
							}
						} catch (err) {
							console.debug('load gardens failed', err)
						}

						// cargar direcciones del usuario
						try {
							const dRes = await fetch(`${API}/direcciones`, { credentials: 'include' })
							if (dRes.ok) {
								const dBody = await dRes.json()
								const items = dBody?.direcciones ?? dBody?.data ?? dBody ?? []
								setDirecciones(Array.isArray(items) ? items : [])
							}
						} catch (err) {
							console.debug('load direcciones failed', err)
						}

						// cargar regiones
						try {
							const rRes = await fetch(`${API}/regiones`)
							if (rRes.ok) {
								const rBody = await rRes.json()
								setRegiones(Array.isArray(rBody) ? rBody : [])
							}
						} catch (err) {
							console.debug('load regiones failed', err)
						}

						// cargar servicios
						try {
							const sRes = await fetch(`${API}/servicios`)
							if (sRes.ok) {
								const sBody = await sRes.json()
								setServicios(Array.isArray(sBody) ? sBody : [])
							}
						} catch (err) {
							console.debug('load servicios failed', err)
						}

						// cargar jardineros
						try {
							const tRes = await fetch(`${API}/usuarios/buscar?rol=jardinero`, { credentials: 'include' })
							if (tRes.ok) {
								const tBody = await tRes.json()
								const jards = Array.isArray(tBody) ? tBody : []
								setTecnicos(jards)
							} else {
								// si la llamada autenticada falla (por ejemplo 401), intentar endpoint público
								try {
									const pub = await fetch(`${API}/public/jardineros`)
									if (pub.ok) {
										const pBody = await pub.json()
										setTecnicos(Array.isArray(pBody) ? pBody : [])
									}
								} catch (err) {
									console.debug('public jardineros load failed', err)
								}
							}
						} catch (err) {
							console.debug('load jardineros failed', err)
						}
					}
				} catch (err) {
					// no bloquear la carga de la página si falla
					console.debug('profile prefill failed', err)
				}
			}

			const init = async () => {
				try {
					await loadProfile()
				} finally {
					setLoading(false)
				}
			}
			init()
		}, [])

		// Cargar jardineros también en modo público si el usuario no está autenticado
		useEffect(() => {
			const loadJardinerosPublic = async () => {
				try {
					const tRes = await fetch(`${API}/usuarios/buscar?rol=jardinero`, { credentials: 'include' })
					if (tRes.ok) {
						const tBody = await tRes.json()
						setTecnicos(Array.isArray(tBody) ? tBody : [])
						return
					}
				} catch (err) {
					// ignore
				}
				// fallback público
				try {
					const pub = await fetch(`${API}/public/jardineros`)
					if (pub.ok) {
						const pBody = await pub.json()
						setTecnicos(Array.isArray(pBody) ? pBody : [])
					}
				} catch (err) {
					console.debug('public jardineros load failed', err)
				}
			}
			loadJardinerosPublic()
		}, [])

		// cargar comunas cuando cambia la región para nueva dirección
		useEffect(() => {
			if (selectedRegionForAddress) {
				fetch(`${API}/regiones/${selectedRegionForAddress}/comunas`)
					.then(res => res.json())
					.then(data => setComunasForAddress(Array.isArray(data) ? data : []))
					.catch(err => console.debug('load comunas failed', err))
			} else {
				setComunasForAddress([])
			}
		}, [selectedRegionForAddress])

	// Crear dirección
	async function createAddress() {
		if (!newAddressCalle || newAddressCalle.trim().length === 0) {
			setError('La calle no puede estar vacía')
			return
		}
		if (!selectedComunaForAddress) {
			setError('Debes seleccionar una comuna')
			return
		}
		setSavingAddress(true)
		try {
			const res = await fetch(`${API}/direcciones`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ calle: newAddressCalle, comuna_id: selectedComunaForAddress }) })
			if (!res.ok) throw new Error('No se pudo crear la dirección')
			const body = await res.json()
			const created = body?.direccion ?? body?.data ?? body
			if (created) {
				// recargar direcciones
				try {
					const dRes = await fetch(`${API}/direcciones`, { credentials: 'include' })
					if (dRes.ok) {
						const dBody = await dRes.json()
						const items = dBody?.direcciones ?? dBody?.data ?? dBody ?? []
						setDirecciones(Array.isArray(items) ? items : [])
						setSelectedDireccionId(created.id ?? null)
					}
				} catch (err) {
					console.debug('reload direcciones failed', err)
				}
				setNewAddressCalle('')
				setSelectedRegionForAddress(null)
				setSelectedComunaForAddress(null)
				setCreatingAddress(false)
			}
		} catch (err: any) {
			console.error(err)
			setError(err?.message ?? 'Error creando dirección')
		} finally {
			setSavingAddress(false)
		}
	}

	// Actualizar jardín
	async function updateGarden() {
		if (!editingGardenId) return
		if (!editGardenName || editGardenName.trim().length === 0) {
			setError('El nombre del jardín no puede estar vacío')
			return
		}
		if (!editSelectedDireccionId) {
			setError('Debes seleccionar una dirección')
			return
		}
		setSavingEdit(true)
		try {
			let imagen_url = null
			if (editGardenImage) {
				imagen_url = await uploadImageToSupabase(editGardenImage)
				if (!imagen_url) {
					setError('Error al subir la imagen')
					return
				}
			}
			const payload: any = { 
				nombre: editGardenName,
				direccion_id: editSelectedDireccionId
			}
			if (editGardenArea && editGardenArea.trim() !== '') {
				payload.area_m2 = Number(editGardenArea)
			}
			if (editGardenSoilType && editGardenSoilType.trim() !== '') payload.tipo_suelo = editGardenSoilType
			if (editGardenDescription && editGardenDescription.trim() !== '') payload.descripcion = editGardenDescription
			if (imagen_url) payload.imagen_url = imagen_url
			const res = await fetch(`${API}/jardines/${editingGardenId}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			if (!res.ok) throw new Error('No se pudo actualizar el jardín')
			// recargar jardines
			try {
				const gRes = await fetch(`${API}/jardines`, { credentials: 'include' })
				if (gRes.ok) {
					const gBody = await gRes.json()
					const items = gBody?.jardines ?? gBody?.data ?? gBody ?? []
					setGardens(Array.isArray(items) ? items : [])
				}
			} catch (err) {
				console.debug('reload gardens failed', err)
			}
			setEditingGardenId(null)
		} catch (err: any) {
			console.error(err)
			setError(err?.message ?? 'Error actualizando jardín')
		} finally {
			setSavingEdit(false)
		}
	}

		// cargar slots cuando cambia el jardinero seleccionado
		useEffect(() => {
			if (selectedTecnicoId) {
				setLoadingSlots(true)
				fetch(`${API}/disponibilidad-mensual?usuarioId=${selectedTecnicoId}`)
					.then(res => res.json())
					.then(data => {
						const allSlots = Array.isArray(data?.data) ? data.data : [];
						// Mostrar TODOS los slots del API (no filtrar por cupos disponibles)
						// La lógica de disponibilidad se maneja a nivel de slot individual
						const apiSlots = allSlots;

						console.log('All slots from API:', allSlots.length);

						// Crear un calendario completo PERO solo para días que tengan slots del API
						const calendarSlots: any[] = [];

						// Primero, identificar qué días tienen slots del API (independientemente de disponibilidad)
						const daysWithSlots = new Set<string>();
						apiSlots.forEach((slot: any) => {
							// Usar la hora de inicio del slot si está disponible para evitar
							// desplazamientos por zona horaria cuando `fecha` viene a medianoche UTC.
							const fecha = slot.hora_inicio ? new Date(slot.hora_inicio) : new Date(slot.fecha);
							const dateKey = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
							daysWithSlots.add(dateKey);
						});

						// Agregar TODOS los slots del API
						apiSlots.forEach((slot: any) => {
							calendarSlots.push(slot);
						});

						// Agregar días vacíos SOLO para fechas que tienen al menos un slot del API
						daysWithSlots.forEach(dateKey => {
							const [day, month, year] = dateKey.split('/').map(Number);
							const slotDate = new Date(year, month - 1, day);

							// Verificar si ya existe al menos un slot para este día
							const existingSlotsForDay = apiSlots.filter((slot: any) => {
								const slotDateCheck = slot.hora_inicio ? new Date(slot.hora_inicio) : new Date(slot.fecha);
								const slotDateKey = `${slotDateCheck.getDate().toString().padStart(2, '0')}/${(slotDateCheck.getMonth() + 1).toString().padStart(2, '0')}/${slotDateCheck.getFullYear()}`;
								return slotDateKey === dateKey;
							});

							// Si el día tiene menos slots de los esperados, agregar slots vacíos
							// Por ahora, simplificar: solo agregar un slot vacío si no hay ninguno
							if (existingSlotsForDay.length === 0) {
								calendarSlots.push({
									id: `empty-${dateKey}`,
									fecha: slotDate.toISOString().split('T')[0],
									hora_inicio: `${slotDate.toISOString().split('T')[0]}T12:00:00.000Z`,
									hora_fin: `${slotDate.toISOString().split('T')[0]}T13:00:00.000Z`,
									cupos_totales: 0,
									cupos_ocupados: 0,
									isEmpty: true,
									tecnico_id: selectedTecnicoId,
									usuario: { nombre: '', apellido: '' },
									citas: []
								} as any);
							}
						});

						console.log('Final calendar slots:', calendarSlots.length);
						setSlots(calendarSlots);
					})
					.catch(err => {
						console.debug('load slots failed', err)
						setLoadingSlots(false)
					})
					.finally(() => setLoadingSlots(false))
			} else {
				setSlots([])
			}
		}, [selectedTecnicoId])

	// Crear un jardín inline

	// Helper: nombre del día en español (minúscula)
	const weekdayName = (d: Date) => {
		const names = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
		return names[d.getDay()];
	}

	// Formatea una Date a: "lunes 03-11-2025"
	const formatDateLabelFromDate = (d: Date) => {
		const day = String(d.getDate()).padStart(2, '0');
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const year = d.getFullYear();
		return `${weekdayName(d)} ${day}-${month}-${year}`;
	}

	// Convierte una key "DD/MM/YYYY" a label "lunes DD-MM-YYYY"
	const formatDiaKeyToLabel = (dateKey: string) => {
		// dateKey esperado: "DD/MM/YYYY"
		const parts = dateKey.split('/').map(Number);
		if (parts.length !== 3) return dateKey;
		const [dd, mm, yyyy] = parts;
		const d = new Date(yyyy, mm - 1, dd);
		return formatDateLabelFromDate(d);
	}
	async function createGarden() {
		if (!newGardenName || newGardenName.trim().length === 0) {
			setError('El nombre del jardín no puede estar vacío')
			return
		}
		if (!selectedDireccionId) {
			setError('Debes seleccionar una dirección')
			return
		}
		setSavingGarden(true)
		try {
			let imagen_url = null
			if (newGardenImage) {
				imagen_url = await uploadImageToSupabase(newGardenImage)
				if (!imagen_url) {
					setError('Error al subir la imagen')
					return
				}
			}
			const payload: any = { nombre: newGardenName, direccion_id: selectedDireccionId }
			if (newGardenArea && newGardenArea.trim() !== '') {
				// enviar como string o number según backend; prisma espera Decimal
				payload.area_m2 = Number(newGardenArea)
			}
			if (newGardenSoilType && newGardenSoilType.trim() !== '') payload.tipo_suelo = newGardenSoilType
			if (newGardenDescription && newGardenDescription.trim() !== '') payload.descripcion = newGardenDescription
			if (imagen_url) payload.imagen_url = imagen_url
			const res = await fetch(`${API}/jardines`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			if (!res.ok) throw new Error('No se pudo crear el jardín')
			const body = await res.json()
			const created = body?.jardin ?? body?.data ?? body
			if (created) {
				// recargar jardines para obtener datos completos con imagen y dirección
				try {
					const gRes = await fetch(`${API}/jardines`, { credentials: 'include' })
					if (gRes.ok) {
						const gBody = await gRes.json()
						const items = gBody?.jardines ?? gBody?.data ?? gBody ?? []
						setGardens(Array.isArray(items) ? items : [])
						setSelectedGardenId(created.id ?? null)
					}
				} catch (err) {
					console.debug('reload gardens failed', err)
				}
				setNewGardenName('')
				setCreatingGarden(false)
				setSelectedDireccionId(null)
				setNewGardenArea('')
				setNewGardenSoilType('')
				setNewGardenDescription('')
				setNewGardenImage(null)
				setCreatingAddress(false)
				setNewAddressCalle('')
				setSelectedRegionForAddress(null)
				setSelectedComunaForAddress(null)
			}
		} catch (err: any) {
			console.error(err)
			setError(err?.message ?? 'Error creando jardín')
		} finally {
			setSavingGarden(false)
		}
	}

	// Reservar cita
	async function reservarCita() {
		if (!selectedGardenId || !selectedServicioId || !selectedSlotId || !clienteId) {
			setError('Faltan datos para reservar la cita')
			return
		}

		// Validar que el slot seleccionado aún sea válido
		const selectedSlot = slots.find(s => s.id === selectedSlotId)
		if (!selectedSlot) {
			setError('El horario seleccionado ya no está disponible')
			setSelectedSlotId(null)
			return
		}

		// Validar fecha y hora del slot
		const now = new Date()
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	// Para validaciones usar la hora de inicio (con hora) para evitar desplazamientos UTC
	const slotDate = selectedSlot.hora_inicio ? new Date(selectedSlot.hora_inicio) : new Date(selectedSlot.fecha)
	const slotDateOnly = new Date(slotDate.getFullYear(), slotDate.getMonth(), slotDate.getDate())
	const slotStartTime = new Date(selectedSlot.hora_inicio ?? selectedSlot.hora_inicio).getTime()

		const isFutureDate = slotDateOnly > today
		const isTodayWithFutureTime = slotDateOnly.getTime() === today.getTime() &&
			slotStartTime > (now.getTime() + 30 * 60 * 1000) // 30 minutos de margen

		if (!isFutureDate && !isTodayWithFutureTime) {
			setError('Este horario ya no está disponible (fecha/hora pasada)')
			setSelectedSlotId(null)
			return
		}

		// Verificar que tenga cupos disponibles
		if ((selectedSlot.cupos_ocupados ?? 0) >= (selectedSlot.cupos_totales ?? 1)) {
			setError('Este horario ya está ocupado')
			setSelectedSlotId(null)
			return
		}

		setReservando(true)
		try {
			const res = await fetch(`${API}/cita/reservar`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					disponibilidad_mensual_id: selectedSlotId,
					cliente_id: clienteId,
					jardin_id: selectedGardenId,
					servicio_id: selectedServicioId
				})
			})
			if (!res.ok) throw new Error('No se pudo reservar la cita')
			const body = await res.json()
			alert('Cita reservada exitosamente!')
			// resetear selecciones
			setSelectedServicioId(null)
			setSelectedTecnicoId(null)
			setSelectedMes('')
			setSlots([])
			setSelectedSlotId(null)
		} catch (err: any) {
			console.error(err)
			setError(err?.message ?? 'Error reservando cita')
		} finally {
			setReservando(false)
		}
	}

	// Página con solo el formulario de perfil prefijado
	if (loading) {
		return (
			<div className="min-h-screen bg-[#fefaf2] py-8 px-4 flex items-center justify-center">
				<div>Cargando...</div>
			</div>
		)
	}

	if (!isAuthenticated) {
		return (
			<div className="min-h-screen bg-[#fefaf2] py-8 px-4 flex items-center justify-center">
				<div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow text-center">
					<h1 className="mb-4 text-2xl font-bold text-[#2E5430]">Acceso requerido</h1>
					<p className="mb-6 text-gray-600">Para agendar una cita, necesitas iniciar sesión o crear una cuenta.</p>
					<div className="flex gap-4 justify-center">
						<button 
							onClick={() => router.push('/login')} 
							className="rounded bg-[#2E5430] px-4 py-2 text-white hover:bg-[#1f3a23]"
						>
							Iniciar sesión
						</button>
						<button 
							onClick={() => router.push('/register')} 
							className="rounded border border-[#2E5430] px-4 py-2 text-[#2E5430] hover:bg-[#2E5430] hover:text-white"
						>
							Crear cuenta
						</button>
					</div>
				</div>
			</div>
		)
	}

	return (
	 		<div className="min-h-screen bg-[#fefaf2] py-8 px-4">
	 			<div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow">
	 				<h1 className="mb-4 text-2xl font-bold text-[#2E5430]">Tus datos</h1>

	 				{loading && <div>Cargando...</div>}
	 				{error && <div className="text-red-600">{error}</div>}

	 				<div className="mb-6 rounded border p-4">
	 					<h2 className="text-lg font-semibold mb-3">Información de perfil</h2>
	 					<div className="grid grid-cols-2 gap-3">
	 						<input placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={!isEditing} className="rounded border px-3 py-2 bg-white disabled:opacity-60" />
	 						<input placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={!isEditing} className="rounded border px-3 py-2 bg-white disabled:opacity-60" />
	 						<input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isEditing} className="rounded border px-3 py-2 bg-white disabled:opacity-60" />
	 						<input placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isEditing} className="rounded border px-3 py-2 bg-white disabled:opacity-60" />
	 					</div>

	 					<div className="mt-3">
	 						{!isEditing ? (
	 							<button type="button" onClick={() => setIsEditing(true)} className="rounded bg-[#2E5430] px-3 py-2 text-white">Editar</button>
	 						) : (
	 							<div className="flex gap-2">
	 								<button type="button" onClick={async () => {
	 									setSavingProfile(true)
	 									try {
	 										const res = await fetch(`${API}/profile`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: firstName, apellido: lastName, email, telefono: phone }) })
	 										if (!res.ok) throw new Error('No se pudo guardar perfil')
	 										const body = await res.json()
	 										const user = body?.user
	 										if (user) {
	 											setFirstName(user.nombre ?? firstName)
	 											setLastName(user.apellido ?? lastName)
	 											setEmail(user.email ?? email)
	 											setPhone(user.telefono ?? phone)
	 											setOriginalProfile({ nombre: user.nombre ?? firstName, apellido: user.apellido ?? lastName, email: user.email ?? email, telefono: user.telefono ?? phone })
	 										}
	 										setIsEditing(false)
	 									} catch (err: any) {
	 										console.error(err)
	 										setError(err?.message ?? 'Error guardando perfil')
	 									} finally {
	 										setSavingProfile(false)
	 									}
	 								}} className="rounded bg-green-600 px-3 py-2 text-white" disabled={savingProfile}>{savingProfile ? 'Guardando...' : 'Guardar'}</button>
	 								<button type="button" onClick={() => {
	 									// restaurar valores originales
	 									if (originalProfile) {
	 										setFirstName(originalProfile.nombre ?? "")
	 										setLastName(originalProfile.apellido ?? "")
	 										setEmail(originalProfile.email ?? "")
	 										setPhone(originalProfile.telefono ?? "")
	 									}
	 									setIsEditing(false)
	 								}} className="rounded border px-3 py-2">Cancelar</button>
	 							</div>
	 						)}
	 					</div>
	 				</div>

					<section className="mb-6">
						<h2 className="text-lg font-semibold mb-3">Jardines</h2>
						<p className="mb-3">Escoge el jardín donde quieres que se realice el servicio</p>
						{gardens.length > 0 ? (
							<div className="space-y-4">
								{gardens.map((garden) => (
									<div key={garden.id} className={`border rounded p-4 ${selectedGardenId === garden.id ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
										<div className="flex items-start gap-4">
											{editingGardenId === garden.id ? (
												<div className="flex-1 space-y-3">
													<input placeholder="Nombre" value={editGardenName} onChange={(e) => setEditGardenName(e.target.value)} className="w-full rounded border px-3 py-2" />
													<input placeholder="Área (m²)" type="number" step="0.01" value={editGardenArea} onChange={(e) => setEditGardenArea(e.target.value)} className="w-full rounded border px-3 py-2" />
													<input placeholder="Tipo de suelo" value={editGardenSoilType} onChange={(e) => setEditGardenSoilType(e.target.value)} className="w-full rounded border px-3 py-2" />
													<textarea placeholder="Descripción" value={editGardenDescription} onChange={(e) => setEditGardenDescription(e.target.value)} className="w-full rounded border px-3 py-2" />
													<input type="file" accept="image/*" onChange={(e) => setEditGardenImage(e.target.files?.[0] || null)} className="w-full rounded border px-3 py-2" />
													<select value={editSelectedDireccionId ?? ''} onChange={(e) => setEditSelectedDireccionId(e.target.value ? Number(e.target.value) : null)} className="w-full rounded border px-3 py-2">
														<option value="">Selecciona una dirección</option>
														{direcciones.map((dir) => (
															<option key={dir.id} value={dir.id}>{dir.calle}, {dir.comuna.nombre}, {dir.comuna.region.nombre}</option>
														))}
													</select>
													<div className="flex gap-2">
														<button type="button" onClick={updateGarden} disabled={savingEdit} className="rounded bg-blue-600 px-3 py-2 text-white">{savingEdit ? 'Guardando...' : 'Guardar'}</button>
														<button type="button" onClick={() => setEditingGardenId(null)} className="rounded border px-3 py-2">Cancelar</button>
													</div>
												</div>
											) : (
												<>
													{garden.imagen?.url_publica && (
														<img src={garden.imagen.url_publica} alt={garden.nombre} className="w-20 h-20 object-cover rounded" />
													)}
													<div className="flex-1">
														<h3 className="font-semibold">{garden.nombre}</h3>
														<p><strong>Área:</strong> {garden.area_m2} m²</p>
														<p><strong>Tipo de suelo:</strong> {garden.tipo_suelo}</p>
														<p><strong>Dirección:</strong> {garden.direccion ? `${garden.direccion.calle}, ${garden.direccion.comuna.nombre}, ${garden.direccion.comuna.region.nombre}` : 'Sin dirección'}</p>
														<p><strong>Descripción:</strong> {garden.descripcion}</p>
													</div>
													<div className="flex flex-col gap-2">
														<button 
															type="button" 
															onClick={() => setSelectedGardenId(garden.id)} 
															className={`px-3 py-1 rounded text-sm ${selectedGardenId === garden.id ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
														>
															{selectedGardenId === garden.id ? 'Seleccionado' : 'Seleccionar'}
														</button>
														<button 
															type="button" 
															onClick={() => {
																setEditingGardenId(garden.id)
																setEditGardenName(garden.nombre)
																setEditGardenArea(garden.area_m2.toString())
																setEditGardenSoilType(garden.tipo_suelo)
																setEditGardenDescription(garden.descripcion)
																setEditGardenImage(null)
																setEditSelectedDireccionId(garden.direccion_id)
															}} 
															className="px-3 py-1 rounded text-sm bg-yellow-500 text-white"
														>
															Editar
														</button>
													</div>
												</>
											)}
										</div>
									</div>
								))}
								<button type="button" onClick={() => setCreatingGarden(true)} className="rounded bg-[#2E5430] px-3 py-2 text-white">Crear jardín</button>
							</div>
						) : (
							<div>
								<div className="text-sm text-gray-600 mb-2">No tienes jardines asignados.</div>
								{!creatingGarden ? (
									<button type="button" onClick={() => setCreatingGarden(true)} className="rounded bg-[#2E5430] px-3 py-2 text-white">Crear jardín</button>
								) : null}
							</div>
						)}

							{creatingGarden && (
								<div className="mt-3 space-y-3">
									<div className="grid grid-cols-2 gap-3">
										<input placeholder="Nombre del jardín" value={newGardenName} onChange={(e) => setNewGardenName(e.target.value)} className="rounded border px-3 py-2" />
										<input placeholder="Área (m²)" type="number" step="0.01" value={newGardenArea} onChange={(e) => setNewGardenArea(e.target.value)} className="rounded border px-3 py-2" />
									</div>
									<div className="grid grid-cols-2 gap-3">
										<input placeholder="Tipo de suelo" value={newGardenSoilType} onChange={(e) => setNewGardenSoilType(e.target.value)} className="rounded border px-3 py-2" />
										<input type="file" accept="image/*" onChange={(e) => setNewGardenImage(e.target.files?.[0] || null)} className="rounded border px-3 py-2" />
									</div>
									<textarea placeholder="Descripción" value={newGardenDescription} onChange={(e) => setNewGardenDescription(e.target.value)} className="w-full rounded border px-3 py-2" />
									<div className="grid grid-cols-1 gap-3">
										<label className="block text-sm font-medium">Dirección *</label>
										<select value={selectedDireccionId ?? ''} onChange={(e) => setSelectedDireccionId(e.target.value ? Number(e.target.value) : null)} className="rounded border px-3 py-2" required>
											<option value="">Selecciona una dirección</option>
											{direcciones.map((dir) => (
												<option key={dir.id} value={dir.id}>{dir.calle}, {dir.comuna.nombre}, {dir.comuna.region.nombre}</option>
											))}
										</select>
										{!creatingAddress ? (
											<button type="button" onClick={() => setCreatingAddress(true)} className="text-sm text-blue-600 underline">Agregar nueva dirección</button>
										) : null}
									</div>

									{creatingAddress && (
										<div className="mt-3 p-3 border rounded bg-gray-50">
											<h4 className="font-semibold mb-2">Nueva dirección</h4>
											<div className="grid grid-cols-1 gap-3">
												<input placeholder="Calle" value={newAddressCalle} onChange={(e) => setNewAddressCalle(e.target.value)} className="rounded border px-3 py-2" />
												<select value={selectedRegionForAddress ?? ''} onChange={(e) => setSelectedRegionForAddress(e.target.value ? Number(e.target.value) : null)} className="rounded border px-3 py-2">
													<option value="">Selecciona región</option>
													{regiones.map((reg) => (
														<option key={reg.id} value={reg.id}>{reg.nombre}</option>
													))}
												</select>
												<select value={selectedComunaForAddress ?? ''} onChange={(e) => setSelectedComunaForAddress(e.target.value ? Number(e.target.value) : null)} className="rounded border px-3 py-2" disabled={!selectedRegionForAddress}>
													<option value="">Selecciona comuna</option>
													{comunasForAddress.map((com) => (
														<option key={com.id} value={com.id}>{com.nombre}</option>
													))}
												</select>
												<div className="flex gap-2">
													<button type="button" onClick={createAddress} disabled={savingAddress} className="rounded bg-green-600 px-3 py-2 text-white">{savingAddress ? 'Creando...' : 'Crear dirección'}</button>
													<button type="button" onClick={() => { setCreatingAddress(false); setNewAddressCalle(''); setSelectedRegionForAddress(null); setSelectedComunaForAddress(null) }} className="rounded border px-3 py-2">Cancelar</button>
												</div>
											</div>
										</div>
									)}
									<div className="flex gap-2">
										<button type="button" onClick={createGarden} disabled={savingGarden} className="rounded bg-green-600 px-3 py-2 text-white">{savingGarden ? 'Creando...' : 'Crear'}</button>
										<button type="button" onClick={() => { setCreatingGarden(false); setNewGardenName(''); setNewGardenArea(''); setNewGardenSoilType(''); setNewGardenDescription(''); setNewGardenImage(null); setSelectedDireccionId(null); setCreatingAddress(false); setNewAddressCalle(''); setSelectedRegionForAddress(null); setSelectedComunaForAddress(null) }} className="rounded border px-3 py-2">Cancelar</button>
									</div>
								</div>
							)}
					</section>

					{/* Sección de Agendamiento */}
					<section className="mb-6">
						<h2 className="text-lg font-semibold mb-3">Agendar Cita</h2>
						<p className="mb-3">Selecciona el servicio, técnico, fecha y hora para tu cita</p>

						<div className="space-y-4">
							{/* Seleccionar Servicio */}
							<div>
								<label className="block text-sm font-medium mb-1">Servicio *</label>
								<select 
									value={selectedServicioId ?? ''} 
									onChange={(e) => {
										const id = e.target.value ? Number(e.target.value) : null
										setSelectedServicioId(id)
										setSelectedTecnicoId(null)
										setSelectedMes('')
										setSlots([])
										setSelectedSlotId(null)
									}} 
									className="w-full rounded border px-3 py-2"
								>
									<option value="">Selecciona un servicio</option>
									{servicios.map((serv) => (
										<option key={serv.id} value={serv.id}>{serv.title} - ${serv.precio}</option>
									))}
								</select>
							</div>

							{/* Seleccionar Jardinero */}
							<div>
								<label className="block text-sm font-medium mb-1">Jardinero *</label>
								<select 
									value={selectedTecnicoId ?? ''} 
									onChange={(e) => {
										const id = e.target.value ? Number(e.target.value) : null
										setSelectedTecnicoId(id)
										setSelectedMes('')
										setSlots([])
										setSelectedSlotId(null)
									}} 
									className="w-full rounded border px-3 py-2" 
									disabled={!selectedServicioId}
								>
									<option value="">Selecciona un jardinero</option>
									{tecnicos.map((tec) => (
										<option key={tec.id} value={tec.id}>{tec.nombre} {tec.apellido}</option>
									))}
								</select>
							</div>

							{/* Seleccionar Mes */}
							{/* Calendario de Disponibilidad Real */}
							{selectedTecnicoId && (
								<div className="mt-6">
									<label className="block text-sm font-medium mb-2">Disponibilidad del jardinero</label>
									{loadingSlots ? (
										<div className="flex items-center justify-center p-8">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
											<span className="ml-2 text-gray-600">Cargando horarios...</span>
										</div>
									) : slots.length > 0 ? (
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
										 {Object.entries(
											 slots.reduce((acc: Record<string, any[]>, slot: any) => {
												 // Usar hora de inicio si está disponible para calcular el día local
												 const fecha = slot.hora_inicio ? new Date(slot.hora_inicio) : new Date(slot.fecha);
												 const diaKey = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
												 if (!acc[diaKey]) acc[diaKey] = []
												 acc[diaKey].push(slot)
												 return acc
											 }, {} as Record<string, any[]>)
										 ).map(([dia, daySlots]) => {
											 return (
											 <div key={dia} className="border rounded p-3 bg-gray-50">
												 <div className="font-semibold mb-3 text-center bg-green-100 text-green-800 px-2 py-1 rounded">
													 {formatDiaKeyToLabel(dia)}
												 </div>
												 <div className="space-y-2">
										  {(daySlots as any[]).map((slot) => {
											  const slotStart = slot.hora_inicio ? new Date(slot.hora_inicio) : new Date(slot.fecha);
											  const slotEnd = slot.hora_fin ? new Date(slot.hora_fin) : null;
											  const horaInicio = slotStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
											  const horaFin = slotEnd ? slotEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
											  const isAvailable = (slot.cupos_ocupados ?? 0) < (slot.cupos_totales ?? 1);
											  const hasCitas = slot.citas && slot.citas.length > 0;
											  const isEmpty = slot.isEmpty;
											  // Validación temporal: no permitir agendar si la hora ya pasó o está dentro del margen mínimo
											  const nowMs = Date.now();
											  const marginMs = 30 * 60 * 1000; // 30 minutos
											  const isTooSoonOrPast = slotStart.getTime() <= (nowMs + marginMs);

														 if (isEmpty) {
															 return (
																 <div
																	 key={slot.id}
																	 className="p-3 border rounded bg-gray-100 cursor-not-allowed"
																 >
																	 <div className="text-sm font-medium text-gray-500">
																		 Sin horarios disponibles
																	 </div>
																	 <div className="text-xs text-gray-400 mt-1">
																		 No hay disponibilidad este día
																	 </div>
																 </div>
															 );
														 }

																 const isSelectable = isAvailable && !isTooSoonOrPast && !isEmpty;
																 return (
																	 <div
																		 key={slot.id}
																		 onClick={() => isSelectable && setSelectedSlotId(slot.id)}
																		 className={`p-3 border rounded ${isSelectable ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed'} transition-colors ${
																			 selectedSlotId === slot.id 
																				 ? 'border-green-500 bg-green-50' 
																				 : isSelectable 
																					 ? 'border-gray-300' 
																					 : 'border-red-300 bg-red-50'
																		 }`}
																	 >
																		 <div className="text-sm font-medium">
																			 {horaInicio}{horaFin ? ` - ${horaFin}` : ''}
																		 </div>
																		 {hasCitas ? (
																			 <div className="text-xs text-red-600 mt-1">
																				 <div className="font-medium">Reservado</div>
																				 {slot.citas.map((cita: any) => (
																					 <div key={cita.id} className="mt-1">
																						 <div>{cita.servicio?.nombre}</div>
																						 <div className="text-gray-500">{cita.jardin?.nombre}</div>
																					 </div>
																				 ))}
																			 </div>
																		 ) : isTooSoonOrPast ? (
																			 <div className="text-xs text-gray-600 mt-1">
																				 Horario no disponible (hora pasada o muy próxima)
																			 </div>
																		 ) : (
																			 <div className="text-xs text-gray-600 mt-1">
																				 {slot.cupos_totales - (slot.cupos_ocupados || 0)} cupos disponibles
																			 </div>
																		 )}
																	 </div>
																 );
													 })}
												 </div>
											 </div>
											 );
										 })}
									</div>
									) : (
										<div className="text-center p-4 text-gray-500">
											No hay horarios disponibles
										</div>
									)}
								</div>
							)}

							{/* Lista de Slots Disponibles */}
							{selectedTecnicoId && (
								<div>
									<label className="block text-sm font-medium mb-1">Horarios Disponibles *</label>
									{loadingSlots ? (
										<div className="flex items-center justify-center p-4 border rounded bg-gray-50">
											<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
											<span className="ml-2 text-gray-600 text-sm">Cargando horarios...</span>
										</div>
									) : slots.filter(s => !s.isEmpty).length > 0 ? (
										<div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border rounded p-2 bg-gray-50">
											{slots.filter(s => !s.isEmpty).map((slot) => {
												const slotStart = slot.hora_inicio ? new Date(slot.hora_inicio) : new Date(slot.fecha);
												const slotEnd = slot.hora_fin ? new Date(slot.hora_fin) : null;
												const fechaFormateada = formatDateLabelFromDate(slotStart);
												const horaInicio = slotStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
												const horaFin = slotEnd ? slotEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
												const isAvailable = (slot.cupos_ocupados ?? 0) < (slot.cupos_totales ?? 1);
												const hasCitas = slot.citas && slot.citas.length > 0;
												const nowMs = Date.now();
												const marginMs = 30 * 60 * 1000; // 30 minutos
												const isTooSoonOrPast = slotStart.getTime() <= (nowMs + marginMs);
												const isSelectable = isAvailable && !isTooSoonOrPast;
												return (
													<div
														key={slot.id}
														onClick={() => isSelectable && setSelectedSlotId(slot.id)}
														className={`p-3 border rounded ${isSelectable ? 'cursor-pointer hover:bg-white' : 'cursor-not-allowed'} transition-colors ${
															selectedSlotId === slot.id 
																? 'border-green-500 bg-green-50' 
																: isSelectable 
																	? 'border-gray-300' 
																	: 'border-red-300 bg-red-50'
														}`}
													>
														<div className="flex justify-between items-center">
															<div>
																<div className="font-medium">{fechaFormateada}</div>
																<div className="text-sm text-gray-600">{horaInicio}{horaFin ? ` - ${horaFin}` : ''}</div>
																{hasCitas ? (
																	<div className="text-xs text-red-600 mt-1">
																		<div className="font-medium">Reservado</div>
																		{slot.citas.map((cita: any) => (
																			<div key={cita.id} className="mt-1">
																				<div>{cita.servicio?.nombre}</div>
																				<div className="text-gray-500">{cita.jardin?.nombre}</div>
																			</div>
																		))}
																	</div>
																) : isTooSoonOrPast ? (
																	<div className="text-xs text-gray-600 mt-1">
																		Horario no disponible (hora pasada o muy próxima)
																	</div>
																) : (
																	<div className="text-xs text-gray-500 mt-1">
																		{slot.cupos_totales - (slot.cupos_ocupados || 0)} cupos disponibles
																	</div>
																)}
															</div>
														</div>
													</div>
												);
											})}
									</div>
									) : (
										<div className="text-center p-4 text-gray-500 border rounded bg-gray-50">
											No hay horarios disponibles para seleccionar
										</div>
									)}
								</div>
							)}

							{/* Botón Reservar */}
							{selectedSlotId && (
								<button 
									type="button" 
									onClick={reservarCita} 
									disabled={reservando} 
									className="w-full rounded bg-[#2E5430] px-4 py-3 text-white font-semibold disabled:opacity-50"
								>
									{reservando ? 'Reservando...' : 'Reservar Cita'}
								</button>
							)}
						</div>
					</section>

				</div>
	 		</div>
	)
}


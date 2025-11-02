"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

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
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

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
					}
				} catch (err) {
					// no bloquear la carga de la página si falla
					console.debug('profile prefill failed', err)
				}
			}

			loadProfile()
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

	// Crear un jardín inline
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
	}	// Página con solo el formulario de perfil prefijado
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

				</div>
	 		</div>
	)
}


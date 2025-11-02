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
					}
				} catch (err) {
					// no bloquear la carga de la página si falla
					console.debug('profile prefill failed', err)
				}
			}

			loadProfile()
		}, [])

	// Crear un jardín inline
	async function createGarden() {
		if (!newGardenName || newGardenName.trim().length === 0) {
			setError('El nombre del jardín no puede estar vacío')
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
			const payload: any = { nombre: newGardenName }
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
				setGardens((p) => [created, ...p])
				setSelectedGardenId(created.id ?? null)
				setNewGardenName('')
				setCreatingGarden(false)
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
						<h2 className="text-lg font-semibold mb-3">Jardín</h2>
						{gardens.length > 0 ? (
							<div className="flex items-center gap-3">
								<select value={selectedGardenId ?? ''} onChange={(e) => setSelectedGardenId(e.target.value ? Number(e.target.value) : null)} className="rounded border px-3 py-2">
									{gardens.map((g) => (
										<option key={g.id} value={g.id}>{g.nombre ?? g.name ?? `Jardín ${g.id}`}</option>
									))}
								</select>
								<button type="button" onClick={() => setCreatingGarden(true)} className="rounded border px-3 py-2">Crear jardín</button>
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
									<div className="flex gap-2">
										<button type="button" onClick={createGarden} disabled={savingGarden} className="rounded bg-green-600 px-3 py-2 text-white">{savingGarden ? 'Creando...' : 'Crear'}</button>
										<button type="button" onClick={() => { setCreatingGarden(false); setNewGardenName(''); setNewGardenArea(''); setNewGardenSoilType(''); setNewGardenDescription(''); setNewGardenImage(null) }} className="rounded border px-3 py-2">Cancelar</button>
									</div>
								</div>
							)}
					</section>

				</div>
	 		</div>
	)
}


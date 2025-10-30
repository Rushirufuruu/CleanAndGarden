"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function BookAppointmentPage() {
	const router = useRouter()
	const [firstName, setFirstName] = useState("")
	const [lastName, setLastName] = useState("")
	const [email, setEmail] = useState("")
	const [phone, setPhone] = useState("")
	const [services, setServices] = useState<string[]>(["Poda"])
	const [selectedService, setSelectedService] = useState<string>(services[0])
	const [locations, setLocations] = useState<string[]>(["Casa"])
	const [selectedLocation, setSelectedLocation] = useState<string>(locations[0])
	const [date, setDate] = useState("")
	const [time, setTime] = useState("")
	const [notes, setNotes] = useState("")
	const [error, setError] = useState("")
	const [success, setSuccess] = useState("")

	function formatDateTime(d: string, t: string) {
		if (!d || !t) return ""
		try {
			const dt = new Date(`${d}T${t}`)
			const datePart = dt.toLocaleDateString("es-ES", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
			})
			const timePart = dt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
			return `${datePart} - ${timePart}`
		} catch {
			return ""
		}
	}

	const handleAddService = () => {
		const s = prompt("Nombre del servicio a agregar (ej. Acarreo)")
		if (s && s.trim()) {
			setServices((prev) => {
				const next = [...prev, s.trim()]
				setSelectedService(s.trim())
				return next
			})
		}
	}

	const handleAddLocation = () => {
		const l = prompt("Agregar nueva dirección (ej. Oficina)")
		if (l && l.trim()) {
			setLocations((prev) => {
				const next = [...prev, l.trim()]
				setSelectedLocation(l.trim())
				return next
			})
		}
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		setError("")
		setSuccess("")

		if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !selectedService || !selectedLocation || !date || !time) {
			setError("Por favor completa todos los campos obligatorios (*).")
			return
		}

		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
			setError("Correo electrónico inválido")
			return
		}

		const formatted = formatDateTime(date, time)
		setSuccess(`Cita agendada para ${formatted}. Te contactaremos por ${email}.`)

		// Reset form values
		setFirstName("")
		setLastName("")
		setEmail("")
		setPhone("")
		setDate("")
		setTime("")
		setNotes("")

		// En un flujo real aquí haríamos POST al backend y posiblemente router.push
		// router.push('/')
	}

	return (
		<div className="min-h-screen bg-[#fefaf2] py-8 px-4">
			<div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-lg">
				<h1 className="mb-4 text-3xl font-extrabold text-[#2E5430]">Agendar una hora</h1>

				{error && <div className="mb-3 rounded bg-red-50 p-3 text-red-700">{error}</div>}
				{success && <div className="mb-3 rounded bg-green-50 p-3 text-green-700">{success}</div>}

				<form onSubmit={handleSubmit} className="space-y-6">
					<section>
						<h2 className="mb-3 text-lg font-semibold text-gray-700">Identificación</h2>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="mb-1 block text-sm font-medium text-gray-600">Nombre*</label>
								<input
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
									className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E5430]/30"
									placeholder="Álvaro"
								/>
							</div>

							<div>
								<label className="mb-1 block text-sm font-medium text-gray-600">Apellido*</label>
								<input
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
									className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E5430]/30"
									placeholder="Morales"
								/>
							</div>
						</div>

						<div className="mt-3">
							<label className="mb-1 block text-sm font-medium text-gray-600">Correo electrónico*</label>
							<input
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E5430]/30"
								placeholder="tu@correo.com"
							/>
						</div>

						<div className="mt-3">
							<label className="mb-1 block text-sm font-medium text-gray-600">Teléfono*</label>
							<input
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E5430]/30"
								placeholder="954993343"
							/>
						</div>

						<div className="mt-3">
							<label className="mb-1 block text-sm font-medium text-gray-600">Tipo de servicio*</label>
							<div className="flex items-center gap-2">
								<select
									value={selectedService}
									onChange={(e) => setSelectedService(e.target.value)}
									className="flex-1 rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E5430]/30"
								>
									{services.map((s) => (
										<option key={s} value={s}>{s}</option>
									))}
								</select>
								<button type="button" onClick={handleAddService} className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#E7F3EA] text-[#2E5430] hover:bg-[#dff0df]">+</button>
							</div>
						</div>
					</section>

					<section>
						<h3 className="mb-2 text-sm font-semibold text-gray-700">Ubicación de atención</h3>
						<label className="mb-1 block text-sm font-medium text-gray-600">Dirección guardada*</label>
						<div className="flex items-center gap-2">
							<select
								value={selectedLocation}
								onChange={(e) => setSelectedLocation(e.target.value)}
								className="flex-1 rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E5430]/30"
							>
								{locations.map((l) => (
									<option key={l} value={l}>{l}</option>
								))}
							</select>
						</div>
						<button type="button" onClick={handleAddLocation} className="mt-2 text-sm text-[#2E5430]">+ Agregar nueva dirección</button>
					</section>

					<section>
						<h3 className="mb-2 text-sm font-semibold text-gray-700">Fecha y hora de atención</h3>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="mb-1 block text-sm font-medium text-gray-600">Fecha*</label>
								<input
									type="date"
									value={date}
									onChange={(e) => setDate(e.target.value)}
									className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E5430]/30"
								/>
							</div>
							<div>
								<label className="mb-1 block text-sm font-medium text-gray-600">Hora*</label>
								<input
									type="time"
									value={time}
									onChange={(e) => setTime(e.target.value)}
									className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E5430]/30"
								/>
							</div>
						</div>

						<div className="mt-3">
							<label className="mb-1 block text-sm font-medium text-gray-600">Fecha seleccionada</label>
							<input readOnly value={formatDateTime(date, time)} placeholder="01/09/2025 - 10:00" className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700" />
						</div>
					</section>

					<section>
						<label className="mb-1 block text-sm font-medium text-gray-600">Notas adicionales</label>
						<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E5430]/30" />
					</section>

					<p className="text-xs text-gray-500">Puedes modificar tu cita hasta 24 horas antes. Fuera de ese plazo solo un administrador podrá reprogramar tu cita o deberás cancelarla.</p>

					<div>
						<button type="submit" className="w-full rounded-full bg-[#2E5430] px-4 py-3 text-white hover:bg-[#234624]">Agendar</button>
					</div>
				</form>
			</div>
		</div>
	)
}

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react"; 

interface Region {
  id: string;
  nombre: string;
}

interface Comuna {
  id: string;
  nombre: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    confpassword: "",
    telefono: "",
    direccion: "",
    comunaId: "",
    terminos: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfPassword, setShowConfPassword] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "">("");

  const [regiones, setRegiones] = useState<Region[]>([]);
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [regionId, setRegionId] = useState("");

  // 🔒 Validar formato de contraseña segura
  const validarPassword = (password: string) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
    return regex.test(password);
  };

  // Cargar regiones al inicio
  useEffect(() => {
    fetch("http://localhost:3001/regiones")
      .then((res) => res.json())
      .then((data) => setRegiones(data))
      .catch(() => {
        setMensaje("No se pudieron cargar las regiones");
        setTipoMensaje("error");
      });
  }, []);

  // Cargar comunas cuando cambia la región
  useEffect(() => {
    if (regionId) {
      fetch(`http://localhost:3001/regiones/${regionId}/comunas`)
        .then((res) => res.json())
        .then((data) => setComunas(data))
        .catch(() => {
          setMensaje("No se pudieron cargar las comunas");
          setTipoMensaje("error");
        });
    } else {
      setComunas([]);
      setForm((prev) => ({ ...prev, comunaId: "" }));
    }
  }, [regionId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formElement = e.currentTarget;
    if (!formElement.reportValidity()) return; // ✅ valida todos los campos HTML5

    setMensaje("");
    setTipoMensaje("");

    // 🚫 Validación manual adicional por seguridad
    if (
      !form.nombre.trim() ||
      !form.apellido.trim() ||
      !form.email.trim() ||
      !form.password.trim() ||
      !form.confpassword.trim() ||
      !form.telefono.trim() ||
      !form.direccion.trim() ||
      !regionId ||
      !form.comunaId
    ) {
      setMensaje("Por favor completa todos los campos obligatorios");
      setTipoMensaje("error");
      return;
    }

    // 🔢 Validar número de teléfono (debe tener +569 + 8 dígitos)
    if (form.telefono.length < 12) {
      setMensaje("El número de teléfono no es válido (+569XXXXXXXX)");
      setTipoMensaje("error");
      return;
    }

    // 🔑 Contraseñas iguales
    if (form.password !== form.confpassword) {
      setMensaje("Las contraseñas no coinciden");
      setTipoMensaje("error");
      return;
    }

    // 🔐 Contraseña segura
    if (!validarPassword(form.password)) {
      setMensaje(
        "La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula, un número y un carácter especial."
      );
      setTipoMensaje("error");
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/usuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data?.error || "Error al registrar usuario");
        setTipoMensaje("error");
        return;
      }

      setMensaje(data?.message || "Tu cuenta fue creada correctamente");
      setTipoMensaje("success");

      // 🔁 Resetear formulario
      setForm({
        nombre: "",
        apellido: "",
        email: "",
        password: "",
        confpassword: "",
        telefono: "",
        direccion: "",
        comunaId: "",
        terminos: false,
      });
      setRegionId("");
      setShowPassword(false);
      setShowConfPassword(false);

      // Redirección al login
      setTimeout(() => router.push("/login"), 2500);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Ocurrió un error inesperado";
      setMensaje(message);
      setTipoMensaje("error");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#fefaf2]">
      <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-md">
        <h1 className="mb-6 text-3xl font-bold text-center text-[#2E5430]">
          Registro
        </h1>

        {mensaje && (
          <div
            className={`p-3 mb-4 rounded-md text-center ${
              tipoMensaje === "success"
                ? "bg-green-100 text-green-700 border border-green-400"
                : "bg-red-100 text-red-700 border border-red-400"
            }`}
          >
            {mensaje}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre y Apellido */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="text"
              name="nombre"
              placeholder="Nombre*"
              value={form.nombre}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2"
              required
            />
            <input
              type="text"
              name="apellido"
              placeholder="Apellido*"
              value={form.apellido}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>

          {/* Correo */}
          <input
            type="email"
            name="email"
            placeholder="Correo electrónico*"
            value={form.email}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md p-2"
            required
          />

          {/* Contraseñas */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Contraseña */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Contraseña*"
                value={form.password}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-[#2E5430] transition-colors"
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
              <small className="text-gray-500 text-xs block mt-1">
                Mínimo 8 caracteres, una mayúscula, una minúscula, un número y
                un carácter especial.
              </small>
            </div>

            {/* Confirmar contraseña */}
            <div className="relative">
              <input
                type={showConfPassword ? "text" : "password"}
                name="confpassword"
                placeholder="Confirma contraseña*"
                value={form.confpassword}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfPassword(!showConfPassword)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-[#2E5430] transition-colors"
              >
                {showConfPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          {/* Teléfono */}
          <input
            type="tel"
            name="telefono"
            placeholder="+569XXXXXXXX"
            value={form.telefono}
            onChange={(e) => {
              let value = e.target.value;
              if (!value.startsWith("+569")) {
                value = "+569" + value.replace(/[^0-9]/g, "");
              }
              if (value.length > 12) value = value.slice(0, 12);
              setForm({ ...form, telefono: value });
            }}
            className="w-full border border-gray-300 rounded-md p-2"
            required
          />

          {/* Dirección */}
          <input
            type="text"
            name="direccion"
            placeholder="Dirección*"
            value={form.direccion}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md p-2"
            required
          />

          {/* Región y Comuna */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
              required
            >
              <option value="">Escoge una región</option>
              {regiones.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>

            <select
              name="comunaId"
              value={form.comunaId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2"
              required
              disabled={!regionId}
            >
              <option value="">Escoge una comuna</option>
              {comunas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Términos */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="terminos"
              checked={!!form.terminos}
              onChange={handleChange}
              className="checkbox checkbox-success"
              required
            />
            <span>
              Acepto los{" "}
              <a href="/terminos-y-condiciones" className="text-[#2E5430] underline">
                términos y condiciones
              </a>
            </span>
          </div>

          <button
            type="submit"
            className="w-full py-2 text-white rounded-md bg-[#2E5430] hover:bg-green-700 transition-colors"
          >
            Crear cuenta
          </button>
        </form>
      </div>
    </div>
  );
}
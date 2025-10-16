"use client";
import { useState } from "react";

export default function CrearJardineroPage() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
  });

  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "">("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErrores((prev) => ({ ...prev, [name]: "" }));
  };

  const validarFormulario = () => {
    const newErrors: Record<string, string> = {};

    if (!form.nombre.trim()) newErrors.nombre = "El nombre es obligatorio.";
    if (!form.apellido.trim()) newErrors.apellido = "El apellido es obligatorio.";
    if (!form.email.trim()) newErrors.email = "El correo electrónico es obligatorio.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Formato de correo inválido.";

    setErrores(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMensaje("");
    setTipoMensaje("");
    setErrores({});

    if (!validarFormulario()) return;

    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/admin/registro-jardinero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setMensaje(data.error || "Error al crear jardinero");
        return;
      }

      setTipoMensaje("success");
      setMensaje(data.message || "Jardinero creado correctamente ✅");

      setForm({
        nombre: "",
        apellido: "",
        email: "",
      });
    } catch (err) {
      console.error("Error al conectar con backend:", err);
      setTipoMensaje("error");
      setMensaje("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f0f4f0]">
      <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-lg border border-green-200">
        <h1 className="mb-6 text-3xl font-bold text-center text-[#2E5430]">
          Panel de Administración
        </h1>
        <h2 className="mb-4 text-xl font-semibold text-center text-gray-700">
          Crear nuevo Jardinero 🌿
        </h2>

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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <input
                type="text"
                name="nombre"
                placeholder="Nombre*"
                value={form.nombre}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2"
              />
              {errores.nombre && (
                <p className="text-sm text-red-600 mt-1">{errores.nombre}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                name="apellido"
                placeholder="Apellido*"
                value={form.apellido}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2"
              />
              {errores.apellido && (
                <p className="text-sm text-red-600 mt-1">{errores.apellido}</p>
              )}
            </div>
          </div>

          <div>
            <input
              type="email"
              name="email"
              placeholder="Correo electrónico*"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2"
            />
            {errores.email && (
              <p className="text-sm text-red-600 mt-1">{errores.email}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-white rounded-md bg-[#2E5430] hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {loading ? "Creando..." : "Crear Jardinero"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-gray-600">
          <span className="font-semibold text-[#2E5430]">⚙️ Panel de administrador:</span>{" "}
          usa esta herramienta solo si tienes permisos.
        </p>
      </div>
    </div>
  );
}
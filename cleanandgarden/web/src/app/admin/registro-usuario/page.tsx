"use client";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";

interface Rol {
  id: number;
  codigo: string;
  nombre: string;
}

export default function CrearUsuarioPage() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    tipo: "",
  });

  const [roles, setRoles] = useState<Rol[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "">("");
  const [loading, setLoading] = useState(false);

  //  Cargar roles dinámicamente desde el backend
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/roles`, {
          credentials: "include", // envía cookie del admin
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al obtener roles");

        //  Opcional: filtra si no quieres mostrar el rol 'cliente'
        const filtered = data.filter((r: Rol) => r.codigo !== "cliente");

        setRoles(filtered);

        // Establecer el primer rol como valor por defecto
        if (filtered.length > 0 && !form.tipo) {
          setForm((prev) => ({ ...prev, tipo: filtered[0].codigo }));
        }
      } catch (err) {
        console.error(" Error al cargar roles:", err);
        Swal.fire("Error", "No se pudieron cargar los roles disponibles", "error");
      }
    };
    fetchRoles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");
    setTipoMensaje("");

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/registro-usuario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setTipoMensaje("error");
        setMensaje(data.error || "Error al crear usuario");
        return;
      }

      setTipoMensaje("success");
      setMensaje(data.message);
      setForm({ nombre: "", apellido: "", email: "", tipo: roles[0]?.codigo || "" });
    } catch (err) {
      console.error("Error:", err);
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
          Crear nuevo usuario 
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

          <input
            type="email"
            name="email"
            placeholder="Correo electrónico*"
            value={form.email}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md p-2"
            required
          />

          {/* Select dinámico de roles */}
          <select
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md p-2"
            required
          >
            <option value="">Selecciona un rol</option>
            {roles.map((r) => (
              <option key={r.id} value={r.codigo}>
                {r.nombre}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-white rounded-md bg-[#2E5430] hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {loading ? "Creando..." : "Crear Usuario"}
          </button>
        </form>
      </div>
    </div>
  );
}


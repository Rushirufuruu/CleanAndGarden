"use client";

import { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";
import { Plus, Edit2, Power, Trash2, Home } from "lucide-react";

export default function GestionDireccionesJardines() {
  const [direcciones, setDirecciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    cliente_id: "",
    direccion_id: "",
    nombre: "",
    area_m2: "",
    tipo_suelo: "",
    descripcion: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  // 🔄 Obtener direcciones
  const fetchDirecciones = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/admin/direcciones", {
        credentials: "include",
      });
      const data = await res.json();
      setDirecciones(data);
    } catch (err) {
      console.error("Error al obtener direcciones:", err);
      Swal.fire("Error", "No se pudieron cargar las direcciones", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirecciones();
  }, []);

  // ✏️ Editar jardín
  const handleEdit = (jardin: any, direccion_id: number, cliente_id: number) => {
    setEditId(jardin.id);
    setForm({
      cliente_id: cliente_id.toString(),
      direccion_id: direccion_id.toString(),
      nombre: jardin.nombre,
      area_m2: jardin.area_m2 || "",
      tipo_suelo: jardin.tipo_suelo || "",
      descripcion: jardin.descripcion || "",
    });
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  // 💾 Crear / Editar jardín
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // 🧩 Validaciones locales
    const newErrors: Record<string, string> = {};
    if (!form.nombre.trim()) newErrors.nombre = "El nombre del jardín es obligatorio";
    if (!form.area_m2 || isNaN(parseFloat(form.area_m2)) || parseFloat(form.area_m2) <= 0)
      newErrors.area_m2 = "El área (m²) debe ser un número mayor a 0";
    if (!form.tipo_suelo.trim()) newErrors.tipo_suelo = "El tipo de suelo es obligatorio";
    if (!form.descripcion.trim()) newErrors.descripcion = "La descripción es obligatoria";
    if (!form.cliente_id) newErrors.cliente_id = "Debe seleccionar un cliente";
    if (!form.direccion_id) newErrors.direccion_id = "Debe seleccionar una dirección";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Swal.fire("Error", "Por favor corrige los campos marcados.", "error");
      return;
    }

    const url = editId
      ? `http://localhost:3001/admin/jardines/${editId}`
      : "http://localhost:3001/admin/jardines";
    const method = editId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (res.ok) {
      Swal.fire("✅ Éxito", data.message, "success");
      setForm({
        cliente_id: "",
        direccion_id: "",
        nombre: "",
        area_m2: "",
        tipo_suelo: "",
        descripcion: "",
      });
      setErrors({});
      setEditId(null);
      setShowForm(false);
      fetchDirecciones();
    } else if (data.errors) {
      // ⚠️ Muestra errores específicos del backend
      setErrors(data.errors);
      const lista = Object.values(data.errors).join("<br>");
      Swal.fire({
        icon: "error",
        title: "Errores en el formulario",
        html: lista,
      });
    } else {
      Swal.fire("Error", data.error || "Error al guardar jardín", "error");
    }
  };

  // 🔁 Cambiar estado
  const toggleActivo = async (id: number) => {
    const res = await fetch(`http://localhost:3001/admin/jardines/${id}/estado`, {
      method: "PUT",
      credentials: "include",
    });
    const data = await res.json();

    if (res.ok) {
      Swal.fire("Actualizado", data.message, "success");
      fetchDirecciones();
    } else {
      Swal.fire("Error", data.error || "No se pudo actualizar el estado", "error");
    }
  };

  // 🗑️ Eliminar
  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar jardín?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2E5430",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`http://localhost:3001/admin/jardines/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      Swal.fire("Eliminado", "Jardín eliminado correctamente", "success");
      fetchDirecciones();
    } else {
      Swal.fire("Error", "No se pudo eliminar el jardín", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#2E5430] px-6 py-10">
      <div className="max-w-6xl mx-auto bg-[#E8D7B9] rounded-2xl shadow-md p-8 border border-[#CBB896]">
        <h1 className="text-3xl font-bold mb-8 text-center flex items-center justify-center gap-2 text-[#2E5430]">
          <Home /> Gestión de Direcciones y Jardines
        </h1>

        {/* 🧾 Formulario */}
        {showForm && (
          <form
            ref={formRef}
            onSubmit={handleSave}
            className="bg-white rounded-xl p-6 mb-8 shadow-inner border border-[#CBB896]"
          >
            <h2 className="text-xl font-semibold mb-4 text-[#2E5430]">
              {editId ? "✏️ Editar Jardín" : "➕ Crear nuevo Jardín"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre */}
              <div>
                <input
                  type="text"
                  placeholder="Nombre del jardín"
                  className={`border rounded-lg p-2 w-full border-[#CBB896] focus:ring-2 focus:ring-[#2E5430] outline-none ${
                    errors.nombre ? "border-red-500" : ""
                  }`}
                  value={form.nombre}
                  onChange={(e) => {
                    setForm({ ...form, nombre: e.target.value });
                    if (errors.nombre) setErrors((prev) => ({ ...prev, nombre: "" }));
                  }}
                />
                {errors.nombre && (
                  <p className="text-red-600 text-sm mt-1">{errors.nombre}</p>
                )}
              </div>

              {/* Área con ayuda 💡 */}
              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Área (m²)"
                    className={`border rounded-lg p-2 w-full border-[#CBB896] focus:ring-2 focus:ring-[#2E5430] outline-none ${
                      errors.area_m2 ? "border-red-500" : ""
                    }`}
                    value={form.area_m2}
                    onChange={(e) => {
                      setForm({ ...form, area_m2: e.target.value });
                      if (errors.area_m2)
                        setErrors((prev) => ({ ...prev, area_m2: "" }));
                    }}
                  />
                  {/* 💡 Botón de ayuda */}
                  <button
                    type="button"
                    onClick={() => {
                      Swal.fire({
                        title: "¿Cómo calcular el área del jardín?",
                        html: `
                          <div style="text-align: left; line-height: 1.6; font-size: 15px;">
                            <p><b>Mide el largo</b> y el <b>ancho</b> de tu patio (en metros), y luego multiplícalos.</p>
                            <p style="margin-top: 10px;">
                              Ejemplo: un jardín de <b>10 metros de largo</b> por <b>5 metros de ancho</b> → Área = 10 × 5 = 50 m²
                            </p>
                            <p style="margin-top: 10px; font-style: italic; color: #555;">
                              Ingresa el resultado (por ejemplo: <b>50</b>) en el campo "Área (m²)".
                            </p>
                          </div>
                        `,
                        confirmButtonText: "Entendido",
                        confirmButtonColor: "#2E5430",
                        background: "#F9F8F6",
                        color: "#2E5430",
                      });
                    }}
                    className="text-[#2E5430] hover:text-[#254526] text-lg"
                    title="¿Cómo calcular el área?"
                  >
                    💡
                  </button>
                </div>
                {errors.area_m2 && (
                  <p className="text-red-600 text-sm mt-1">{errors.area_m2}</p>
                )}
              </div>

              {/* Tipo de suelo */}
              <div>
                <input
                  type="text"
                  placeholder="Tipo de suelo"
                  className={`border rounded-lg p-2 w-full border-[#CBB896] focus:ring-2 focus:ring-[#2E5430] outline-none ${
                    errors.tipo_suelo ? "border-red-500" : ""
                  }`}
                  value={form.tipo_suelo}
                  onChange={(e) => {
                    setForm({ ...form, tipo_suelo: e.target.value });
                    if (errors.tipo_suelo)
                      setErrors((prev) => ({ ...prev, tipo_suelo: "" }));
                  }}
                />
                {errors.tipo_suelo && (
                  <p className="text-red-600 text-sm mt-1">{errors.tipo_suelo}</p>
                )}
              </div>

              {/* Descripción */}
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Descripción"
                  className={`border rounded-lg p-2 w-full border-[#CBB896] focus:ring-2 focus:ring-[#2E5430] outline-none ${
                    errors.descripcion ? "border-red-500" : ""
                  }`}
                  value={form.descripcion}
                  onChange={(e) => {
                    setForm({ ...form, descripcion: e.target.value });
                    if (errors.descripcion)
                      setErrors((prev) => ({ ...prev, descripcion: "" }));
                  }}
                />
                {errors.descripcion && (
                  <p className="text-red-600 text-sm mt-1">{errors.descripcion}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setForm({
                    cliente_id: "",
                    direccion_id: "",
                    nombre: "",
                    area_m2: "",
                    tipo_suelo: "",
                    descripcion: "",
                  });
                  setErrors({});
                  setShowForm(false);
                }}
                className="bg-[#B65C36] text-white px-6 py-2 rounded-lg hover:bg-[#954A2D] transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#2E5430] text-white px-6 py-2 rounded-lg hover:bg-[#254526] transition"
              >
                {editId ? "Guardar cambios" : "Agregar Jardín"}
              </button>
            </div>
          </form>
        )}

        {/* 📋 Listado */}
        {loading ? (
          <p className="text-center text-gray-500">Cargando direcciones...</p>
        ) : (
          <div className="space-y-6">
            {direcciones.map((dir) => (
              <div
                key={dir.id}
                className="bg-white rounded-xl shadow-sm p-5 border border-[#CBB896]"
              >
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2 text-[#2E5430]">
                      <Home size={18} />
                      {dir.calle}
                    </h3>
                    <p className="text-sm text-gray-700">
                      {dir.comuna?.nombre}, {dir.comuna?.region?.nombre}
                    </p>
                    <p className="text-sm italic text-gray-600">
                      Cliente: {dir.usuario?.nombre} {dir.usuario?.apellido} (
                      {dir.usuario?.email})
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setForm({
                        cliente_id: dir.usuario.id.toString(),
                        direccion_id: dir.id.toString(),
                        nombre: "",
                        area_m2: "",
                        tipo_suelo: "",
                        descripcion: "",
                      });
                      setErrors({});
                      setShowForm(true);
                      setTimeout(() => {
                        formRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }, 150);
                    }}
                    className="flex items-center gap-2 bg-[#2E5430] text-white px-3 py-2 rounded-lg hover:bg-[#254526] transition"
                  >
                    <Plus size={16} /> Jardín
                  </button>
                </div>

                {/* Tabla */}
                {dir.jardin.length > 0 ? (
                  <table className="min-w-full border border-[#CBB896] rounded-xl bg-[#F9F8F6] shadow-sm mt-3">
                    <thead className="bg-[#E8D7B9] text-[#2E5430] border-b border-[#CBB896]">
                      <tr>
                        <th className="p-2 text-left">Nombre</th>
                        <th className="p-2 text-left">Área</th>
                        <th className="p-2 text-left">Tipo suelo</th>
                        <th className="p-2 text-left">Descripción</th>
                        <th className="p-2 text-center">Estado</th>
                        <th className="p-2 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dir.jardin.map((j: any) => (
                        <tr
                          key={j.id}
                          className="border-t border-[#CBB896]/50 hover:bg-[#F3E6CB]/60 transition"
                        >
                          <td className="p-2">{j.nombre}</td>
                          <td className="p-2">{j.area_m2 ? `${j.area_m2} m²` : "-"}</td>
                          <td className="p-2">{j.tipo_suelo || "-"}</td>
                          <td className="p-2">{j.descripcion || "-"}</td>
                          <td className="p-2 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-sm ${
                                j.activo
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {j.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="p-2 flex justify-center gap-3">
                            <button
                              onClick={() => handleEdit(j, dir.id, dir.usuario.id)}
                              title="Editar"
                              className="text-blue-700 hover:text-blue-900"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => toggleActivo(j.id)}
                              title={j.activo ? "Desactivar" : "Activar"}
                              className={`${
                                j.activo
                                  ? "text-yellow-700 hover:text-yellow-900"
                                  : "text-green-700 hover:text-green-900"
                              }`}
                            >
                              <Power size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(j.id)}
                              title="Eliminar"
                              className="text-red-700 hover:text-red-900"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-600 italic mt-2">
                    No hay jardines registrados.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

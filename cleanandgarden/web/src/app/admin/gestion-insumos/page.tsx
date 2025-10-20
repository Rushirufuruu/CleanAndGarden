"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Plus, Edit2, Trash2, Search } from "lucide-react";

export default function GestionInsumos() {
  const [insumos, setInsumos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<
    "todos" | "Disponible" | "No Disponible"
  >("todos");
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio_unitario: "",
    stock_actual: "",
  });
  const [editId, setEditId] = useState<number | null>(null);

  const fetchInsumos = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/admin/insumos", {
        credentials: "include",
      });
      const data = await res.json();
      setInsumos(data);
    } catch (err) {
      Swal.fire("Error", "No se pudieron cargar los insumos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsumos();
  }, []);

  const filtrados = insumos
    .filter((i) => {
      const term = search.toLowerCase();
      return (
        i.nombre.toLowerCase().includes(term) ||
        (i.descripcion?.toLowerCase() ?? "").includes(term)
      );
    })
    .filter((i) =>
      estadoFiltro === "todos"
        ? true
        : estadoFiltro === "Disponible"
        ? i.activo
        : !i.activo
    );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      Swal.fire("Error", "El nombre es obligatorio", "error");
      return;
    }

    const url = editId
      ? `http://localhost:3001/admin/insumos/${editId}`
      : "http://localhost:3001/admin/insumos";
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
      limpiarFormulario();
      fetchInsumos();
    } else {
      Swal.fire("Error", data.error || "Error al guardar", "error");
    }
  };

  const handleEdit = (i: any) => {
    setEditId(i.id);
    setForm({
      nombre: i.nombre,
      descripcion: i.descripcion || "",
      precio_unitario: i.precio_unitario || "",
      stock_actual: i.stock_actual || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const limpiarFormulario = () => {
    setEditId(null);
    setForm({
      nombre: "",
      descripcion: "",
      precio_unitario: "",
      stock_actual: "",
    });
  };

  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar insumo?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2E5430",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`http://localhost:3001/admin/insumos/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      Swal.fire("Eliminado", "Insumo eliminado correctamente", "success");
      fetchInsumos();
    } else {
      Swal.fire("Error", "No se pudo eliminar", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F0] text-[#2E5430] px-6 py-10">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-3xl font-bold mb-8 text-center">
          🌿 Gestión de Insumos
        </h1>

        {/* 🔍 Buscador y filtro */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 w-full md:w-2/3">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar insumo..."
              className="border p-2 rounded-lg w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="border p-2 rounded-lg w-full md:w-auto"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value as any)}
          >
            <option value="todos">Todos</option>
            <option value="Disponible">Disponible</option>
            <option value="No Disponible">No Disponible</option>
          </select>
        </div>

        {/* 🧾 Formulario */}
        <form
          onSubmit={handleSave}
          className="bg-[#F3F6F1] rounded-xl p-6 mb-8 shadow-inner border border-[#2E5430]"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            {editId ? "✏️ Editar insumo" : <><Plus size={18} /> Crear nuevo insumo</>}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nombre del insumo"
              className="border border-[#2E5430] rounded-lg p-2 text-[#2E5430]"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
            <input
              type="number"
              placeholder="Precio unitario"
              className="border border-[#2E5430] rounded-lg p-2 text-[#2E5430]"
              value={form.precio_unitario}
              onChange={(e) =>
                setForm({ ...form, precio_unitario: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="Stock actual"
              className="border border-[#2E5430] rounded-lg p-2 text-[#2E5430]"
              value={form.stock_actual}
              onChange={(e) =>
                setForm({ ...form, stock_actual: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Descripción"
              className="border border-[#2E5430] rounded-lg p-2 col-span-2 text-[#2E5430]"
              value={form.descripcion}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            {editId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition"
              >
                Cancelar cambios
              </button>
            )}
            <button
              type="submit"
              className="bg-[#2E5430] hover:bg-green-800 text-white px-6 py-2 rounded-lg transition"
            >
              {editId ? "Guardar cambios" : "Agregar insumo"}
            </button>
          </div>
        </form>

        {/* 📋 Tabla */}
        {loading ? (
          <p className="text-center text-gray-500">Cargando insumos...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-[#D7C4A3] rounded-lg overflow-hidden">
              <thead className="bg-[#F5E9D7] text-[#2E5430]">
                <tr>
                  <th className="p-3 text-left">Nombre</th>
                  <th className="p-3 text-left">Descripción</th>
                  <th className="p-3 text-left">Precio</th>
                  <th className="p-3 text-left">Stock</th>
                  <th className="p-3 text-center">Disponibilidad</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((i, index) => (
                  <tr
                    key={i.id}
                    className={`border-t border-[#E4D4B8] ${
                      index % 2 === 0 ? "bg-[#FCFAF6]" : "bg-[#F9F4EE]"
                    } hover:bg-[#EFE1CC] transition`}
                  >
                    <td className="p-3">{i.nombre}</td>
                    <td className="p-3">{i.descripcion || "-"}</td>
                    <td className="p-3">
                      {i.precio_unitario
                        ? `$${Number(i.precio_unitario).toLocaleString()}`
                        : "-"}
                    </td>
                    <td className="p-3">{i.stock_actual ?? 0}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-sm ${
                          i.stock_actual > 0
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {i.stock_actual > 0 ? "Disponible" : "No disponible"}
                      </span>
                    </td>
                    <td className="p-3 flex justify-center gap-3">
                      <button
                        onClick={() => handleEdit(i)}
                        title="Editar"
                        className="text-blue-700 hover:text-blue-900"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(i.id)}
                        title="Eliminar"
                        className="text-red-700 hover:text-red-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center p-4 text-gray-500 italic"
                    >
                      No se encontraron insumos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ShieldCheck, Plus, Trash2, Edit3, Users } from "lucide-react";

interface Rol {
  id: number;
  codigo: string;
  nombre: string;
  _count?: { usuario: number };
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRol, setNewRol] = useState({ codigo: "", nombre: "" });
  const [errors, setErrors] = useState<{ codigo?: string; nombre?: string }>({});
  const [showModal, setShowModal] = useState(false);
  const [editRol, setEditRol] = useState<Rol | null>(null);
  const [editForm, setEditForm] = useState({ codigo: "", nombre: "" });

  // Cargar roles
  const fetchRoles = async () => {
    try {
      const res = await fetch("http://localhost:3001/admin/roles", {
        credentials: "include",
      });
      const data = await res.json();
      if (Array.isArray(data)) setRoles(data);
    } catch {
      Swal.fire("Error", "No se pudieron cargar los roles.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // ✅ Validar campos antes de crear rol
  const validarRol = () => {
    const newErrors: { codigo?: string; nombre?: string } = {};
    if (!newRol.codigo.trim()) newErrors.codigo = "El código es obligatorio.";
    if (!newRol.nombre.trim()) newErrors.nombre = "El nombre del rol es obligatorio.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Crear rol
  const crearRol = async () => {
    if (!validarRol()) return;

    try {
      const res = await fetch("http://localhost:3001/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newRol),
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire("✅ Rol creado correctamente", "", "success");
        setNewRol({ codigo: "", nombre: "" });
        fetchRoles();
      } else {
        Swal.fire("Error", data.error || "No se pudo crear el rol", "error");
      }
    } catch {
      Swal.fire("Error", "Error al crear rol.", "error");
    }
  };

  // ✅ Abrir modal de edición
  const abrirModal = (rol: Rol) => {
    setEditRol(rol);
    setEditForm({ codigo: rol.codigo, nombre: rol.nombre });
    setShowModal(true);
  };

  // ✅ Guardar cambios del rol
  const guardarCambios = async () => {
    if (!editRol) return;

    try {
      const res = await fetch(`http://localhost:3001/admin/roles/${editRol.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editForm),
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire("✅ Rol actualizado correctamente", "", "success");
        setShowModal(false);
        fetchRoles();
      } else {
        Swal.fire("Error", data.error || "No se pudo actualizar el rol", "error");
      }
    } catch {
      Swal.fire("Error", "Error al actualizar rol.", "error");
    }
  };

  // ✅ Eliminar rol
  const eliminarRol = async (id: number) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar rol?",
      text: "Esto podría afectar a usuarios asignados a este rol.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4C7043",
      cancelButtonColor: "#d33",
      confirmButtonText: "Eliminar",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`http://localhost:3001/admin/roles/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire("✅ Rol eliminado correctamente", "", "success");
        fetchRoles();
      } else {
        Swal.fire("Error", data.error || "No se pudo eliminar el rol", "error");
      }
    } catch {
      Swal.fire("Error", "Error al eliminar rol.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBEA] px-8 py-10">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-md p-8 border border-[#E5E5E5]">
        <h1 className="text-3xl font-bold text-[#3E5C3A] flex items-center gap-2 mb-8">
          <ShieldCheck className="w-7 h-7 text-[#4C7043]" />
          Gestión de Roles
        </h1>

        {/* 🔹 Crear rol */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Código del rol"
              className="input input-bordered border-[#DADADA] w-full"
              value={newRol.codigo}
              onChange={(e) => setNewRol({ ...newRol, codigo: e.target.value })}
            />
            {errors.codigo && <p className="text-red-600 text-xs mt-1">{errors.codigo}</p>}
          </div>

          <div className="flex-1">
            <input
              type="text"
              placeholder="Nombre del rol"
              className="input input-bordered border-[#DADADA] w-full"
              value={newRol.nombre}
              onChange={(e) => setNewRol({ ...newRol, nombre: e.target.value })}
            />
            {errors.nombre && <p className="text-red-600 text-xs mt-1">{errors.nombre}</p>}
          </div>

          <button
            onClick={crearRol}
            className="btn bg-[#4C7043] hover:bg-[#3E5C3A] text-white rounded-lg flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-1" />
            Crear Rol
          </button>
        </div>

        {/* 🔹 Tabla de roles */}
        {loading ? (
          <p className="text-center text-gray-500 py-6">Cargando roles...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full border-collapse text-[15px]">
              <thead>
                <tr className="bg-[#F3F6F1] text-[#3E5C3A] border-b-2 border-[#C8D9C1]">
                  <th className="py-3 px-5 text-left">ID</th>
                  <th className="py-3 px-5 text-left">Código</th>
                  <th className="py-3 px-5 text-left">Nombre</th>
                  <th className="py-3 px-5 text-center flex items-center justify-center gap-1">
                    <Users className="w-4 h-4" /> Usuarios
                  </th>
                  <th className="py-3 px-5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {roles.length > 0 ? (
                  roles.map((r) => (
                    <tr key={r.id} className="hover:bg-[#FAFAF8] border-b border-[#DCE5D7]">
                      <td className="py-3 px-5 text-gray-700">{r.id}</td>
                      <td className="py-3 px-5 font-semibold">{r.codigo}</td>
                      <td className="py-3 px-5">{r.nombre}</td>
                      <td className="py-3 px-5 text-center text-gray-700 font-medium">
                        {r._count?.usuario ?? 0}
                      </td>
                      <td className="py-3 px-5 text-center flex justify-center gap-2">
                        <button
                          onClick={() => abrirModal(r)}
                          disabled={r.codigo === "admin"}
                          className={`btn btn-sm rounded-full ${
                            r.codigo === "admin"
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-[#4C7043] hover:bg-[#3E5C3A] text-white"
                          }`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => eliminarRol(r.id)}
                          disabled={r.codigo === "admin"}
                          className={`btn btn-sm rounded-full ${
                            r.codigo === "admin"
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-[#6E6E6E] hover:bg-[#555] text-white"
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-500 py-6 italic">
                      No hay roles registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🔹 Modal Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-[#E5E5E5]">
            <h2 className="text-2xl font-bold text-[#3E5C3A] mb-4">Editar Rol</h2>
            <div className="grid grid-cols-1 gap-4">
              <input
                type="text"
                placeholder="Código del rol"
                className="input input-bordered border-[#DADADA]"
                value={editForm.codigo}
                disabled={editRol?.codigo === "admin"}
                onChange={(e) => setEditForm({ ...editForm, codigo: e.target.value })}
              />
              <input
                type="text"
                placeholder="Nombre del rol"
                className="input input-bordered border-[#DADADA]"
                value={editForm.nombre}
                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn bg-gray-400 text-white hover:bg-gray-500 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCambios}
                className="btn bg-[#4C7043] text-white hover:bg-[#3E5C3A] rounded-lg"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

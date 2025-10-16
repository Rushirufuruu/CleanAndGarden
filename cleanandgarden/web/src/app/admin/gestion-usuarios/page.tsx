"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Search, UserPlus, Trash2, ShieldCheck, Edit3 } from "lucide-react";

interface Rol {
  id: number;
  codigo: string;
  nombre: string;
}

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  activo: boolean;
  rol: Rol;
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [usuarioEdit, setUsuarioEdit] = useState<Usuario | null>(null);
  const [editForm, setEditForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    rolCodigo: "",
  });

  // Errores de validación
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar datos
  const fetchUsuarios = async () => {
    try {
      const res = await fetch("http://localhost:3001/admin/usuarios", {
        credentials: "include",
      });
      const data = await res.json();
      if (Array.isArray(data)) setUsuarios(data);
      else Swal.fire("Error", data.error || "No autorizado", "error");
    } catch {
      Swal.fire("Error", "No se pudieron cargar los usuarios", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("http://localhost:3001/admin/roles", {
        credentials: "include",
      });
      const data = await res.json();
      if (Array.isArray(data)) setRoles(data);
    } catch {
      console.error("Error al cargar roles");
    }
  };

  useEffect(() => {
    fetchUsuarios();
    fetchRoles();
  }, []);

  // Cambiar estado
  const cambiarEstado = async (id: number, activo: boolean) => {
    const res = await fetch(`http://localhost:3001/admin/usuarios/${id}/estado`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ activo }),
    });
    if (res.ok) {
      Swal.fire("✅ Estado actualizado", "", "success");
      fetchUsuarios();
    } else Swal.fire("Error", "No se pudo cambiar el estado", "error");
  };

  // Eliminar usuario
  const eliminarUsuario = async (id: number) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar usuario?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4C7043",
      cancelButtonColor: "#d33",
      confirmButtonText: "Eliminar",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`http://localhost:3001/admin/usuarios/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      Swal.fire("Eliminado", "Usuario eliminado correctamente", "success");
      fetchUsuarios();
    } else {
      Swal.fire("Error", "No se pudo eliminar el usuario", "error");
    }
  };

  // Abrir modal
  const abrirModal = (usuario: Usuario) => {
    setUsuarioEdit(usuario);
    setEditForm({
      nombre: usuario.nombre,
      apellido: usuario.apellido || "",
      email: usuario.email,
      telefono: usuario.telefono || "",
      rolCodigo: usuario.rol?.codigo || "",
    });
    setErrors({});
    setShowModal(true);
  };

  // ✅ Validar antes de guardar
  const validarFormulario = () => {
    const newErrors: Record<string, string> = {};
    const { nombre, apellido, email, telefono, rolCodigo } = editForm;

    if (!nombre.trim()) newErrors.nombre = "El nombre es obligatorio.";
    if (!apellido.trim()) newErrors.apellido = "El apellido es obligatorio.";
    if (!email.trim()) newErrors.email = "El correo es obligatorio.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Formato de correo no válido.";

    if (!telefono.trim()) newErrors.telefono = "El teléfono es obligatorio.";
    else if (!/^\+569\d{8}$/.test(telefono))
      newErrors.telefono = "Debe tener formato +569XXXXXXXX.";

    if (!rolCodigo) newErrors.rolCodigo = "Debe seleccionar un rol.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Guardar cambios
  const guardarCambios = async () => {
    if (!usuarioEdit) return;
    if (!validarFormulario()) return; // 🚫 No sigue si hay errores

    try {
      const res = await fetch(`http://localhost:3001/admin/usuarios/${usuarioEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        Swal.fire("✅ Usuario actualizado", "", "success");
        setShowModal(false);
        fetchUsuarios();
      } else {
        const data = await res.json();
        Swal.fire("Error", data.error || "No se pudo editar el usuario", "error");
      }
    } catch {
      Swal.fire("Error", "Error al editar el usuario", "error");
    }
  };

  const usuariosFiltrados = usuarios.filter((u) =>
    `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FFFBEA] px-8 py-10">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-md p-8 border border-[#E5E5E5]">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-[#3E5C3A] flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-[#4C7043]" />
            Gestión de Usuarios
          </h1>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar usuario..."
                className="input input-bordered pl-10 w-full border-[#DADADA] rounded-lg focus:border-[#4C7043]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn bg-[#4C7043] text-white hover:bg-[#3E5C3A] rounded-lg shadow-sm">
              <UserPlus className="w-5 h-5 mr-1" />
              Nuevo Usuario
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-10 text-lg">Cargando usuarios...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full border-collapse text-[15px]">
              <thead>
                <tr className="bg-[#F3F6F1] text-[#3E5C3A] border-b-2 border-[#C8D9C1]">
                  <th className="py-4 px-5 text-left">ID</th>
                  <th className="py-4 px-5 text-left">Nombre</th>
                  <th className="py-4 px-5 text-left">Email</th>
                  <th className="py-4 px-5 text-left">Rol</th>
                  <th className="py-4 px-5 text-left">Estado</th>
                  <th className="py-4 px-5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.length > 0 ? (
                  usuariosFiltrados.map((u) => (
                    <tr key={u.id} className="hover:bg-[#FAFAF8] border-b border-[#DCE5D7]">
                      <td className="py-3 px-5 font-semibold text-gray-700">{u.id}</td>
                      <td className="py-3 px-5">{u.nombre} {u.apellido}</td>
                      <td className="py-3 px-5 text-gray-700">{u.email}</td>
                      <td className="py-3 px-5">{u.rol?.nombre}</td>
                      <td className="py-3 px-5">
                        <button
                          onClick={() => cambiarEstado(u.id, !u.activo)}
                          className={`btn btn-sm rounded-full px-5 font-medium ${
                            u.activo
                              ? "bg-[#4C7043] hover:bg-[#3E5C3A] text-white"
                              : "bg-[#E57373] hover:bg-[#D9534F] text-white"
                          }`}
                        >
                          {u.activo ? "Activo" : "Inactivo"}
                        </button>
                      </td>
                      <td className="py-3 px-5 text-center flex gap-2 justify-center">
                        <button
                          onClick={() => abrirModal(u)}
                          className="btn btn-sm bg-[#4C7043] hover:bg-[#3E5C3A] text-white rounded-full"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => eliminarUsuario(u.id)}
                          className="btn btn-sm bg-[#6E6E6E] hover:bg-[#555] text-white rounded-full"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500 py-6 italic text-[15px]">
                      No se encontraron usuarios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🔹 Modal Editar Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-[#E5E5E5]">
            <h2 className="text-2xl font-bold text-[#3E5C3A] mb-4">Editar Usuario</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Nombre"
                  className="input input-bordered border-[#DADADA] w-full"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                />
                {errors.nombre && <p className="text-red-600 text-xs mt-1">{errors.nombre}</p>}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Apellido"
                  className="input input-bordered border-[#DADADA] w-full"
                  value={editForm.apellido}
                  onChange={(e) => setEditForm({ ...editForm, apellido: e.target.value })}
                />
                {errors.apellido && <p className="text-red-600 text-xs mt-1">{errors.apellido}</p>}
              </div>

              <div className="col-span-2">
                <input
                  type="email"
                  placeholder="Email"
                  className="input input-bordered border-[#DADADA] w-full"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
                {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
              </div>

              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Teléfono"
                  className="input input-bordered border-[#DADADA] w-full"
                  value={editForm.telefono}
                  onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                />
                {errors.telefono && <p className="text-red-600 text-xs mt-1">{errors.telefono}</p>}
              </div>

              <div className="col-span-2">
                <select
                  className="select select-bordered border-[#DADADA] w-full"
                  value={editForm.rolCodigo}
                  onChange={(e) => setEditForm({ ...editForm, rolCodigo: e.target.value })}
                >
                  <option value="">Seleccionar rol</option>
                  {roles.map((rol) => (
                    <option key={rol.codigo} value={rol.codigo}>
                      {rol.nombre}
                    </option>
                  ))}
                </select>
                {errors.rolCodigo && (
                  <p className="text-red-600 text-xs mt-1">{errors.rolCodigo}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="btn bg-gray-400 text-white hover:bg-gray-500 rounded-lg"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn bg-[#4C7043] text-white hover:bg-[#3E5C3A] rounded-lg"
                onClick={guardarCambios}
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

"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Search, UserPlus, Trash2, ShieldCheck } from "lucide-react";

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  activo: boolean;
  rol: { codigo: string; nombre: string };
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const cambiarRol = async (id: number, nuevoRol: string) => {
    const res = await fetch(`http://localhost:3001/admin/usuarios/${id}/rol`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nuevoRol }),
    });
    if (res.ok) {
      Swal.fire("✅ Rol actualizado", "", "success");
      fetchUsuarios();
    } else Swal.fire("Error", "No se pudo cambiar el rol", "error");
  };

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
                    <tr
                      key={u.id}
                      className="hover:bg-[#FAFAF8] transition-all border-b border-[#DCE5D7]"
                    >
                      <td className="py-3 px-5 font-semibold text-gray-700">{u.id}</td>
                      <td className="py-3 px-5">{u.nombre} {u.apellido}</td>
                      <td className="py-3 px-5 text-gray-700">{u.email}</td>
                      <td className="py-3 px-5">
                        <select
                          value={u.rol?.codigo}
                          onChange={(e) => cambiarRol(u.id, e.target.value)}
                          className="select select-sm select-bordered border-gray-300 rounded-md"
                        >
                          <option value="cliente">Cliente</option>
                          <option value="jardinero">Jardinero</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </td>
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
                      <td className="py-3 px-5 text-center">
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
                    <td
                      colSpan={6}
                      className="text-center text-gray-500 py-6 italic text-[15px]"
                    >
                      No se encontraron usuarios
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

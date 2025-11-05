"use client";

import { useEffect, useState } from "react";
import { Trash2, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";

export default function GestionComentarios() {
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error" | ""; texto: string }>({
    tipo: "",
    texto: "",
  });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ visible: boolean; id: number | null }>({
    visible: false,
    id: null,
  });

  // === Cargar comentarios ===
  const fetchComentarios = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/comentarios`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComentarios(data);
    } catch {
      setMensaje({ tipo: "error", texto: "No tienes permiso para ver los comentarios." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComentarios();
  }, []);

  // === Cambiar estado ===
  const cambiarEstado = async (id: number, activo: boolean) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/comentarios/${id}/estado`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activo: !activo }),
        }
      );

      if (res.ok) {
        setComentarios((prev) =>
          prev.map((c) => (c.id === id ? { ...c, activo: !activo } : c))
        );
        setMensaje({
          tipo: "success",
          texto: !activo
            ? "Comentario activado correctamente."
            : "Comentario desactivado correctamente.",
        });
      } else {
        setMensaje({ tipo: "error", texto: "No se pudo cambiar el estado del comentario." });
      }
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión con el servidor." });
    }
  };

  // === Eliminar comentario ===
  const eliminarComentario = async (id: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/comentarios/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setComentarios((prev) => prev.filter((c) => c.id !== id));
        setMensaje({ tipo: "success", texto: "Comentario eliminado correctamente." });
      } else {
        setMensaje({ tipo: "error", texto: "No se pudo eliminar el comentario." });
      }
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión con el servidor." });
    } finally {
      setModal({ visible: false, id: null }); // cerrar modal siempre
    }
  };

  // === Ocultar mensaje automático ===
  useEffect(() => {
    if (mensaje.texto) {
      const timer = setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  return (
    <section className="min-h-screen flex flex-col items-center justify-start mt-16 px-6 w-full mb-24 bg-[#FAF8F3]">
      <h2 className="text-3xl font-extrabold text-[#2E5430] mb-3 text-center">
        Gestión de Comentarios
      </h2>
      <p className="text-gray-600 text-center mb-8">
        Activa o desactiva los comentarios visibles para los clientes.
      </p>

      {/* === MENSAJES DEL FRONT === */}
      {mensaje.texto && (
        <div
          className={`flex items-center gap-2 px-5 py-3 mb-6 rounded-lg shadow-md border w-full max-w-4xl justify-center text-sm font-medium transition-all ${
            mensaje.tipo === "success"
              ? "bg-green-50 border-green-400 text-green-700"
              : "bg-red-50 border-red-400 text-red-700"
          }`}
        >
          {mensaje.tipo === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* === TABLA === */}
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg border border-[#8B6B4A]/30 p-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-[#2E5430]" />
          </div>
        ) : comentarios.length === 0 ? (
          <p className="text-center text-gray-500 italic">
            No hay comentarios registrados.
          </p>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-[#2E5430] text-white text-sm">
                <th className="py-3 px-4 text-left rounded-tl-xl">Usuario</th>
                <th className="py-3 px-4 text-left">Comentario</th>
                <th className="py-3 px-4 text-center">Fecha</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center rounded-tr-xl">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {comentarios.map((c) => (
                <tr
                  key={c.id}
                  className="border-b hover:bg-gray-50 transition-colors text-sm"
                >
                  <td className="py-3 px-4 font-medium text-[#2E5430]">
                    {c.nombre} {c.apellido}
                    <p className="text-xs text-gray-500">{c.email}</p>
                  </td>
                  <td className="py-3 px-4 text-gray-700 break-words max-w-[300px]">
                    {c.contenido}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600">{c.fecha}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => cambiarEstado(c.id, c.activo)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm transition-all ${
                        c.activo
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      {c.activo ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setModal({ visible: true, id: c.id })}
                      className="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-700 transition"
                      title="Eliminar comentario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* === MODAL DE CONFIRMACIÓN === */}
      {modal.visible && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-sm text-center">
            <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              ¿Eliminar comentario?
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => eliminarComentario(modal.id!)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => setModal({ visible: false, id: null })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

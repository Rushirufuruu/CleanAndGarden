"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Quote, Edit, Trash2, X, Check } from "lucide-react";

export default function ComentarioForm() {
  const [contenido, setContenido] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error" | ""; texto: string }>({
    tipo: "",
    texto: "",
  });
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [usuario, setUsuario] = useState<any>(null);
  const [editando, setEditando] = useState<number | null>(null);
  const [nuevoContenido, setNuevoContenido] = useState("");

  // === Cargar usuario logueado ===
  const fetchUsuario = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
        credentials: "include",
      });
      if (!res.ok) {
        setUsuario(null);
        return;
      }
      const data = await res.json();
      if (data.user) {
        const user = { ...data.user, id: Number(data.user.id) };
        setUsuario(user);
      } else {
        setUsuario(null);
      }
    } catch (err) {
      console.error("❌ Error cargando usuario:", err);
      setUsuario(null);
    }
  };

  // === Cargar comentarios activos ===
  const fetchComentarios = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/comentarios`);
      const data = await res.json();
      if (Array.isArray(data)) setComentarios(data);
    } catch (err) {
      console.error("❌ Error al cargar comentarios:", err);
    }
  };

  useEffect(() => {
    fetchUsuario();
    fetchComentarios();
  }, []);

  // 🔁 Revalida sesión cuando se cambia de pestaña o vuelve al foco
  useEffect(() => {
    const handleFocus = () => fetchUsuario();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // 🕒 Ocultar mensaje automáticamente después de unos segundos
    useEffect(() => {
    if (mensaje.texto) {
        const timer = setTimeout(() => {
        setMensaje({ tipo: "", texto: "" });
        }, 4000); // 4 segundos

        return () => clearTimeout(timer);
    }
    }, [mensaje]);


  // === Crear nuevo comentario ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuario) {
      setMensaje({ tipo: "error", texto: "Debes iniciar sesión para comentar." });
      return;
    }

    if (usuario.rol?.codigo !== "cliente") {
      setMensaje({ tipo: "error", texto: "Solo los clientes pueden dejar comentarios." });
      return;
    }

    if (!contenido.trim()) {
      setMensaje({ tipo: "error", texto: "Por favor, escribe un comentario antes de enviar." });
      return;
    }

    setLoading(true);
    setMensaje({ tipo: "", texto: "" });

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/comentarios`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido }),
      });

      const data = await res.json();

      if (res.ok && data.comentario) {
        const nuevo = {
          ...data.comentario,
          usuario_id: usuario.id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
        };
        setComentarios((prev) => [nuevo, ...prev]);
        setContenido("");
        setMensaje({ tipo: "success", texto: " Comentario enviado correctamente." });
      } else {
        setMensaje({ tipo: "error", texto: data.error || "Ocurrió un error al enviar." });
      }
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión con el servidor." });
    } finally {
      setLoading(false);
    }
  };

  // === Editar comentario ===
  const editarComentario = async (id: number) => {
    if (!nuevoContenido.trim()) {
      setMensaje({ tipo: "error", texto: "El comentario no puede estar vacío." });
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/comentarios/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: nuevoContenido }),
      });
      const data = await res.json();

      if (res.ok) {
        setComentarios((prev) =>
          prev.map((c) => (c.id === id ? { ...c, contenido: nuevoContenido } : c))
        );
        setEditando(null);
        setMensaje({ tipo: "success", texto: "Comentario actualizado correctamente." });
      } else {
        setMensaje({ tipo: "error", texto: data.error || "Error al editar comentario." });
      }
    } catch {
      setMensaje({ tipo: "error", texto: "Error al editar comentario." });
    }
  };

  // === Eliminar comentario ===
  const eliminarComentario = async (id: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/comentarios/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok) {
        setComentarios((prev) => prev.filter((c) => c.id !== id));
        setMensaje({ tipo: "success", texto: "Comentario eliminado correctamente." });
      } else {
        setMensaje({ tipo: "error", texto: data.error || "Error al eliminar comentario." });
      }
    } catch {
      setMensaje({ tipo: "error", texto: "Error al eliminar comentario." });
    }
  };

  // === Scroll lateral ===
  const scroll = (dir: "left" | "right") => {
    const container = document.querySelector(".comentarios-scroll") as HTMLElement;
    if (container) container.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  // === Verifica si el usuario actual es cliente ===
  const esCliente = usuario && usuario.rol?.codigo === "cliente";

  return (
    <section className="flex flex-col items-center justify-center mt-16 mb-24 px-6 w-full">
      {/* === CARRUSEL === */}
      <div className="w-full max-w-6xl mb-12 relative">
        <h2 className="text-3xl font-extrabold text-[#2E5430] text-center mb-8">
          Opiniones de nuestros clientes
        </h2>

        {comentarios.length === 0 ? (
          <p className="text-center text-gray-500 italic">
            Aún no hay comentarios disponibles.
          </p>
        ) : (
          <div className="relative flex items-center">
            <button
              onClick={() => scroll("left")}
              className="absolute left-[-50px] bg-[#2E5430] text-white w-10 h-10 rounded-full shadow-md hover:bg-[#7BC043] transition-all z-10"
            >
              ‹
            </button>

            <div className="comentarios-scroll flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 scroll-smooth scrollbar-hide px-2 w-full">
              {comentarios.map((c) => (
                <div
                  key={c.id}
                  className="min-w-[320px] max-w-[320px] h-[220px] bg-white border border-[#8B6B4A]/20 shadow-lg rounded-2xl p-5 snap-center flex-shrink-0 flex flex-col justify-between hover:shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-[#2E5430] truncate">
                      {c.nombre} {c.apellido}
                    </h3>
                    <span className="text-sm text-gray-500">{c.fecha}</span>
                  </div>

                  {editando === c.id ? (
                    <div className="flex flex-col gap-2">
                      <div className="relative w-full">
                        <textarea
                          value={nuevoContenido}
                          onChange={(e) => {
                            if (e.target.value.length <= 180)
                              setNuevoContenido(e.target.value);
                          }}
                          maxLength={180}
                          className="w-full h-20 border border-[#8B6B4A]/30 rounded-lg p-2 text-sm resize-none pr-12"
                          placeholder="Edita tu comentario..."
                        ></textarea>
                        <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                          {nuevoContenido.length}/180
                        </span>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => editarComentario(c.id)}
                          className="p-2 bg-[#7BC043] text-white rounded-full hover:bg-[#2E5430] transition"
                          title="Guardar"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditando(null)}
                          className="p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 items-start flex-1">
                        <Quote className="text-[#7BC043] w-5 h-5 mt-1 flex-shrink-0" />
                        <p className="text-gray-700 text-sm leading-relaxed break-words overflow-y-auto max-h-[100px] pr-1 scrollbar-thin scrollbar-thumb-[#7BC043]/40 scrollbar-track-transparent">
                          {c.contenido}
                        </p>
                      </div>

                      {/* 🔒 Solo el dueño y si es cliente puede ver botones */}
                      {esCliente && usuario.id === c.usuario_id && (
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => {
                              setEditando(c.id);
                              setNuevoContenido(c.contenido);
                            }}
                            className="p-2 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700 shadow-sm"
                            title="Editar comentario"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => eliminarComentario(c.id)}
                            className="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-700 shadow-sm"
                            title="Eliminar comentario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => scroll("right")}
              className="absolute right-[-50px] bg-[#2E5430] text-white w-10 h-10 rounded-full shadow-md hover:bg-[#7BC043] transition-all z-10"
            >
              ›
            </button>
          </div>
        )}
      </div>

     {/* === FORMULARIO (solo clientes) === */}
    {esCliente && (
    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-[#8B6B4A]/30 p-10">
        {/* === MENSAJES ARRIBA === */}
        {mensaje.texto && (
        <div
            className={`mb-6 flex items-center justify-center gap-3 text-center p-3 rounded-lg border transition-all duration-700 ease-in-out ${
                mensaje.texto ? "opacity-100" : "opacity-0"
            } ${

            mensaje.tipo === "success"
                ? "bg-green-50 border-green-500 text-[#2E5430]"
                : "bg-red-50 border-red-500 text-red-700"
            }`}
        >
            {mensaje.tipo === "success" ? (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
            >
                <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            ) : (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
            >
                <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            )}
            <span className="font-medium">{mensaje.texto}</span>
        </div>
        )}

        {/* === TÍTULO === */}
        <div className="flex flex-col items-center text-center mb-6">
        <h2 className="text-3xl font-extrabold text-[#2E5430] flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-[#2E5430]" />
            <span>Deja tu comentario</span>
        </h2>
        <p className="text-gray-600 text-sm sm:text-base mt-2 max-w-3xl">
            Cuéntanos tu experiencia o sugerencias para seguir mejorando nuestros servicios.
        </p>
        </div>

        {/* === FORM === */}
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-5 w-full">
        <textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            placeholder="Escribe aquí tu comentario..."
            className="w-full h-36 p-4 text-gray-700 border border-[#8B6B4A]/40 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7BC043]/40 focus:border-[#2E5430] resize-none"
            maxLength={180}
        ></textarea>

        <button
            type="submit"
            disabled={loading}
            className={`w-48 py-2.5 rounded-full font-semibold transition-all duration-300 shadow-md ${
            loading
                ? "bg-[#7BC043]/60 text-white cursor-not-allowed"
                : "bg-[#2E5430] hover:bg-[#7BC043] text-white hover:shadow-lg"
            }`}
        >
            {loading ? "Enviando..." : "Enviar comentario"}
        </button>
        </form>
    </div>
    )}

    </section>
  );
}

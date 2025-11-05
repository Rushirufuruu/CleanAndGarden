"use client";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useRouter } from "next/navigation";

// 🕐 Zona horaria Chile
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Santiago");

// ===============================
// Tipos
// ===============================
type Trabajador = {
  id: number;
  nombre: string;
  apellido: string | null;
  rol?: { codigo?: string; nombre?: string };
};

type Excepcion = {
  id: number;
  tipo: string;
  fecha?: string | null;
  desde?: string | null;
  hasta?: string | null;
  motivo: string;
  descripcion?: string | null;
  usuario_disponibilidad_excepcion_creado_porTousuario?: {
    nombre?: string;
    apellido?: string;
  };
};

// ===============================
// Componente principal
// ===============================
export default function GestionExcepciones() {
  const router = useRouter();
  const [excepciones, setExcepciones] = useState<Excepcion[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(false);

  const [tipo, setTipo] = useState("");
  const [fecha, setFecha] = useState("");
  const [rango, setRango] = useState({ desde: "", hasta: "" });
  const [tecnicoId, setTecnicoId] = useState<number | "">("");
  const [descripcion, setDescripcion] = useState("");

  // ===============================
  // Manejo de sesión / errores auth
  // ===============================
  const handleAuthError = async (status: number) => {
    if (status === 401 || status === 403) {
      await Swal.fire({
        icon: "warning",
        title: "Sesión expirada o no autorizada",
        text: "Por favor, inicia sesión nuevamente.",
        confirmButtonColor: "#2E5430",
      });
      router.push("/login");
      return true;
    }
    return false;
  };

  // ===============================
  // Cargar datos
  // ===============================
  const fetchExcepciones = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/excepciones`, {
        credentials: "include",
      });
      if (await handleAuthError(res.status)) return;
      const data = await res.json();

      // 🧠 Le decimos explícitamente a TypeScript qué tipo de datos recibimos
      setExcepciones((data.data || []) as Excepcion[]);
    } catch {
      Swal.fire("Error", "No se pudieron obtener las excepciones", "error");
    } finally {
      setLoading(false);
    }
  };


  const fetchTrabajadores = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/trabajadores-con-horarios`, {
        credentials: "include",
      });
      if (await handleAuthError(res.status)) return;
      const data = await res.json();
      setTrabajadores(data || []);
    } catch {
      console.error("Error al cargar trabajadores con horarios");
    }
  };

  useEffect(() => {
    fetchExcepciones();
    fetchTrabajadores();
  }, []);

  // ===============================
  // Validaciones frontend
  // ===============================
  const validarFormulario = () => {
    if (!tipo) {
      Swal.fire("Atención", "Selecciona un tipo de excepción", "warning");
      return false;
    }

    if (["feriado_irrenunciable", "dia_completo"].includes(tipo)) {
      if (!fecha) {
        Swal.fire("Atención", "Selecciona una fecha", "warning");
        return false;
      }
    } else {
      if (!rango.desde || !rango.hasta) {
        Swal.fire("Atención", "Completa el rango de fechas", "warning");
        return false;
      }
      if (dayjs(rango.hasta).isBefore(dayjs(rango.desde))) {
        Swal.fire("Atención", "La fecha 'Hasta' no puede ser menor que 'Desde'", "warning");
        return false;
      }
      if (!tecnicoId) {
        Swal.fire("Atención", "Selecciona el trabajador", "warning");
        return false;
      }
    }

    return true;
  };

  // ===============================
  // Crear excepción
  // ===============================
  const handleCrear = async () => {
    if (!validarFormulario()) return;

    const body: any = { tipo, descripcion: descripcion.trim() || undefined };

    if (["feriado_irrenunciable", "dia_completo"].includes(tipo)) {
      body.fecha = fecha;
    } else {
      body.rango = rango;
      body.tecnico_id = Number(tecnicoId);
    }

    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/excepciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (await handleAuthError(res.status)) return;
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error al crear excepción");

      if (data.error?.includes("No se creó") || data.error?.includes("No existen")) {
        await Swal.fire("Atención", data.error, "warning");
      } else {
        await Swal.fire("✅ Éxito", data.message, "success");
      }

      setTipo("");
      setFecha("");
      setRango({ desde: "", hasta: "" });
      setDescripcion("");
      setTecnicoId("");
      fetchExcepciones();
    } catch (err: any) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  

      // ===============================
    // ✏️ Editar excepción existente
    // ===============================
    // ===============================
// ✏️ Editar excepción existente (con estilo elegante)
// ===============================
const handleEditar = async (g: any) => {
  const isGlobal = ["feriado_irrenunciable", "dia_completo"].includes(g.tipo);

  const { value: formValues } = await Swal.fire({
    title: "Editar Excepción",
    html: `
      <div style="
        text-align: left;
        font-family: 'Inter', sans-serif;
        color: #3C5233;
        background-color: #F7F4EF;
        padding: 10px;
        border-radius: 12px;
      ">
        <label style="display:block; margin-bottom:6px; font-weight:600;">Tipo</label>
        <select id="swal-tipo" style="
          width:100%;
          padding:8px;
          border:1px solid #A47551;
          border-radius:8px;
          background:#FFF;
          color:#3C5233;
          font-size:14px;
          margin-bottom:14px;
        ">
          <option value="">Seleccionar tipo...</option>
          <option value="feriado_irrenunciable" ${g.tipo === "feriado_irrenunciable" ? "selected" : ""}>Feriado irrenunciable</option>
          <option value="dia_completo" ${g.tipo === "dia_completo" ? "selected" : ""}>Día completo</option>
          <option value="vacaciones" ${g.tipo === "vacaciones" ? "selected" : ""}>Vacaciones</option>
          <option value="licencia" ${g.tipo === "licencia" ? "selected" : ""}>Licencia</option>
          <option value="permiso" ${g.tipo === "permiso" ? "selected" : ""}>Permiso</option>
        </select>

        ${
          isGlobal
            ? `
              <label style="display:block; margin-bottom:6px; font-weight:600;">Fecha</label>
              <input type="date" id="swal-fecha" value="${g.desde ?? ""}" style="
                width:100%;
                padding:8px;
                border:1px solid #A47551;
                border-radius:8px;
                background:#FFF;
                color:#3C5233;
                font-size:14px;
                margin-bottom:14px;
              "/>
            `
            : `
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div>
                  <label style="display:block; margin-bottom:6px; font-weight:600;">Desde</label>
                  <input type="date" id="swal-desde" value="${g.desde ?? ""}" style="
                    width:100%;
                    padding:8px;
                    border:1px solid #A47551;
                    border-radius:8px;
                    background:#FFF;
                    color:#3C5233;
                    font-size:14px;
                  "/>
                </div>
                <div>
                  <label style="display:block; margin-bottom:6px; font-weight:600;">Hasta</label>
                  <input type="date" id="swal-hasta" value="${g.hasta ?? ""}" style="
                    width:100%;
                    padding:8px;
                    border:1px solid #A47551;
                    border-radius:8px;
                    background:#FFF;
                    color:#3C5233;
                    font-size:14px;
                  "/>
                </div>
              </div>
              <br/>
            `
        }

        <label style="display:block; margin-bottom:6px; font-weight:600;">Descripción</label>
        <textarea id="swal-descripcion" rows="3" style="
          width:100%;
          padding:8px;
          border:1px solid #A47551;
          border-radius:8px;
          background:#FFF;
          color:#3C5233;
          font-size:14px;
          resize:none;
        ">${g.descripcion ?? ""}</textarea>
      </div>
    `,
    focusConfirm: false,
    confirmButtonText: " Guardar cambios",
    confirmButtonColor: "#3C5233",
    showCancelButton: true,
    cancelButtonText: "Cancelar",
    cancelButtonColor: "#A23E2A",
    background: "#FFFFFF",
    customClass: {
      popup: "rounded-2xl shadow-lg",
    },
    preConfirm: () => {
      const tipo = (document.getElementById("swal-tipo") as HTMLSelectElement).value;
      const descripcion = (document.getElementById("swal-descripcion") as HTMLTextAreaElement).value.trim();
      const fecha = (document.getElementById("swal-fecha") as HTMLInputElement)?.value || null;
      const desde = (document.getElementById("swal-desde") as HTMLInputElement)?.value || null;
      const hasta = (document.getElementById("swal-hasta") as HTMLInputElement)?.value || null;
      return { tipo, descripcion, fecha, rango: { desde, hasta } };
    },
  });

  if (!formValues) return;

  if (!formValues.tipo) {
    return Swal.fire("Atención", "Debes seleccionar un tipo de excepción.", "warning");
  }

  try {
    setLoading(true);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/excepciones/${g.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(formValues),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al modificar excepción");

    await Swal.fire({
      icon: "success",
      title: "✅ Cambios guardados",
      text: "La excepción se actualizó correctamente.",
      confirmButtonColor: "#3C5233",
      background: "#F7F4EF",
    });

    fetchExcepciones();
  } catch (err: any) {
    Swal.fire("Error", err.message, "error");
  } finally {
    setLoading(false);
  }
};


    // ===============================
  // 🗑️ Eliminar excepción individual
  // ===============================
  const handleEliminarExcepcion = async (id: number) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar esta excepción?",
      text: "Se restaurarán los horarios que estaban bloqueados por esta excepción.",
      showCancelButton: true,
      confirmButtonColor: "#2E5430",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!confirm.isConfirmed) return;

    try {
      setLoading(true);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/excepciones/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error al eliminar excepción");

      await Swal.fire("✅ Éxito", data.message, "success");
      fetchExcepciones(); // refresca la tabla
    } catch (err: any) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };


  // 🧱 Tipo para agrupar excepciones en la tabla
  type GrupoExcepcion = {
    id: number;
    tipo: string;
    tecnico?: string;
    desde: string;
    hasta: string;
    motivo: string;
    descripcion?: string | null;
    creado_por: string;
  };

  // ===============================
  // Render
  // ===============================
  return (
  <div className="p-8 bg-[#F7F4EF] min-h-screen">
    <h1 className="text-3xl font-bold text-[#3C5233] mb-6">
       Gestión de Excepciones
    </h1>

    {/* FORMULARIO */}
    <div className="bg-white p-6 rounded-xl shadow-md border border-[#D9C7B1] mb-8">
      <h2 className="text-xl font-semibold text-[#3C5233] mb-4">
        Nueva Excepción
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-[#3C5233] mb-1">
            Tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="border border-[#A47551]/60 rounded-md p-2.5 w-full bg-[#F7F4EF] text-[#3C5233] focus:ring-2 focus:ring-[#6B8E23] outline-none"
          >
            <option value="">Seleccionar tipo...</option>
            <option value="feriado_irrenunciable">Feriado irrenunciable</option>
            <option value="dia_completo">Día completo</option>
            <option value="vacaciones">Vacaciones</option>
            <option value="licencia">Licencia</option>
            <option value="permiso">Permiso</option>
          </select>
        </div>

        {/* Trabajador */}
        {["vacaciones", "licencia", "permiso"].includes(tipo) && (
          <div>
            <label className="block text-sm font-medium text-[#3C5233] mb-1">
              Trabajador
            </label>
            <select
              value={tecnicoId}
              onChange={(e) =>
                setTecnicoId(e.target.value ? Number(e.target.value) : "")
              }
              className="border border-[#A47551]/60 rounded-md p-2.5 w-full bg-[#F7F4EF] text-[#3C5233] focus:ring-2 focus:ring-[#6B8E23] outline-none"
            >
              <option value="">Seleccionar trabajador...</option>
              {trabajadores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} {t.apellido ?? ""} ({t.rol?.codigo ?? ""})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Fecha o rango */}
        {!tipo ||
        ["feriado_irrenunciable", "dia_completo"].includes(tipo) ? (
          <div>
            <label className="block text-sm font-medium text-[#3C5233] mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="border border-[#A47551]/60 rounded-md p-2.5 w-full bg-[#F7F4EF] text-[#3C5233] focus:ring-2 focus:ring-[#6B8E23] outline-none"
            />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-[#3C5233] mb-1">
                Desde
              </label>
              <input
                type="date"
                value={rango.desde}
                onChange={(e) =>
                  setRango({ ...rango, desde: e.target.value })
                }
                className="border border-[#A47551]/60 rounded-md p-2.5 w-full bg-[#F7F4EF] text-[#3C5233] focus:ring-2 focus:ring-[#6B8E23] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3C5233] mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={rango.hasta}
                onChange={(e) =>
                  setRango({ ...rango, hasta: e.target.value })
                }
                className="border border-[#A47551]/60 rounded-md p-2.5 w-full bg-[#F7F4EF] text-[#3C5233] focus:ring-2 focus:ring-[#6B8E23] outline-none"
              />
            </div>
          </>
        )}

        {/* Descripción */}
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-[#3C5233] mb-1">
            Descripción (opcional)
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            className="border border-[#A47551]/60 rounded-md p-2.5 w-full bg-[#F7F4EF] text-[#3C5233] focus:ring-2 focus:ring-[#6B8E23] outline-none"
          />
        </div>
      </div>

      <button
        onClick={handleCrear}
        disabled={loading}
        className="mt-5 bg-[#3C5233] text-white px-6 py-2 rounded-md hover:bg-[#2E3E25] transition-all disabled:opacity-60"
      >
        {loading ? "Procesando..." : "Crear excepción"}
      </button>
    </div>

    {/* LISTADO */}
    <div className="bg-white p-6 rounded-xl shadow-md border border-[#D9C7B1]">
      <h2 className="text-xl font-semibold text-[#3C5233] mb-4">
        Listado de Excepciones
      </h2>

      {loading ? (
        <p className="text-[#A47551]">Cargando...</p>
      ) : excepciones.length === 0 ? (
        <p className="text-[#A47551]">No hay excepciones registradas</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#D9C7B1]">
          <table className="w-full border-collapse text-center rounded-xl overflow-hidden">
            <thead className="bg-[#3C5233] text-white">
              <tr>
                <th className="border border-[#D9C7B1] p-3">Motivo</th>
                <th className="border border-[#D9C7B1] p-3">Fecha</th>
                <th className="border border-[#D9C7B1] p-3">Descripción</th>
                <th className="border border-[#D9C7B1] p-3">Creado por</th>
                <th className="border border-[#D9C7B1] p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const sorted = [...excepciones].sort((a, b) => {
                  const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0;
                  const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0;
                  return fechaA - fechaB;
                });

                const grupos: GrupoExcepcion[] = [];
                const findGroup = (tipo: string, tecnico: string | undefined) =>
                  grupos.find((g) => g.tipo === tipo && g.tecnico === tecnico);

                for (const ex of sorted) {
                  const tipo = ex.tipo;
                  const tecnico = ex.motivo?.split(":")[1]?.trim() || undefined;

                  const fecha = ex.fecha
                    ? dayjs.tz(ex.fecha, "America/Santiago").format("YYYY-MM-DD")
                    : null;
                  const desde = (ex as any).desde
                    ? dayjs
                        .tz((ex as any).desde, "America/Santiago")
                        .format("YYYY-MM-DD")
                    : fecha;
                  const hasta = (ex as any).hasta
                    ? dayjs
                        .tz((ex as any).hasta, "America/Santiago")
                        .format("YYYY-MM-DD")
                    : fecha;

                  if (["vacaciones", "licencia", "permiso"].includes(tipo)) {
                    const grupo = findGroup(tipo, tecnico);
                    if (!grupo) {
                      grupos.push({
                        id: ex.id,
                        tipo,
                        tecnico,
                        desde: desde || fecha || "—",
                        hasta: hasta || fecha || "—",
                        motivo: ex.motivo,
                        descripcion: ex.descripcion,
                        creado_por:
                          ex.usuario_disponibilidad_excepcion_creado_porTousuario
                            ? `${ex.usuario_disponibilidad_excepcion_creado_porTousuario.nombre ?? ""} ${
                                ex.usuario_disponibilidad_excepcion_creado_porTousuario.apellido ?? ""
                              }`
                            : "—",
                      });
                    } else {
                      if (desde && desde < grupo.desde) grupo.desde = desde;
                      if (hasta && hasta > grupo.hasta) grupo.hasta = hasta;
                    }
                  } else {
                    grupos.push({
                      id: ex.id,
                      tipo,
                      tecnico: undefined,
                      desde: fecha || desde || "—",
                      hasta: fecha || hasta || "—",
                      motivo: ex.motivo,
                      descripcion: ex.descripcion,
                      creado_por:
                        ex.usuario_disponibilidad_excepcion_creado_porTousuario
                          ? `${ex.usuario_disponibilidad_excepcion_creado_porTousuario.nombre ?? ""} ${
                              ex.usuario_disponibilidad_excepcion_creado_porTousuario.apellido ?? ""
                            }`
                          : "—",
                    });
                  }
                }

                return grupos.map((g, i) => (
                  <tr
                    key={i}
                    className="hover:bg-[#F7F4EF] border-b border-[#E8DED0] transition-colors"
                  >
                    <td className="border border-[#E8DED0] p-2 text-[#3C5233] font-medium">
                      {g.motivo}
                    </td>
                    <td className="border border-[#E8DED0] p-2 text-[#3C5233]">
                      {(() => {
                        const formatCL = (iso?: string) => {
                          if (!iso) return null;
                          const parsed = dayjs(iso);
                          if (!parsed.isValid()) return null;
                          return parsed
                            .tz("America/Santiago")
                            .format("DD/MM/YYYY");
                        };

                        const isGlobal = [
                          "feriado_irrenunciable",
                          "dia_completo",
                        ].includes(g.tipo);

                        const fechaDesde = formatCL(g.desde);
                        const fechaHasta = formatCL(g.hasta);

                        if (isGlobal) return fechaDesde || "—";
                        if (
                          fechaDesde &&
                          fechaHasta &&
                          fechaDesde !== fechaHasta
                        ) {
                          return `${fechaDesde} → ${fechaHasta}`;
                        }
                        return fechaDesde || "—";
                      })()}
                    </td>
                    <td className="border border-[#E8DED0] p-2 text-[#5A4635]">
                      {g.descripcion ?? "—"}
                    </td>
                    <td className="border border-[#E8DED0] p-2 text-[#5A4635]">
                      {g.creado_por}
                    </td>
                    <td className="border border-[#E8DED0] p-2 flex justify-center gap-3">
                      <button
                        onClick={() => handleEditar(g)}
                        className="px-4 py-1.5 rounded-md bg-[#6B8E23] hover:bg-[#5C7A1E] text-white font-medium shadow-sm transition-all"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminarExcepcion(g.id)}
                        className="px-4 py-1.5 rounded-md bg-[#A23E2A] hover:bg-[#8F3524] text-white font-medium shadow-sm transition-all"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
);
}
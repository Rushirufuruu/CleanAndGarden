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
  fecha: string;
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
      const res = await fetch("http://localhost:3001/admin/excepciones", {
        credentials: "include",
      });
      if (await handleAuthError(res.status)) return;
      const data = await res.json();
      setExcepciones(data.data || []);
    } catch {
      Swal.fire("Error", "No se pudieron obtener las excepciones", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrabajadores = async () => {
    try {
      const res = await fetch("http://localhost:3001/admin/trabajadores-con-horarios", {
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
      const res = await fetch("http://localhost:3001/admin/excepciones", {
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
  // Eliminar grupo completo
  // ===============================
  const handleEliminarGrupo = async (motivo: string, desde: string, hasta: string) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar grupo de excepciones?",
      text: `Se eliminarán todas las excepciones del rango ${desde} → ${hasta}.`,
      showCancelButton: true,
      confirmButtonColor: "#2E5430",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;

    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3001/admin/excepciones/eliminar-grupo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ motivo, desde, hasta }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar grupo");
      await Swal.fire("✅ Éxito", data.message, "success");
      fetchExcepciones();
    } catch (err: any) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // Render
  // ===============================
  return (
    <div className="p-6 bg-[#FAF8F3] min-h-screen">
      <h1 className="text-3xl font-bold text-[#2E5430] mb-6">Gestión de Excepciones</h1>

      {/* Formulario */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Nueva Excepción</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="border border-gray-300 rounded-md p-2 w-full"
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
              <label className="block text-sm font-medium mb-1">Trabajador</label>
              <select
                value={tecnicoId}
                onChange={(e) =>
                  setTecnicoId(e.target.value ? Number(e.target.value) : "")
                }
                className="border border-gray-300 rounded-md p-2 w-full"
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
              <label className="block text-sm font-medium mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="border border-gray-300 rounded-md p-2 w-full"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Desde</label>
                <input
                  type="date"
                  value={rango.desde}
                  onChange={(e) =>
                    setRango({ ...rango, desde: e.target.value })
                  }
                  className="border border-gray-300 rounded-md p-2 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hasta</label>
                <input
                  type="date"
                  value={rango.hasta}
                  onChange={(e) =>
                    setRango({ ...rango, hasta: e.target.value })
                  }
                  className="border border-gray-300 rounded-md p-2 w-full"
                />
              </div>
            </>
          )}

          {/* Descripción */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium mb-1">
              Descripción (opcional)
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="border border-gray-300 rounded-md p-2 w-full"
            />
          </div>
        </div>

        <button
          onClick={handleCrear}
          disabled={loading}
          className="mt-4 bg-[#2E5430] text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-60"
        >
          {loading ? "Procesando..." : "Crear excepción"}
        </button>
      </div>

      {/* Listado */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Listado de Excepciones</h2>

        {loading ? (
          <p>Cargando...</p>
        ) : excepciones.length === 0 ? (
          <p>No hay excepciones registradas</p>
        ) : (
          <table className="w-full border-collapse border border-gray-200 text-center">
            <thead className="bg-[#FAF8F3]">
              <tr>
                <th className="border p-2">Motivo</th>
                <th className="border p-2">Fecha</th>
                <th className="border p-2">Descripción</th>
                <th className="border p-2">Creado por</th>
                <th className="border p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const sorted = [...excepciones].sort(
                  (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
                );

                const grupos: {
                  tipo: string;
                  tecnico?: string;
                  desde: string;
                  hasta: string;
                  motivo: string;
                  descripcion?: string | null;
                  creado_por: string;
                }[] = [];

                const findGroup = (tipo: string, tecnico: string | undefined) =>
                  grupos.find((g) => g.tipo === tipo && g.tecnico === tecnico);

                for (const ex of sorted) {
                  const tipo = ex.tipo;
                  const tecnico = ex.motivo?.split(":")[1]?.trim() || undefined;
                  const fecha = dayjs.tz(ex.fecha, "America/Santiago").format("YYYY-MM-DD");

                  if (["vacaciones", "licencia", "permiso"].includes(tipo)) {
                    const grupo = findGroup(tipo, tecnico);
                    if (!grupo) {
                      grupos.push({
                        tipo,
                        tecnico,
                        desde: fecha,
                        hasta: fecha,
                        motivo: ex.motivo,
                        descripcion: ex.descripcion,
                        creado_por:
                          ex.usuario_disponibilidad_excepcion_creado_porTousuario
                            ? `${ex.usuario_disponibilidad_excepcion_creado_porTousuario.nombre ?? ""} ${ex.usuario_disponibilidad_excepcion_creado_porTousuario.apellido ?? ""}`
                            : "—",
                      });
                    } else {
                      if (fecha < grupo.desde) grupo.desde = fecha;
                      if (fecha > grupo.hasta) grupo.hasta = fecha;
                    }
                  } else {
                    grupos.push({
                      tipo,
                      tecnico: undefined,
                      desde: fecha,
                      hasta: fecha,
                      motivo: ex.motivo,
                      descripcion: ex.descripcion,
                      creado_por:
                        ex.usuario_disponibilidad_excepcion_creado_porTousuario
                          ? `${ex.usuario_disponibilidad_excepcion_creado_porTousuario.nombre ?? ""} ${ex.usuario_disponibilidad_excepcion_creado_porTousuario.apellido ?? ""}`
                          : "—",
                    });
                  }
                }

                return grupos.map((g, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="border p-2">{g.motivo}</td>
                    <td className="border p-2 text-center">
                      {g.desde === g.hasta ? g.desde : `${g.desde} → ${g.hasta}`}
                    </td>
                    <td className="border p-2">{g.descripcion ?? "—"}</td>
                    <td className="border p-2">{g.creado_por}</td>
                    <td className="border p-2">
                      <button
                        onClick={() => handleEliminarGrupo(g.motivo, g.desde, g.hasta)}
                        className="text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
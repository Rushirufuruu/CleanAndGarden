
"use client";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

/**
 * Paleta "Clean & Garden"
 * - Verde oscuro: #2E5430
 * - Verde manzana: #7BC043
 * - Café suave (bordes): #8B6B4A
 * - Marfil/crema: #FAF8F3
 */

type Slot = {
  id?: number | string;
  tecnico_id: number;
  fecha: string; // ISO Date-only or DateTime
  hora_inicio: string; // ISO DateTime
  hora_fin: string; // ISO DateTime
  cupos_totales?: number;
  cupos_ocupados?: number;
  usuario?: {
    nombre?: string;
    apellido?: string;
    rol?: { codigo?: string };
  };
};

export default function GestionHorarios() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [form, setForm] = useState({
    desde: "",
    hasta: "",
    horaInicio: "08:00",
    horaFin: "18:00",
    duracion: 60,
    descanso: 30,
    dias: [1, 2, 3, 4, 5], // lun-vie
    trabajadores: [] as number[],
    modo: "preview" as "preview" | "append" | "replace",
  });

  const [preview, setPreview] = useState<Slot[]>([]);
  const [guardados, setGuardados] = useState<Slot[]>([]);
  const [mesActual, setMesActual] = useState<Date>(new Date());
  const [filtroTrabajador, setFiltroTrabajador] = useState<number | null>(null);

  // ===== Helpers de fecha y agrupación (corregidos) =====
  const toLocalDateKey = (iso: string | Date) => {
    if (typeof iso === "string") {
      // Si viene como "2025-10-21T00:00:00.000Z", tomamos solo la parte de fecha
      if (iso.includes("T")) return iso.split("T")[0];
      // Si ya viene como "YYYY-MM-DD", se deja igual
      return iso;
    }
    // Si es Date, generamos fecha local sin usar toISOString()
    const y = iso.getFullYear();
    const m = String(iso.getMonth() + 1).padStart(2, "0");
    const d = String(iso.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const formatDateCL = (iso: string | Date) => {
    if (typeof iso === "string") {
      const base = iso.includes("T") ? iso.split("T")[0] : iso;
      const [y, m, d] = base.split("-");
      return `${d}/${m}/${y}`;
    }
    const fecha = iso instanceof Date ? iso : new Date(iso);
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    return `${d}/${m}/${y}`;
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });

  // Todas las fechas (YYYY-MM-DD) del mes visible
  const daysOfMonth = useMemo(() => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();
    const last = new Date(year, month + 1, 0).getDate();
    const arr: string[] = [];
    for (let i = 1; i <= last; i++) {
      arr.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`);
    }
    return arr;
  }, [mesActual]);

  // Agrupar por YYYY-MM-DD
  const groupByDate = (slots: Slot[]) => {
    const map: Record<string, Slot[]> = {};
    for (const s of slots || []) {
      const k = toLocalDateKey(s.fecha);
      if (!map[k]) map[k] = [];
      map[k].push(s);
    }
    return map;
  };

  const groupedSaved = useMemo(() => groupByDate(guardados), [guardados]);
  const groupedPreview = useMemo(() => groupByDate(preview), [preview]);
  const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"


  // ¿Es fin de semana?
  const isWeekend = (yyyy_mm_dd: string) => {
    const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
    const date = new Date(y, (m as number) - 1, d);
    const dow = date.getDay();
    return dow === 0 || dow === 6; // dom/sáb
  };

  // ===== Cargar usuarios con disponibilidad =====
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/disponibilidad/usuarios`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then(setUsuarios)
      .catch(() =>
        Swal.fire("Error", "No se pudieron cargar los trabajadores", "error")
      );
  }, []);

  // ===== Cargar horarios guardados del mes =====
  useEffect(() => {
    cargarGuardados(mesActual);
  }, [mesActual]);

  const cargarGuardados = async (fechaBase: Date) => {
    const mes = `${fechaBase.getFullYear()}-${String(fechaBase.getMonth() + 1).padStart(2, "0")}`;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/disponibilidad-mensual?mes=${mes}`,
        { credentials: "include" }
      );
      const json = await res.json();
      const data = Array.isArray(json) ? json : json.data;
      setGuardados(Array.isArray(data) ? (data as Slot[]) : []);
    } catch {
      Swal.fire("Error", "No se pudieron cargar los horarios guardados", "error");
    }
  };

  // ===== Generar (preview/append/replace) =====
  const generar = async (modo: "preview" | "append" | "replace") => {
    if (!form.desde || !form.hasta) {
      Swal.fire("Faltan fechas", "Selecciona fecha inicio y fin.", "warning");
      return;
    }
    if (form.trabajadores.length === 0) {
      Swal.fire("Faltan trabajadores", "Selecciona al menos uno.", "warning");
      return;
    }

    const body = {
      periodo: { desde: form.desde, hasta: form.hasta },
      jornada: { horaInicio: form.horaInicio, horaFin: form.horaFin },
      reglas: {
        duracionMin: form.duracion,
        descansoMin: form.descanso,
        diasSemana: form.dias,
      },
      trabajadores: form.trabajadores.map(Number),
      modo,
    };

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/disponibilidad-mensual/generar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        Swal.fire("Error", data?.error || "No se pudo generar", "error");
        return;
      }

      if (modo === "preview") {
        setPreview((data.data || data.muestra || []) as Slot[]);
        Swal.fire({
          icon: "info",
          title: "Vista previa generada",
          text: "Revisa el calendario (no guarda cambios aún).",
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        setPreview([]);
        Swal.fire({
          icon: "success",
          title: "Horarios guardados",
          text:
            modo === "append"
              ? "Se agregaron nuevos horarios."
              : "Mes reemplazado correctamente.",
          timer: 1800,
          showConfirmButton: false,
        });
        cargarGuardados(mesActual);
      }
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo conectar con el servidor", "error");
    }
  };

  // ===== Navegación mensual =====
  const cambiarMes = (delta: number) => {
    const next = new Date(mesActual);
    next.setMonth(next.getMonth() + delta);
    setMesActual(next);
  };

  // 🗑️ Eliminar slot (nuevo)
  const eliminarSlot = async (id: number | string) => {
    const confirmar = await Swal.fire({
      title: "¿Eliminar horario?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!confirmar.isConfirmed) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/disponibilidad-mensual/${id}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error();
      Swal.fire("Eliminado", "Horario eliminado correctamente.", "success");
      cargarGuardados(mesActual);
    } catch {
      Swal.fire("Error", "No se pudo eliminar el horario", "error");
    }
  };

  // ❌ Eliminar todos los horarios del mes actual
  const eliminarMes = async () => {
    const mes = `${mesActual.getFullYear()}-${String(mesActual.getMonth() + 1).padStart(2, "0")}`;

    const confirmar = await Swal.fire({
      title: "¿Eliminar todos los horarios?",
      text: `Se eliminarán todos los horarios del mes ${mes}. Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar todo",
      cancelButtonText: "Cancelar",
    });
    if (!confirmar.isConfirmed) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/disponibilidad-mensual/eliminar-mes?mes=${mes}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error("Fallo en eliminación");
      Swal.fire({
        icon: "success",
        title: "Mes eliminado",
        text: "Todos los horarios del mes fueron eliminados correctamente.",
        timer: 2000,
        showConfirmButton: false,
      });
      cargarGuardados(mesActual);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudieron eliminar los horarios del mes", "error");
    }
  };


  // ✏️ Editar horario (hora de inicio y fin)
  const editarSlot = async (slot: Slot) => {
    // === extraer hora base robustamente ===
    const obtenerHora = (valor: string) => {
      if (!valor) return "08:00";
      if (valor.includes("T")) return valor.split("T")[1].slice(0, 5); // ej. "2025-10-22T08:00:00" → "08:00"
      if (valor.includes(" ")) return valor.split(" ")[1].slice(0, 5); // ej. "2025-10-22 08:00:00" → "08:00"
      return valor.slice(0, 5);
    };

    const horaInicioActual = obtenerHora(slot.hora_inicio);
    const horaFinActual = obtenerHora(slot.hora_fin);

    // === abrir modal ===
    const { value: formValues } = await Swal.fire({
      title: "Editar horario",
      html: `
        <div style="text-align:left">
          <label style="display:block;margin-bottom:4px;">Hora de inicio:</label>
          <input id="horaInicio" type="time" value="${horaInicioActual}"
            style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px">
          <label style="display:block;margin-top:8px;margin-bottom:4px;">Hora de fin:</label>
          <input id="horaFin" type="time" value="${horaFinActual}"
            style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Guardar cambios",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const horaInicio = (document.getElementById("horaInicio") as HTMLInputElement)?.value;
        const horaFin = (document.getElementById("horaFin") as HTMLInputElement)?.value;
        if (!horaInicio || !horaFin) {
          Swal.showValidationMessage("Ambas horas son obligatorias");
          return null;
        }
        if (horaFin <= horaInicio) {
          Swal.showValidationMessage("La hora de fin debe ser mayor a la de inicio");
          return null;
        }
        return { horaInicio, horaFin };
      },
    });

    if (!formValues) return;

    try {
      const fechaBase = slot.fecha.includes("T")
        ? slot.fecha.split("T")[0]
        : slot.fecha.split(" ")[0] || slot.fecha;

      // construimos formato ISO local (sin Z final)
      const nuevaHoraInicio = `${fechaBase}T${formValues.horaInicio}:00`;
      const nuevaHoraFin = `${fechaBase}T${formValues.horaFin}:00`;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/disponibilidad-mensual/${slot.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            hora_inicio: nuevaHoraInicio,
            hora_fin: nuevaHoraFin,
          }),
        }
      );

      if (!res.ok) throw new Error("Fallo en PUT");

      Swal.fire({
        icon: "success",
        title: "Horario actualizado",
        text: "Los cambios se guardaron correctamente.",
        timer: 1800,
        showConfirmButton: false,
      });
      cargarGuardados(mesActual);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudo actualizar el horario", "error");
    }
  };


  // ===== UI =====
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF8F3" }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#2E5430" }}>
            Gestión de Horarios
          </h1>
          <p className="text-sm" style={{ color: "#060606ff" }}>
            Crea y administra disponibilidad mensual de jardineros y técnicos.
          </p>
        </div>
      </div>

      {/* Panel de configuración */}
      <div className="px-6">
        <div
          className="rounded-2xl shadow p-6 grid lg:grid-cols-3 gap-6"
          style={{ backgroundColor: "white", border: "1px solid #EFE8DD" }}
        >
          {/* Columna 1: Fechas y horas */}
          <div>
            <h3 className="font-semibold mb-3" style={{ color: "#2E5430" }}>
              Rango y jornada
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: "#2E5430" }}>
                  Fecha inicio
                </label>
                <input
                  type="date"
                  min={today} // <-- evita seleccionar fechas pasadas
                  value={form.desde}
                  onChange={(e) => setForm({ ...form, desde: e.target.value })}
                  className="w-full rounded-md border px-3 py-2"
                  style={{ borderColor: "#8B6B4A33" }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: "#2E5430" }}>
                  Fecha fin
                </label>
                <input
                  type="date"
                  min={today} // <-- también aquí
                  value={form.hasta}
                  onChange={(e) => setForm({ ...form, hasta: e.target.value })}
                  className="w-full rounded-md border px-3 py-2"
                  style={{ borderColor: "#8B6B4A33" }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: "#2E5430" }}>
                  Hora inicio
                </label>
                <input
                  type="time"
                  value={form.horaInicio}
                  onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
                  className="w-full rounded-md border px-3 py-2"
                  style={{ borderColor: "#8B6B4A33" }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: "#2E5430" }}>
                  Hora fin
                </label>
                <input
                  type="time"
                  value={form.horaFin}
                  onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
                  className="w-full rounded-md border px-3 py-2"
                  style={{ borderColor: "#8B6B4A33" }}
                />
              </div>
            </div>
          </div>

          {/* Columna 2: Reglas */}
          <div>
            <h3 className="font-semibold mb-3" style={{ color: "#2E5430" }}>
              Reglas de generación
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: "#2E5430" }}>
                  Duración (min)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.duracion.toString()}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, ""); // solo dígitos
                    setForm({ ...form, duracion: v === "" ? 0 : Number(v) });
                  }}
                  className="w-full rounded-md border px-3 py-2"
                  style={{ borderColor: "#8B6B4A33" }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: "#2E5430" }}>
                  Descanso (min)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.descanso.toString()}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setForm({ ...form, descanso: v === "" ? 0 : Number(v) });
                  }}
                  className="w-full rounded-md border px-3 py-2"
                  style={{ borderColor: "#8B6B4A33" }}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm mb-2" style={{ color: "#2E5430" }}>
                Días activos
              </label>
              <div className="flex flex-wrap gap-2">
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d, i) => {
                  const active = form.dias.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          dias: active ? f.dias.filter((x) => x !== i) : [...f.dias, i],
                        }))
                      }
                      className="px-3 py-1 rounded-md border text-sm"
                      style={{
                        borderColor: active ? "#2E5430" : "#8B6B4A33",
                        color: active ? "white" : "#2E5430",
                        backgroundColor: active ? "#2E5430" : "white",
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Columna 3: Trabajadores + acciones */}
          <div>
            <h3 className="font-semibold mb-3" style={{ color: "#2E5430" }}>
              Trabajadores
            </h3>
            <div
              className="rounded-md border p-3 max-h-44 overflow-auto"
              style={{ borderColor: "#8B6B4A33", backgroundColor: "#FFFFFF" }}
            >
              {usuarios.length === 0 ? (
                <p className="text-sm" style={{ color: "#8B6B4A" }}>
                  No hay trabajadores disponibles.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {usuarios.map((u) => {
                    const checked = form.trabajadores.includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setForm((f) => ({
                              ...f,
                              trabajadores: checked
                                ? f.trabajadores.filter((x) => x !== u.id)
                                : [...f.trabajadores, u.id],
                            }))
                          }
                        />
                        <span style={{ color: "#2E5430" }}>
                          {u.nombre} {u.apellido}{" "}
                          <span className="opacity-70">({u.rol?.codigo})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => generar("preview")}
                className="px-4 py-2 rounded-md font-semibold"
                style={{ backgroundColor: "#7BC043", color: "white" }}
              >
                 Vista previa
              </button>
              <button
                onClick={() => generar("append")}
                className="px-4 py-2 rounded-md font-semibold"
                style={{ backgroundColor: "#2E5430", color: "white" }}
              >
                 Guardar (agregar)
              </button>
              <button
                onClick={eliminarMes}
                className="px-4 py-2 rounded-md font-semibold"
                style={{ backgroundColor: "#B22222", color: "white" }}
              >
                 Eliminar mes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendario mensual */}
      <div className="px-6 mt-8 pb-12">
          {/* === Filtro por trabajador (nuevo) === */}
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm font-semibold" style={{ color: "#2E5430" }}>
            Filtrar por trabajador:
          </label>
          <select
            value={filtroTrabajador ?? ""}
            onChange={(e) =>
              setFiltroTrabajador(e.target.value ? Number(e.target.value) : null)
            }
            className="border rounded-md px-3 py-2 text-sm"
            style={{ borderColor: "#8B6B4A33" }}
          >
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} {u.apellido} ({u.rol?.codigo})
              </option>
            ))}
          </select>
        </div>
        <h3 className="text-xl font-semibold mb-3" style={{ color: "#2E5430" }}>
          Calendario del mes
        </h3>
        <div className="flex items-center gap-2 justify-end mb-4">
          <button
            onClick={() => cambiarMes(-1)}
            className="px-3 py-2 rounded-md border"
            style={{ borderColor: "#8B6B4A", color: "#2E5430", backgroundColor: "white" }}
          >
            ← Mes anterior
          </button>
          <span className="px-3 py-2 rounded-md font-semibold" style={{ color: "#2E5430" }}>
            {mesActual.toLocaleString("es-CL", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => cambiarMes(1)}
            className="px-3 py-2 rounded-md border"
            style={{ borderColor: "#8B6B4A", color: "#2E5430", backgroundColor: "white" }}
          >
            Mes siguiente →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
            <div
              key={d}
              className="text-center text-sm font-semibold py-2 rounded-md"
              style={{ backgroundColor: "#E9F3E5", color: "#2E5430" }}
            >
              {d}
            </div>
          ))}
        </div>

        {(() => {
          const y = mesActual.getFullYear();
          const m = mesActual.getMonth();
          const first = new Date(y, m, 1);
          let weekStartIndex = first.getDay() - 1;
          if (weekStartIndex < 0) weekStartIndex = 6;
          const cells: (string | null)[] = [];
          for (let i = 0; i < weekStartIndex; i++) cells.push(null);
          cells.push(...daysOfMonth);

          return (
            <div className="grid grid-cols-7 gap-2">
              {cells.map((dayKey, idx) => {
                if (dayKey === null) {
                  return <div key={`empty-${idx}`} className="h-full rounded-lg" />;
                }
                const isWE = isWeekend(dayKey);
                let savedSlots = groupedSaved[dayKey] || [];
                let previewSlots = groupedPreview[dayKey] || [];
                if (filtroTrabajador) {
                  savedSlots = savedSlots.filter((s) => Number(s.tecnico_id) === Number(filtroTrabajador));
                  previewSlots = previewSlots.filter((s) => Number(s.tecnico_id) === Number(filtroTrabajador));
                }


                return (
                  <div
                    key={dayKey}
                    className="rounded-lg p-2 min-h-[120px] shadow-sm border"
                    style={{
                      backgroundColor: isWE ? "#F4F1EC" : "white",
                      borderColor: "#EFE8DD",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold" style={{ color: "#2E5430" }}>
                        {formatDateCL(dayKey)}
                      </span>
                      {isWE && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "#E9E1D8", color: "#8B6B4A" }}
                        >
                          Fin de semana
                        </span>
                      )}
                    </div>

                    {previewSlots.length > 0 && (
                      <div className="mb-1">
                        {previewSlots.map((s, i) => (
                          <div
                            key={`p-${i}`}
                            className="text-xs px-2 py-1 rounded mb-1 border border-dashed"
                            style={{
                              backgroundColor: "#EAF6DD",
                              borderColor: "#7BC043",
                              color: "#2E5430",
                            }}
                          >
                            {formatTime(s.hora_inicio)}–{formatTime(s.hora_fin)} •{" "}
                            {s.usuario?.nombre} {s.usuario?.apellido ?? "Trabajador"}{" "}
                            <span className="opacity-70">
                              {s.usuario?.rol?.codigo ?? ""}
                            </span>
                            <span className="ml-1 text-[10px] opacity-70">(preview)</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {savedSlots.length > 0 ? (
                      savedSlots.map((s, i) => (
                        <div
                          key={`s-${i}`}
                          className="text-xs px-2 py-1 rounded mb-1 flex justify-between items-center"
                          style={{
                            backgroundColor: "#F0F8EC",
                            color: "#2E5430",
                            border: "1px solid #E3EAD8",
                          }}
                        >
                          <div className="min-w-0">
                            {formatTime(s.hora_inicio)}–{formatTime(s.hora_fin)} •{" "}
                            {s.usuario?.nombre} {s.usuario?.apellido ?? "Trabajador"}{" "}
                            <span className="opacity-70">
                              {s.usuario?.rol?.codigo ?? ""}
                            </span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => editarSlot(s)}
                              className="text-[10px] px-2 py-0.5 rounded bg-yellow-200 hover:bg-yellow-300"
                              title="Editar cupos"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => eliminarSlot(s.id!)}
                              className="text-[10px] px-2 py-0.5 rounded bg-red-200 hover:bg-red-300"
                              title="Eliminar slot"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                      ))
                    ) : previewSlots.length === 0 ? (
                      <p className="text-xs italic opacity-60">Sin horarios</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
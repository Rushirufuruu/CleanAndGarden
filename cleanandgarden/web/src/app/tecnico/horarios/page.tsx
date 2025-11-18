"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { Clock } from "lucide-react";
dayjs.locale("es");

type Evento = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  className: string;
  bloqueado?: boolean;
};

export default function CalendarioTecnico() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [mesActual, setMesActual] = useState(dayjs());
  const [modalEvento, setModalEvento] = useState<Evento | null>(null);

  // Cargar horarios del backend
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/tecnico/horarios`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setEventos(data))
      .catch(() => {});
  }, []);

  // Calcular rango del calendario
  const inicioMes = mesActual.startOf("month").startOf("week");
  const finMes = mesActual.endOf("month").endOf("week");

  const dias: dayjs.Dayjs[] = [];
  let d = inicioMes.clone();
  while (d.isBefore(finMes)) {
    dias.push(d.clone());
    d = d.add(1, "day");
  }

  const eventosDelDia = (dia: dayjs.Dayjs) =>
    eventos.filter((ev) => dayjs(ev.start).isSame(dia, "day"));

  return (
    <div className="p-6 bg-[#F5F7F2] min-h-screen">

      {/* TÍTULO */}
      <h1 className="text-4xl font-extrabold text-green-700 mb-8 text-center tracking-tight">
        Mis Horarios
      </h1>

      {/* CONTROLES */}
      <div className="flex items-center justify-between mb-6 max-w-4xl mx-auto">
        <button
          className="btn btn-outline btn-sm border-green-600 text-green-700 hover:bg-green-600 hover:text-white transition"
          onClick={() => setMesActual(mesActual.subtract(1, "month"))}
        >
          Mes anterior
        </button>

        <h2 className="text-2xl font-bold capitalize text-green-800">
          {mesActual.format("MMMM YYYY")}
        </h2>

        <button
          className="btn btn-outline btn-sm border-green-600 text-green-700 hover:bg-green-600 hover:text-white transition"
          onClick={() => setMesActual(mesActual.add(1, "month"))}
        >
          Mes siguiente
        </button>
      </div>

      {/* DÍAS DE LA SEMANA */}
      <div className="grid grid-cols-7 text-center font-semibold mb-2 text-gray-600 uppercase tracking-wide max-w-6xl mx-auto">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
          <div key={d} className="p-1">{d}</div>
        ))}
      </div>

      {/* GRID DEL CALENDARIO */}
      <div className="max-w-6xl mx-auto grid grid-cols-7 gap-2 md:gap-3">
        {dias.map((dia, index) => {
          const evs = eventosDelDia(dia);
          const esOtroMes = dia.month() !== mesActual.month();
          const esHoy = dia.isSame(dayjs(), "day");

          return (
            <div
              key={index}
              className={`rounded-xl p-3 bg-white min-h-[130px] shadow-sm border border-[#D7DED0] 
                hover:shadow-md transition-all flex flex-col
                ${esOtroMes ? "opacity-40" : ""}
                ${esHoy ? "ring-2 ring-emerald-400" : ""}`}
            >
              {/* Número del día */}
              <div className="font-bold text-gray-700 text-sm mb-1">
                {dia.format("D")}
              </div>

              {/* Eventos */}
              <div className="flex flex-col gap-1 overflow-y-auto pr-1">
                {/* Sin horarios */}
                {evs.length === 0 && (
                  <span className="text-xs text-gray-400 italic select-none mt-2">
                    Sin horarios
                  </span>
                )}

                {evs.map((ev) => {
                  const inicio = dayjs(ev.start).format("HH:mm");
                  const fin = ev.end ? dayjs(ev.end).format("HH:mm") : null;

                  // Paleta pastel Clean & Garden
                  let bg = "";
                  if (ev.className.includes("blue")) {
                    bg = "bg-blue-100/60 border border-blue-300/60 text-blue-800";
                  } else if (ev.className.includes("red")) {
                    bg = "bg-red-100/60 border border-red-300/60 text-red-800";
                  } else {
                    bg = "bg-green-100/60 border border-green-300/60 text-green-800";
                  }

                  return (
                    <div
                      key={ev.id}
                      onClick={() => setModalEvento(ev)}
                      className={`rounded-lg p-2 text-xs cursor-pointer shadow-sm 
                        hover:-translate-y-0.5 hover:shadow-md transition-all ${bg}`}
                    >
                      <div className="flex items-center gap-1 font-semibold text-[11px] opacity-80">
                        <Clock size={12} />
                        {ev.allDay ? "Todo el día" : `${inicio}${fin ? `–${fin}` : ""}`}
                      </div>

                      <div className="text-[11px] leading-tight mt-1">
                        {ev.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {modalEvento && (
        <dialog open className="modal">
          <div className="modal-box bg-white rounded-xl shadow-2xl border border-green-100">
            <h3 className="font-bold text-xl mb-4 text-green-700 flex items-center gap-2">
              Detalle del evento
            </h3>

            <div className="space-y-2 text-gray-700">
              <p>
                <strong className="text-green-800">Título:</strong>
                <br />
                {modalEvento.title}
              </p>

              <p>
                <strong className="text-green-800">Inicio:</strong>
                <br />
                {dayjs(modalEvento.start).format("DD/MM HH:mm")}
              </p>

              {modalEvento.end && (
                <p>
                  <strong className="text-green-800">Fin:</strong>
                  <br />
                  {dayjs(modalEvento.end).format("DD/MM HH:mm")}
                </p>
              )}
            </div>

            <div className="modal-action">
              <button
                className="btn bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setModalEvento(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

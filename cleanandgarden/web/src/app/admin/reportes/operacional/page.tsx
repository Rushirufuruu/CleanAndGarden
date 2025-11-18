"use client";

import { useState } from "react";
import {
  CalendarRange,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock3,
  Users,
  Leaf,
  ListTree,
  FileDown,
  FileSpreadsheet,
} from "lucide-react";

type ResumenOperacional = {
  totalCitas: number;
  pendientes: number;
  confirmadas: number;
  realizadas: number;
  canceladas: number;
  tasaRealizacion: number;
  tasaCancelacion: number;
};

type PorDiaItem = {
  fecha: string;
  total: number;
  pendientes: number;
  confirmadas: number;
  realizadas: number;
  canceladas: number;
};

type PorTecnicoItem = {
  tecnicoId: number | null;
  nombre: string;
  apellido: string;
  totalCitas: number;
  pendientes: number;
  confirmadas: number;
  realizadas: number;
  canceladas: number;
};

type PorServicioItem = {
  servicioId: number | null;
  nombreServicio: string;
  totalCitas: number;
  pendientes: number;
  confirmadas: number;
  realizadas: number;
  canceladas: number;
};

type DetalleItem = {
  id: number;
  fecha_hora: string;
  estado: string;
  cliente: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
  } | null;
  servicio: {
    id: number;
    nombre: string;
  } | null;
  tecnico: {
    id: number;
    nombre: string;
    apellido: string;
  } | null;
};

type ReporteOperacionalResponse = {
  resumen: ResumenOperacional;
  porDia: PorDiaItem[];
  porTecnico: PorTecnicoItem[];
  porServicio: PorServicioItem[];
  detalle: DetalleItem[];
};

export default function ReporteOperacional() {
  const [mes, setMes] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReporteOperacionalResponse | null>(null);

  const generarReporte = async () => {
    if (!mes) {
      alert("Selecciona un mes");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/reportes/operacional?mes=${mes}`,
        {
          credentials: "include",
        }
      );
      if (!res.ok) {
        throw new Error("Error al generar reporte");
      }
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
      alert("Error generando reporte operacional");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 EXPORTAR PDF
  const exportarPDF = async () => {
    if (!mes) {
      alert("Selecciona un mes");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/reportes/operacional/pdf?mes=${mes}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Error generando PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `reporte-operacional-${mes}.pdf`;
      link.click();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Error descargando PDF");
    }
  };

  // 🔥 EXPORTAR EXCEL
    const exportarExcel = async () => {
    if (!mes) {
        alert("Selecciona un mes");
        return;
    }

    try {
        const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/reportes/operacional/excel?mes=${mes}`,
        {
            method: "GET",
            credentials: "include",
        }
        );

        if (!response.ok) {
        throw new Error("Error generando Excel");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `reporte-operacional-${mes}.xlsx`;
        link.click();

        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error(error);
        alert("Error descargando Excel");
    }
    };


  return (
    <div
      style={{
        padding: "32px",
        minHeight: "100vh",
        background:
          "linear-gradient(to bottom, #f3f4f1 0%, #e7ede5 40%, #f9fafb 100%)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "18px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
          padding: "24px 28px 32px",
          border: "1px solid #e5e7eb",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#1f2933",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Leaf size={22} strokeWidth={2.2} color="#15803d" />
              Reporte operacional de citas
            </h1>
            <p
              style={{
                marginTop: "4px",
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              Resumen de la operación diaria: citas creadas, realizadas,
              canceladas y distribución por técnico y servicio.
            </p>
          </div>
        </header>

        {/* Filtros */}
        <section
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "center",
            padding: "16px 18px",
            borderRadius: "12px",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CalendarRange size={18} color="#166534" />
            <label
              htmlFor="mes"
              style={{ fontWeight: 600, fontSize: "14px", color: "#374151" }}
            >
              Mes
            </label>
          </div>

          <input
            id="mes"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            style={{
              padding: "8px 10px",
              fontSize: "14px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
            }}
          />

          {/* Botón Generar */}
          <button
            onClick={generarReporte}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 16px",
              borderRadius: "10px",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              background: "linear-gradient(135deg, #15803d, #166534)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              boxShadow: "0 8px 18px rgba(22,101,52,0.35)",
            }}
          >
            <RefreshCw size={16} />
            {loading ? "Generando..." : "Generar reporte"}
          </button>
        </section>

        {/*  BOTÓN EXPORTAR PDF */}
          {data && (
            <button
              onClick={exportarPDF}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(#7d6956ff)",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 600,
                boxShadow: "0 8px 18px rgba(22,101,52,0.35)",
              }}
            >
             <FileDown size={18} color="white" />
               Exportar PDF
            </button>

          )}
        {/* BOTÓN EXPORTAR EXCEL */}
          {data && (
            <button
                onClick={exportarExcel}
                style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                marginLeft: "12px",
                background: "linear-gradient(135deg, #049304ff)",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 600,
                boxShadow: "0 8px 18px rgba(22,101,52,0.35)",
                }}
            >
                
                <FileSpreadsheet size={18} color="white" />
                 Exportar Excel
            </button>
            )}


        {!data && (
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            Selecciona un mes y genera el reporte para ver el detalle operacional.
          </p>
        )}

        {data && (
          <>
            {/* KPIs */}
            <section style={{ marginTop: "16px" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <ListTree size={18} color="#7c2d12" />
                Resumen del mes
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "16px",
                }}
              >
                <KPIBox label="Citas totales" value={data.resumen.totalCitas} />
                <KPIBox
                  label="Realizadas"
                  value={data.resumen.realizadas}
                  icon={<CheckCircle2 size={18} color="#15803d" />}
                />
                <KPIBox
                  label="Confirmadas"
                  value={data.resumen.confirmadas}
                  icon={<Clock3 size={18} color="#4b5563" />}
                />
                <KPIBox
                  label="Canceladas"
                  value={data.resumen.canceladas}
                  icon={<XCircle size={18} color="#b91c1c" />}
                />
                <KPIBox
                  label="Tasa de realización"
                  value={`${(data.resumen.tasaRealizacion * 100).toFixed(1)} %`}
                />
                <KPIBox
                  label="Tasa de cancelación"
                  value={`${(data.resumen.tasaCancelacion * 100).toFixed(1)} %`}
                />
              </div>
            </section>

            {/* Citas por día */}
            <section style={{ marginTop: "28px" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <CalendarRange size={18} color="#166534" />
                Citas por día
              </h2>

              <div
                style={{
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                  background: "#ffffff",
                }}
              >
                <table
                  style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "linear-gradient(to right, #dde2e0ff",
                      }}
                    >
                      <Th>Fecha</Th>
                      <Th>Total</Th>
                      <Th>Realizadas</Th>
                      <Th>Confirmadas</Th>
                      <Th>Canceladas</Th>
                      <Th>Pendientes</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.porDia.map((d) => (
                      <tr key={d.fecha}>
                        <Td>{d.fecha}</Td>
                        <Td>{d.total}</Td>
                        <Td>{d.realizadas}</Td>
                        <Td>{d.confirmadas}</Td>
                        <Td>{d.canceladas}</Td>
                        <Td>{d.pendientes}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Citas por técnico */}
            <section style={{ marginTop: "28px" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Users size={18} color="#15803d" />
                Citas por técnico
              </h2>

              <div
                style={{
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                  background: "#ffffff",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f3f4f6" }}>
                      <Th>Técnico</Th>
                      <Th>Total</Th>
                      <Th>Realizadas</Th>
                      <Th>Confirmadas</Th>
                      <Th>Canceladas</Th>
                      <Th>Pendientes</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.porTecnico.map((t) => (
                      <tr key={t.tecnicoId ?? `sin-${t.nombre}`}>
                        <Td>
                          {t.nombre} {t.apellido}
                        </Td>
                        <Td>{t.totalCitas}</Td>
                        <Td>{t.realizadas}</Td>
                        <Td>{t.confirmadas}</Td>
                        <Td>{t.canceladas}</Td>
                        <Td>{t.pendientes}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Citas por servicio */}
            <section style={{ marginTop: "28px" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Leaf size={18} color="#166534" />
                Citas por servicio
              </h2>

              <div
                style={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                    background: "#ffffff",
                }}
                >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f3f4f6" }}>
                      <Th>Servicio</Th>
                      <Th>Total</Th>
                      <Th>Realizadas</Th>
                      <Th>Confirmadas</Th>
                      <Th>Canceladas</Th>
                      <Th>Pendientes</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.porServicio.map((s) => (
                      <tr key={s.servicioId ?? `srv-${s.nombreServicio}`}>
                        <Td>{s.nombreServicio}</Td>
                        <Td>{s.totalCitas}</Td>
                        <Td>{s.realizadas}</Td>
                        <Td>{s.confirmadas}</Td>
                        <Td>{s.canceladas}</Td>
                        <Td>{s.pendientes}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Detalle */}
            <section style={{ marginTop: "32px" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <ListTree size={18} color="#374151" />
                Detalle de citas del mes
              </h2>

              <div
                style={{
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                  background: "#ffffff",
                  maxHeight: "420px",
                  overflowY: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <Th>Fecha</Th>
                      <Th>Cliente</Th>
                      <Th>Servicio</Th>
                      <Th>Estado</Th>
                      <Th>Técnico</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.detalle.map((cita) => (
                      <tr key={cita.id}>
                        <Td>
                          {new Date(cita.fecha_hora).toLocaleString("es-CL", {
                            timeZone: "America/Santiago",
                          })}
                        </Td>
                        <Td>
                          {cita.cliente
                            ? `${cita.cliente.nombre} ${cita.cliente.apellido}`
                            : "-"}
                        </Td>
                        <Td>{cita.servicio?.nombre ?? "-"}</Td>
                        <Td>{cita.estado}</Td>
                        <Td>
                          {cita.tecnico
                            ? `${cita.tecnico.nombre} ${cita.tecnico.apellido}`
                            : "Sin técnico"}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

// =====================
// SUBCOMPONENTES UI
// =====================

function KPIBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "14px 14px 12px",
        background: "#f9fafb",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "#6b7280",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {icon}
        {label}
      </div>
      <div
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th
    style={{
      padding: "10px 12px",
      textAlign: "left",
      fontSize: "12px",
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      color: "#6b7280",
      borderBottom: "1px solid #e5e7eb",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </th>
);

const Td: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td
    style={{
      padding: "9px 12px",
      borderBottom: "1px solid #f1f5f9",
      fontSize: "13px",
      color: "#111827",
    }}
  >
    {children}
  </td>
);

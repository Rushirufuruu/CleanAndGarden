"use client";

import { FileDown, FileSpreadsheet } from "lucide-react";
import { useState } from "react";

// ================================
// PALETA DE COLORES
// ================================
const COLORS = {
  primary: "#2F6A32", // verde oscuro
  lightGreen: "#6BBF59", // verde manzana
  brown: "#8B5E3C",
  lightBrown: "#C7A27C",
  bg: "#F7F7F5", // blanco roto
  text: "#2B2B2B",
};

export default function ReporteFinanzas() {
  const [mes, setMes] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const generarReporte = async () => {
    if (!mes) return alert("Selecciona un mes");
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/reportes/finanzas?mes=${mes}`,
        {
          credentials: "include",
        }
      );
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
      alert("Error generando reporte");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        padding: "32px",
        background: COLORS.bg,
        minHeight: "100vh",
        color: COLORS.text,
      }}
    >
      {/* TITLE */}
      <h1
        style={{
          fontSize: "30px",
          fontWeight: "900",
          color: COLORS.primary,
          marginBottom: "25px",
        }}
      >
        Reporte Financiero Mensual
      </h1>

      {/* FILTRO */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "25px",
          background: "white",
          padding: "18px",
          borderRadius: "10px",
          border: `1px solid ${COLORS.lightBrown}`,
        }}
      >
        <label
          style={{ fontWeight: "bold", color: COLORS.brown, fontSize: "16px" }}
        >
          Seleccionar mes:
        </label>

        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "6px",
            border: `1px solid ${COLORS.brown}`,
            fontSize: "15px",
            color: COLORS.text,
          }}
        />

        <button
          onClick={generarReporte}
          disabled={loading}
          style={{
            padding: "10px 20px",
            background: COLORS.primary,
            color: "white",
            borderRadius: "8px",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
            transition: "0.2s",
          }}
        >
          {loading ? "Generando..." : "Generar Reporte"}
        </button>
      </div>

      {/* EXPORTAR */}
      {data && (
        <div style={{ display: "flex", gap: "12px", marginBottom: "25px" }}>
          <ExportButton
            label="Exportar PDF"
            color="#7d6956ff"
            icon={FileDown}
            href={`${process.env.NEXT_PUBLIC_API_URL}/admin/reportes/finanzas/pdf?mes=${mes}`}
          />

          <ExportButton
            label="Exportar Excel"
            color="#049304ff"
            icon={FileSpreadsheet}
            href={`${process.env.NEXT_PUBLIC_API_URL}/admin/reportes/finanzas/excel?mes=${mes}`}
          />
        </div>
      )}

      {/* VACÍO */}
      {!data && <p>Selecciona un mes para generar el reporte.</p>}

      {/* CONTENIDO */}
      {data && (
        <>
          {/* KPIs */}
          <h2 style={sectionTitle}>Resumen del mes</h2>
          <div style={kpiGrid}>
            <KPI title="Pagos Totales" value={data.resumen.totalPagos} />
            <KPI title="Pagos Aprobados" value={data.resumen.pagosAprobados} />
            <KPI title="Pagos Rechazados" value={data.resumen.pagosRechazados} />
            <KPI
              title="Monto Total Recaudado"
              value={`$${data.resumen.totalRecaudado.toLocaleString()}`}
            />
            <KPI
              title="Monto Promedio"
              value={`$${data.resumen.ticketPromedio.toLocaleString()}`}
            />
            <KPI title="Monto Máximo" value={`$${data.resumen.maximo.toLocaleString()}`} />
            <KPI title="Monto Mínimo" value={`$${data.resumen.minimo.toLocaleString()}`} />
          </div>

          {/* TABLA POR DÍA */}
          <h2 style={sectionTitle}>Recaudación por día</h2>
          <StyledTable
            headers={["Fecha", "Pagos", "Monto"]}
            rows={Object.keys(data.porDia).map((fecha) => [
              fecha,
              data.porDia[fecha].pagos,
              `$${data.porDia[fecha].monto.toLocaleString()}`,
            ])}
          />

          {/* DETALLE */}
          <h2 style={sectionTitle}>Detalle de pagos del mes</h2>
          <StyledTable
            headers={["Fecha", "Cliente", "Servicio", "Estado", "Monto"]}
            rows={data.detalle.map((p: any) => [
              new Date(p.creado_en).toLocaleString(),
              `${p.cita?.usuario_cita_cliente_idTousuario?.nombre ?? ""} ${
                p.cita?.usuario_cita_cliente_idTousuario?.apellido ?? ""
              }`,
              p.cita?.servicio?.nombre,
              p.estado,
              `$${Number(p.monto_clp).toLocaleString()}`,
            ])}
          />
        </>
      )}
    </div>
  );
}

// ================================
// COMPONENTES
// ================================

function ExportButton({
  label,
  color,
  icon: Icon,
  href,
}: {
  label: string;
  color: string;
  icon: any;
  href: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <button
        style={{
          padding: "10px 18px",
          background: color,
          color: "white",
          borderRadius: "8px",
          border: "none",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          fontWeight: "600",
        }}
      >
        <Icon />
        {label}
      </button>
    </a>
  );
}

const KPI = ({ title, value }: { title: string; value: any }) => (
  <div
    style={{
      background: "#FFFFFF",
      padding: "18px",
      borderRadius: "10px",
      border: "1px solid #DDD",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}
  >
    <p style={{ fontSize: "14px", color: "#555" }}>{title}</p>
    <p style={{ fontSize: "22px", fontWeight: "700", color: COLORS.primary }}>
      {value}
    </p>
  </div>
);

function StyledTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: any[][];
}) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        background: "white",
        marginTop: "12px",
        borderRadius: "10px",
      }}
    >
      <thead>
        <tr style={{ background: COLORS.primary, color: "white" }}>
          {headers.map((h) => (
            <th
              key={h}
              style={{
                padding: "12px",
                textAlign: "left",
                fontWeight: "700",
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            style={{
              background: i % 2 === 0 ? "#F6F6F6" : "white",
            }}
          >
            {row.map((cell, j) => (
              <td
                key={j}
                style={{
                  padding: "10px",
                  borderBottom: "1px solid #EEE",
                }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ================================
// ICONOS SVG (sin emojis)
// ================================
function PdfIcon() {
  return (
    <svg
      width="18"
      height="18"
      fill="white"
      viewBox="0 0 24 24"
      style={{ opacity: 0.9 }}
    >
      <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function ExcelIcon() {
  return (
    <svg
      width="18"
      height="18"
      fill="white"
      viewBox="0 0 24 24"
      style={{ opacity: 0.9 }}
    >
      <path d="M4 3h16v18H4z" />
    </svg>
  );
}

// ================================
// ESTILOS REUTILIZABLES
// ================================
const sectionTitle: React.CSSProperties = {
  marginTop: "35px",
  fontSize: "22px",
  fontWeight: "700",
  color: COLORS.primary,
};

const kpiGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
  marginTop: "15px",
};

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio_clp: number | null;
  activo: boolean;
  imagenUrl: string | null;
}

export default function PruebaBDPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServicios = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🚀 Consulta con relación a la tabla imagen
        const { data, error } = await supabase
          .from("servicio")
          .select(`
            id,
            nombre,
            descripcion,
            precio_clp,
            activo,
            imagen:imagen_id (
              url_publica
            )
          `)
          .eq("activo", true)
          .limit(10);

        if (error) throw error;

        console.log("🧩 Datos crudos desde Supabase:", data);

        // 🔁 Mapear los datos al formato de la interfaz Servicio
        const serviciosFormateados: Servicio[] =
          (data ?? []).map((item: any) => ({
            id: item.id,
            nombre: item.nombre,
            descripcion: item.descripcion,
            precio_clp: item.precio_clp,
            activo: item.activo,
            imagenUrl: item.imagen?.url_publica ?? null,
          })) ?? [];

        setServicios(serviciosFormateados);
      } catch (err) {
        console.error("❌ Error al consultar Supabase:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Error desconocido al conectar con la BD."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchServicios();
  }, []);

  return (
    <main className="p-8 min-h-screen bg-[#fefaf2]">
      <h1 className="text-3xl font-bold text-green-800 mb-6 flex items-center gap-2">
        <span role="img" aria-label="lupa">🔍</span>
        Prueba de conexión con Supabase
      </h1>

      {loading && <p className="text-gray-700">Cargando datos...</p>}

      {error && (
        <p className="text-red-600 bg-red-100 p-4 rounded-lg mt-2">{error}</p>
      )}

      {!loading && !error && (
        <>
          {servicios.length === 0 ? (
            <p className="text-gray-600">No hay servicios activos.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {servicios.map((s) => (
                <div
                  key={s.id}
                  className="border border-green-300 bg-white rounded-xl p-4 shadow-md flex flex-col"
                >
                  <div className="w-full h-48 rounded-lg overflow-hidden mb-4">
                    {s.imagenUrl ? (
                      <Image
                        src={s.imagenUrl}
                        alt={s.nombre}
                        width={400}
                        height={300}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-green-100 text-green-700 text-xl font-bold">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <h2 className="text-xl font-semibold text-green-800">
                    {s.nombre}
                  </h2>
                  {s.descripcion && (
                    <p className="text-gray-700 text-sm mt-2 line-clamp-2">
                      {s.descripcion}
                    </p>
                  )}
                  <p className="text-gray-900 mt-2 font-medium">
                    💰 {s.precio_clp?.toLocaleString("es-CL") || "—"} CLP
                  </p>
                  <p
                    className={`text-sm mt-2 ${
                      s.activo ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {s.activo ? "Activo ✅" : "Inactivo ❌"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

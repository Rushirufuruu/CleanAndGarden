
"use client";
import Image from "next/image";
import { useState, useEffect } from "react";

interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  duracion: number;
  precio: number;
  activo: boolean;
  imagenUrl?: string | null;
}

export default function Services() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar servicios desde la API
  const fetchServicios = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('https://believable-victory-production.up.railway.app/servicios');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      // Filtrar solo servicios activos para el landing
      const serviciosActivos = data.filter((servicio: Servicio) => servicio.activo);
      setServicios(serviciosActivos);
    } catch (err) {
      console.error('Error al cargar servicios:', err);
      setError('Error al cargar los servicios');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar servicios al montar el componente
  useEffect(() => {
    fetchServicios();
  }, []);

  if (isLoading) {
    return (
      <section className="bg-[#fefaf2] py-16">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl font-extrabold text-[#2E5430] sm:text-4xl">
            Nuestros servicios
          </h2>
          <div className="mt-12 flex justify-center">
            <div className="loading loading-spinner loading-lg text-[#2E5430]"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-[#fefaf2] py-16">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl font-extrabold text-[#2E5430] sm:text-4xl">
            Nuestros servicios
          </h2>
          <div className="mt-12 text-red-600">
            {error}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#fefaf2] py-16">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <h2 className="text-3xl font-extrabold text-[#2E5430] sm:text-4xl">
          Nuestros servicios
        </h2>
        <p className="mt-2 text-lg text-gray-700">
          ¡Échale un ojo a nuestros principales servicios!
        </p>

        {servicios.length === 0 ? (
          <div className="mt-12 text-gray-600">
            No hay servicios disponibles en este momento.
          </div>
        ) : (
          <div className="mt-12 flex justify-center">
            <div className={`
              grid gap-8 justify-items-center
              ${servicios.length === 1 ? 'grid-cols-1 max-w-sm' : ''}
              ${servicios.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl' : ''}
              ${servicios.length === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl' : ''}
              ${servicios.length >= 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-6xl' : ''}
            `}>
              {servicios.map((servicio) => (
                <div
                  key={servicio.id}
                  className="group relative flex flex-col items-center w-full max-w-xs"
                >
                  {/* Imagen de fondo */}
                  <div className="relative w-full overflow-hidden rounded-2xl shadow-lg">
                    {servicio.imagenUrl ? (
                      <Image
                        src={servicio.imagenUrl}
                        alt={servicio.nombre}
                        width={300}
                        height={300}
                        className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-40 w-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                        <span className="text-white text-4xl font-bold">
                          {servicio.nombre.charAt(0)}
                        </span>
                      </div>
                    )}
                    {/* Overlay con precio */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="text-center text-white">
                        <p className="text-lg font-bold">${servicio.precio.toLocaleString('es-CL')}</p>
                        <p className="text-sm">{servicio.duracion} min</p>
                      </div>
                    </div>
                  </div>
                  {/* Texto debajo */}
                  <h3 className="mt-4 text-lg font-semibold text-[#2E5430] text-center">
                    {servicio.nombre}
                  </h3>
                  {servicio.descripcion && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2 text-center">
                      {servicio.descripcion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

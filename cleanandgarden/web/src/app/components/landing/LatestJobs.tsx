"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

interface PortfolioItem {
  id: number;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  fecha: string;
}

export default function LatestJobs() {
  const [trabajos, setTrabajos] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('https://believable-victory-production.up.railway.app/portfolio');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      // Tomar solo los 3 más recientes
      setTrabajos(data.slice(0, 3));
    } catch (err) {
      console.error('Error al cargar portafolio:', err);
      setError('Error al cargar los trabajos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  if (isLoading) {
    return (
      <section className="bg-[#fefaf2] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2E5430]">
              Nuestros últimos trabajos
            </h2>
            <div className="mt-12 flex justify-center">
              <div className="loading loading-spinner loading-lg text-[#2E5430]"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-[#fefaf2] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2E5430]">
              Nuestros últimos trabajos
            </h2>
            <div className="mt-12 text-red-600">
              {error}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#fefaf2] py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* encabezado */}
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2E5430]">
            Nuestros últimos trabajos
          </h2>
          <p className="mt-2 text-lg text-gray-700">
            Revisa a detalle los resultados de los jardines en los que trabajamos
          </p>
        </div>

        {trabajos.length === 0 ? (
          <div className="mt-12 text-center text-gray-600">
            No hay trabajos disponibles en este momento.
          </div>
        ) : (
          <>
            {/* grid de cards DaisyUI */}
            <div className="mt-12 flex justify-center">
              <div className={`
                grid gap-8 w-full
                ${trabajos.length === 1 ? 'grid-cols-1 max-w-sm' : ''}
                ${trabajos.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl' : ''}
                ${trabajos.length >= 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl' : ''}
              `}>
                {trabajos.map((t) => (
                  <div key={t.id} className="card bg-base-100 shadow-md rounded-2xl w-full h-full flex flex-col">
                    <figure className="h-48">
                      <Image
                        src={t.imagenUrl}
                        alt={t.titulo}
                        width={400}
                        height={240}
                        className="h-full w-full object-cover"
                      />
                    </figure>
                    <div className="card-body flex-grow flex flex-col">
                      <h3 className="card-title text-[#2E5430] text-lg line-clamp-2 min-h-[3.5rem]">{t.titulo}</h3>

                      <div className="min-h-[4.5rem]">
                        {t.descripcion && (
                          <p className="text-sm text-gray-600 line-clamp-3">
                            {t.descripcion}
                          </p>
                        )}
                      </div>

                      <div className="mt-auto pt-2">
                        <span className="inline-block px-3 py-1 bg-gray-200 rounded-lg text-sm">
                          {new Date(t.fecha).toLocaleString("es-ES", {
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="card-actions mt-4">
                        <Link 
                          href={`/portfolio/${t.id}`}
                          className="btn w-full bg-[#2E5430] rounded-lg text-white hover:bg-green-700"
                        >
                          Ver detalle
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA inferior */}
            <div className="mt-10 text-right">
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 font-semibold text-[#2E5430] hover:underline"
              >
                Ver todos los trabajos <span aria-hidden>›</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

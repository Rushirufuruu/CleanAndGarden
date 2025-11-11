"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

// Interfaces
interface TrabajoDetalle {
  id: number;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  fecha: string;
  servicio?: string;
  cliente?: string;
  ubicacion?: string;
  duracion?: string;
  precio?: number;
  galeria?: string[];
  testimonial?: {
    texto: string;
    autor: string;
  };
}

export default function PortfolioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [trabajo, setTrabajo] = useState<TrabajoDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params?.id as string;

  useEffect(() => {
    const fetchTrabajoDetail = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/portfolio/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Trabajo no encontrado');
          }
          throw new Error('Error al cargar el trabajo');
        }
        
        const data = await response.json();
        setTrabajo(data);
      } catch (err) {
        console.error('Error fetching trabajo detail:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrabajoDetail();
  }, [id]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#fefaf2]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-4 w-3/4"></div>
            <div className="h-64 bg-gray-300 rounded-lg mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-300 rounded w-full"></div>
              <div className="h-4 bg-gray-300 rounded w-5/6"></div>
              <div className="h-4 bg-gray-300 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !trabajo) {
    return (
      <main className="min-h-screen bg-[#fefaf2]">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-[#2E5430] mb-4">
            {error || 'Trabajo no encontrado'}
          </h1>
          <p className="text-gray-600 mb-6">
            Lo sentimos, no pudimos cargar la información de este trabajo.
          </p>
          <div className="space-x-4">
            <button 
              onClick={() => router.back()} 
              className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Volver
            </button>
            <button 
              onClick={() => router.push('/portfolio')} 
              className="bg-[#2E5430] text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Ver Portfolio
            </button>
          </div>
        </div>
      </main>
    );
  }

  const fechaFormateada = new Date(trabajo.fecha).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <>
      <main className="min-h-screen bg-[#fefaf2]">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 text-[#2E5430] hover:text-green-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Volver
              </button>
              {trabajo.servicio && (
                <span className="bg-[#2E5430] text-white text-xs px-3 py-1 rounded-full">
                  {trabajo.servicio}
                </span>
              )}
            </div>
            
            <h1 className="text-4xl font-bold text-[#2E5430] mb-4">
              {trabajo.titulo}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-gray-600">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span>{fechaFormateada}</span>
              </div>
              
              {trabajo.cliente && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span>{trabajo.cliente}</span>
                </div>
              )}
              
              {trabajo.ubicacion && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span>{trabajo.ubicacion}</span>
                </div>
              )}
            </div>
          </div>

          {/* Imagen principal */}
          <div className="mb-8">
            <div className="relative h-96 md:h-[500px] rounded-xl overflow-hidden bg-gray-200">
              <Image
                src={trabajo.imagenUrl}
                alt={trabajo.titulo}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Contenido */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Descripción principal */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-semibold text-[#2E5430] mb-4">
                Descripción del proyecto
              </h2>
              <p className="text-gray-700 leading-relaxed text-lg mb-6">
                {trabajo.descripcion}
              </p>

              {/* Galería (si existe) */}
              {trabajo.galeria && trabajo.galeria.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-[#2E5430] mb-4">
                    Galería del proyecto
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {trabajo.galeria.map((imagen, index) => (
                      <div key={index} className="relative h-32 rounded-lg overflow-hidden bg-gray-200">
                        <Image
                          src={imagen}
                          alt={`${trabajo.titulo} - Imagen ${index + 1}`}
                          fill
                          className="object-cover hover:scale-105 transition-transform cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Testimonial */}
              {trabajo.testimonial && (
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-[#2E5430]">
                  <h3 className="text-xl font-semibold text-[#2E5430] mb-3">
                    Testimonio del cliente
                  </h3>
                  <blockquote className="text-gray-700 italic mb-3">
                    &ldquo;{trabajo.testimonial.texto}&rdquo;
                  </blockquote>
                  <cite className="text-sm font-medium text-[#2E5430]">
                    — {trabajo.testimonial.autor}
                  </cite>
                </div>
              )}
            </div>

            {/* Sidebar con información */}
            <div className="space-y-6">
              {/* Detalles del proyecto */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-lg font-semibold text-[#2E5430] mb-4">
                  Detalles del proyecto
                </h3>
                <dl className="space-y-3">
                  {trabajo.duracion && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Duración</dt>
                      <dd className="text-gray-900">{trabajo.duracion}</dd>
                    </div>
                  )}
                  {trabajo.precio && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Inversión</dt>
                      <dd className="text-gray-900">${trabajo.precio.toLocaleString('es-CL')} CLP</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Fecha de realización</dt>
                    <dd className="text-gray-900">{fechaFormateada}</dd>
                  </div>
                </dl>
              </div>

              {/* Call to Action */}
              <div className="bg-[#2E5430] text-white p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-3">
                  ¿Te gustó este proyecto?
                </h3>
                <p className="text-sm mb-4 opacity-90">
                  Contáctanos para crear algo similar para ti.
                </p>
                <button 
                  onClick={() => router.push('/contact')}
                  className="w-full bg-white text-[#2E5430] py-2 px-4 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  Solicitar Cotización
                </button>
              </div>

              {/* Proyectos relacionados */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-lg font-semibold text-[#2E5430] mb-3">
                  Proyectos similares
                </h3>
                <button 
                  onClick={() => router.push('/portfolio')}
                  className="text-[#2E5430] hover:text-green-700 text-sm font-medium"
                >
                  Ver más proyectos →
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
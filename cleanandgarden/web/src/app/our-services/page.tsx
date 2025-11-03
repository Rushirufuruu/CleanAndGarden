"use client";
import { useState, useEffect } from "react";
import ServicesList from "../components/our-services/ServicesList";
import ServicesCTA from "../components/our-services/ServicesCTA";
import { Service } from "../components/our-services/ServiceCard";
import { supabase } from "@/lib/supabase";

export default function OurServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Consultando servicios desde Supabase...');
        
        // Consultar servicios activos desde Supabase
        const { data, error } = await supabase
          .from("servicio")
          .select("id, nombre, descripcion, precio_clp, activo, imagen_id")
          .eq("activo", true)
          .limit(10);

        console.log('Datos recibidos:', data);
        console.log('Error:', error);

        if (error) throw error;

        if (!data || data.length === 0) {
          console.log('No hay servicios activos');
          setServices([]);
          return;
        }

        console.log(`Encontrados ${data.length} servicios activos`);

        // Obtener las URLs de las imágenes
        const imageIds = data
          .map(item => item.imagen_id)
          .filter(id => id !== null);

        console.log('Image IDs a consultar:', imageIds);
        console.log('Servicios con imagen_id:', data.map(s => ({ nombre: s.nombre, imagen_id: s.imagen_id })));

        let imageUrls: Record<number, string> = {};
        if (imageIds.length > 0) {
          // Primero verificar si existen registros en la tabla imagen
          const { data: allImages, error: allImagesError } = await supabase
            .from('imagen')
            .select('id, url_publica')
            .limit(5);

          console.log('🖼️ Primeras imágenes en la tabla:', allImages);
          console.log('🖼️ Error al consultar todas:', allImagesError);

          const { data: images, error: imageError } = await supabase
            .from('imagen')
            .select('id, url_publica')
            .in('id', imageIds);

          console.log('🖼️ Imágenes obtenidas:', images);
          console.log('🖼️ Error imágenes:', imageError);

          if (images && !imageError) {
            imageUrls = images.reduce((acc: Record<number, string>, img: any) => {
              acc[img.id] = img.url_publica;
              return acc;
            }, {});
          }
        }

        console.log('🖼️ Mapa de URLs:', imageUrls);

        // Transformar datos al formato esperado
        const serviciosFormateados: Service[] = data.map((item: any) => ({
          id: item.id.toString(),
          title: item.nombre,
          description: item.descripcion || '',
          precio: item.precio_clp || 0,
          imageUrl: item.imagen_id && imageUrls[item.imagen_id] 
            ? imageUrls[item.imagen_id] 
            : '/images/placeholder.jpg'
        }));

        console.log('✨ Servicios formateados:', serviciosFormateados);
        setServices(serviciosFormateados);
      } catch (err) {
        console.error('❌ Error fetching services:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar los servicios');
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, []);

  if (isLoading) {
    return (
      <main>
        <div className="bg-[#fefaf2] py-12 max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-extrabold text-[#2E5430] text-center">
            Nuestros servicios
          </h1>
          <p className="text-center text-gray-700 mb-10">
            Cargando nuestros servicios...
          </p>
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card lg:card-side bg-base-100 shadow-xl overflow-hidden animate-pulse">
                <div className="lg:w-1/3 h-64 bg-gray-300"></div>
                <div className="card-body lg:w-2/3">
                  <div className="h-6 bg-gray-300 rounded mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded mb-4 w-3/4"></div>
                  <div className="h-10 bg-gray-300 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <div className="bg-[#fefaf2] py-12 max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-extrabold text-[#2E5430] text-center">
            Nuestros servicios
          </h1>
          <div className="text-center text-red-600 mb-10">
            <p className="text-xl mb-4">⚠️ {error}</p>
            <p className="text-gray-600">
              No se pudieron cargar los servicios
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 bg-[#2E5430] text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main>
        <div className="bg-[#fefaf2] py-12 max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-extrabold text-[#2E5430] text-center">
            Nuestros servicios
          </h1>
          <p className="text-center text-gray-700 mb-10">
            Aquí te decimos lo que hacemos en cada servicio.
          </p>
          {services.length > 0 ? (
            <ServicesList services={services} />
          ) : (
            <div className="text-center text-gray-600 py-12">
              <p className="text-xl mb-4">🔧 No hay servicios disponibles</p>
              <p>Vuelve pronto para ver nuestros servicios.</p>
            </div>
          )}
        </div>
      </main>
      <ServicesCTA />
    </>
  );
}

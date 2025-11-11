"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Swal from "sweetalert2";
import CreatePortfolioModal from "./CreatePortfolioModal";
import UpdatePortfolioModal from "./UpdatePortfolioModal";

interface PortfolioItem {
  id: number;
  titulo: string;
  descripcion: string | null;
  publicado: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  imagenUrl?: string | null;
}

export default function PortfolioAdminPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioItem | null>(null);

  // Función para cargar items del portafolio desde la API
  const fetchPortfolio = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/portfolio`);

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          throw new Error(`Error del servidor (${response.status}). Verifica que el endpoint /admin/portfolio exista en el backend`);
        }
        
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setItems(data);
    } catch (err) {
      console.error('Error al cargar portafolio:', err);
      setError((err as Error).message || 'Error al conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar items al montar el componente
  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleModificar = (id: number) => {
    const item = items.find(i => i.id === id);
    if (item) {
      setSelectedPortfolio(item);
      setShowUpdateModal(true);
    }
  };

  const handlePublicar = async (id: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const accion = item.publicado ? 'despublicar' : 'publicar';
    
    const result = await Swal.fire({
      title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} trabajo?`,
      text: `¿Estás seguro de ${accion} "${item.titulo}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: item.publicado ? '#d33' : '#2E5430',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar',
    });
    
    if (result.isConfirmed) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/portfolio/${id}/toggle-publish`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("text/html")) {
            throw new Error(`Error del servidor (${response.status}). Verifica que el endpoint exista en el backend`);
          }
          
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al actualizar el estado');
        }

        // Actualizar estado local
        setItems(prev => 
          prev.map(i => 
            i.id === id 
              ? { ...i, publicado: !i.publicado }
              : i
          )
        );
        
        await Swal.fire({
          icon: 'success',
          title: `Trabajo ${accion === 'publicar' ? 'publicado' : 'despublicado'}`,
          text: `El trabajo "${item.titulo}" ha sido ${accion === 'publicar' ? 'publicado' : 'despublicado'} correctamente.`,
          confirmButtonColor: '#2E5430',
          confirmButtonText: 'Aceptar',
        });
      } catch (err) {
        console.error(`Error al ${accion} trabajo:`, err);
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: `Error al ${accion} el trabajo. Intenta nuevamente.`,
          confirmButtonColor: '#d33',
          confirmButtonText: 'Aceptar',
        });
      }
    }
  };

  const handleEliminar = async (id: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const result = await Swal.fire({
      title: '¿Eliminar trabajo?',
      html: `¿Estás seguro de eliminar permanentemente <strong>"${item.titulo}"</strong>?<br><br>Esta acción NO se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });
    
    if (result.isConfirmed) {
      await Swal.fire({
        icon: 'info',
        title: 'Función en desarrollo',
        text: 'El endpoint para eliminar trabajos aún no está implementado en el backend',
        confirmButtonColor: '#2E5430',
      });
    }
  };

  const handleCrear = () => {
    setShowCreateModal(true);
  };

  if (isLoading) {
    return (
      <main className="bg-[#fefaf2] min-h-screen py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-[#2E5430] mb-4 text-center">
            Gestión de Portafolio
          </h1>
          <p className="text-center text-gray-600">Cargando trabajos...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-[#fefaf2] min-h-screen py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-[#2E5430] mb-4 text-center">
            Gestión de Portafolio
          </h1>
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <p className="font-semibold">Error al cargar el portafolio</p>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={fetchPortfolio}
              className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Reintentar
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#fefaf2] min-h-screen py-10 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-[#2E5430] mb-4 text-center">
          Gestión de Portafolio
        </h1>
        <p className="text-center text-[#2E5430] font-medium mb-8">
          En esta página podrás ver, agregar, modificar y eliminar trabajos del portafolio
        </p>

        <div className="bg-white shadow rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#2E5430]">
              Trabajos del Portafolio ({items.length})
            </h2>
            <button
              onClick={handleCrear}
              className="bg-[#2E5430] hover:bg-green-800 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Crear trabajo +
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left border border-gray-200 rounded-xl">
              <thead>
                <tr className="bg-[#f6f6f6] text-[#2E5430]">
                  <th className="py-3 px-4 border-b">Imagen</th>
                  <th className="py-3 px-4 border-b">Título</th>
                  <th className="py-3 px-4 border-b">Descripción</th>
                  <th className="py-3 px-4 border-b text-center">Estado</th>
                  <th className="py-3 px-4 border-b text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-[#fafafa]">
                    <td className="py-3 px-4">
                      <div className="relative w-20 h-20">
                        <Image
                          src={item.imagenUrl || '/images/placeholder-portfolio.jpg'}
                          alt={item.titulo}
                          fill
                          className="object-cover rounded-md"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold">{item.titulo}</td>
                    <td className="py-3 px-4 max-w-xs truncate">
                      {item.descripcion || 'Sin descripción'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        item.publicado 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.publicado ? 'Publicado' : 'Borrador'}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="flex flex-col gap-1 items-center">
                        <button
                          onClick={() => handleModificar(item.id)}
                          className="w-24 bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded-md font-semibold text-sm transition-colors"
                        >
                          Modificar
                        </button>
                        <button
                          onClick={() => handlePublicar(item.id)}
                          className={`w-24 ${
                            item.publicado
                              ? 'bg-orange-400 hover:bg-orange-500'
                              : 'bg-green-500 hover:bg-green-600'
                          } text-white px-3 py-1 rounded-md font-semibold text-sm transition-colors`}
                        >
                          {item.publicado ? 'Despublicar' : 'Publicar'}
                        </button>
                        <button
                          onClick={() => handleEliminar(item.id)}
                          className="w-24 bg-red-400 hover:bg-red-500 text-white px-3 py-1 rounded-md font-semibold text-sm transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay trabajos en el portafolio. Haz clic en &quot;Crear trabajo +&quot; para agregar uno.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de crear trabajo */}
      <CreatePortfolioModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPortfolioCreated={fetchPortfolio}
      />

      {/* Modal de actualizar trabajo */}
      <UpdatePortfolioModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onPortfolioUpdated={fetchPortfolio}
        portfolio={selectedPortfolio}
      />
    </main>
  );
}

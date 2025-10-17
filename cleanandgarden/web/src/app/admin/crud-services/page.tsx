"use client";
import { useState, useEffect } from "react";
import CreateServiceModal from "./CreateServiceModal";

interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  duracion: number;
  precio: number;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  imagenUrl?: string | null;
}

export default function ServicesAdminPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Función para cargar servicios desde la API
  const fetchServicios = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/admin/servicios');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setServicios(data);
    } catch (err: any) {
      console.error('Error al cargar servicios:', err);
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar servicios al montar el componente
  useEffect(() => {
    fetchServicios();
  }, []);

  const handleModificar = (id: number) => {
    // TODO: Implementar modal de edición
    alert(`Función de modificar servicio ID ${id} - Pendiente de implementar`);
  };

  const handleDesactivar = async (id: number) => {
    const servicio = servicios.find(s => s.id === id);
    if (!servicio) return;

    const accion = servicio.activo ? 'desactivar' : 'activar';
    const confirmado = confirm(`¿Estás seguro de ${accion} este servicio?`);
    
    if (confirmado) {
      try {
        // TODO: Implementar endpoint de actualización en el backend
        // Por ahora simulamos el cambio localmente
        setServicios(prev => 
          prev.map(s => 
            s.id === id 
              ? { ...s, activo: !s.activo }
              : s
          )
        );
        
        alert(`Servicio ${accion === 'activar' ? 'activado' : 'desactivado'} correctamente`);
      } catch (err) {
        console.error(`Error al ${accion} servicio:`, err);
        alert(`Error al ${accion} el servicio. Intenta nuevamente.`);
      }
    }
  };

  const handleCrear = () => {
    setShowCreateModal(true);
  };

  const handleServiceCreated = () => {
    // Recargar la lista de servicios después de crear uno nuevo
    fetchServicios();
  };

  return (
    <main className="bg-[#fefaf2] min-h-screen py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-[#2E5430] font-medium mb-8">
          En esta página podrás ver, agregar, modificar y desactivar servicios en el sistema
        </p>

        <div className="bg-white shadow rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#2E5430]">Servicios</h2>
            <button
              onClick={handleCrear}
              className="bg-[#2E5430] hover:bg-green-800 text-white font-semibold px-4 py-2 rounded-lg"
            >
              Crear servicio +
            </button>
          </div>

          {/* Estado de carga */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2E5430]"></div>
              <p className="mt-2 text-gray-600">Cargando servicios...</p>
            </div>
          )}

          {/* Estado de error */}
          {error && !isLoading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700">❌ {error}</p>
              <button 
                onClick={fetchServicios}
                className="mt-2 text-red-600 hover:text-red-800 underline"
              >
                Intentar nuevamente
              </button>
            </div>
          )}

          {/* Tabla de servicios */}
          {!isLoading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border border-gray-200 rounded-xl">
                <thead>
                  <tr className="bg-[#f6f6f6] text-[#2E5430]">
                    <th className="py-3 px-4 border-b">Imagen</th>
                    <th className="py-3 px-4 border-b">Nombre servicio</th>
                    <th className="py-3 px-4 border-b">Descripción</th>
                    <th className="py-3 px-4 border-b">Duración (min)</th>
                    <th className="py-3 px-4 border-b">Precio (CLP)</th>
                    <th className="py-3 px-4 border-b text-center">Estado</th>
                    <th className="py-3 px-4 border-b text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {servicios.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-6 text-center text-gray-500 italic"
                      >
                        No hay servicios registrados actualmente.
                      </td>
                    </tr>
                  ) : (
                    servicios.map((servicio) => (
                      <tr
                        key={servicio.id}
                        className={`border-b hover:bg-[#fafafa] ${!servicio.activo ? 'opacity-60 bg-gray-50' : ''}`}
                      >
                        <td className="py-3 px-4">
                          {servicio.imagenUrl ? (
                            <img 
                              src={servicio.imagenUrl} 
                              alt={servicio.nombre}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-xs">Sin img</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium">{servicio.nombre}</td>
                        <td className="py-3 px-4 max-w-xs truncate" title={servicio.descripcion}>
                          {servicio.descripcion || 'Sin descripción'}
                        </td>
                        <td className="py-3 px-4 text-center">{servicio.duracion}</td>
                        <td className="py-3 px-4 text-right font-medium">
                          ${servicio.precio.toLocaleString('es-CL')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            servicio.activo 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {servicio.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center space-y-2">
                          <div>
                            <button
                              onClick={() => handleModificar(servicio.id)}
                              className="w-24 bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded-md font-semibold text-sm"
                            >
                              Modificar
                            </button>
                          </div>
                          <div>
                            <button
                              onClick={() => handleDesactivar(servicio.id)}
                              className={`w-24 px-3 py-1 rounded-md font-semibold text-sm text-white ${
                                servicio.activo 
                                  ? 'bg-red-400 hover:bg-red-500' 
                                  : 'bg-green-400 hover:bg-green-500'
                              }`}
                            >
                              {servicio.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de crear servicio */}
      <CreateServiceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onServiceCreated={handleServiceCreated}
      />
    </main>
  );
}

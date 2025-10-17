"use client";
import { useState } from "react";

interface Jardin {
  id: number;
  nombre: string;
  cliente: string;
  tipo: string;
  tamano: number;
}

export default function ServicesAdminPage() {
  const [jardines, setJardines] = useState<Jardin[]>([
    {
      id: 1,
      nombre: "Jardín principal",
      cliente: "Edward Salcedo",
      tipo: "Residencial",
      tamano: 150,
    },
    {
      id: 2,
      nombre: "Jardín Occidental",
      cliente: "Mike Beckenbauer",
      tipo: "Comercial",
      tamano: 300,
    },
  ]);

  const handleModificar = (id: number) => {
    alert(`Modificar jardín con ID ${id}`);
  };

  const handleDesactivar = (id: number) => {
    const confirmado = confirm("¿Estás seguro de desactivar este jardín?");
    if (confirmado) {
      setJardines((prev) => prev.filter((j) => j.id !== id));
    }
  };

  const handleCrear = () => {
    alert("Función para crear jardín (pendiente)");
  };

  return (
    <main className="bg-[#fefaf2] min-h-screen py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-[#2E5430] font-medium mb-8">
          En esta página podrás ver, agregar, modificar y eliminar jardines en el sistema
        </p>

        <div className="bg-white shadow rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#2E5430]">Jardines</h2>
            <button
              onClick={handleCrear}
              className="bg-[#2E5430] hover:bg-green-800 text-white font-semibold px-4 py-2 rounded-lg"
            >
              Crear jardín +
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left border border-gray-200 rounded-xl">
              <thead>
                <tr className="bg-[#f6f6f6] text-[#2E5430]">
                  <th className="py-3 px-4 border-b">Nombre jardín</th>
                  <th className="py-3 px-4 border-b">Cliente asociado</th>
                  <th className="py-3 px-4 border-b">Tipo</th>
                  <th className="py-3 px-4 border-b">Tamaño (m²)</th>
                  <th className="py-3 px-4 border-b text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {jardines.map((jardin) => (
                  <tr key={jardin.id} className="border-b hover:bg-[#fafafa]">
                    <td className="py-3 px-4">{jardin.nombre}</td>
                    <td className="py-3 px-4">{jardin.cliente}</td>
                    <td className="py-3 px-4">{jardin.tipo}</td>
                    <td className="py-3 px-4">{jardin.tamano}</td>
                    <td className="py-3 px-4 text-center space-x-2">
                      <button
                        onClick={() => handleModificar(jardin.id)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded-md font-semibold"
                      >
                        Modificar
                      </button>
                      <button
                        onClick={() => handleDesactivar(jardin.id)}
                        className="bg-red-400 hover:bg-red-500 text-white px-3 py-1 rounded-md font-semibold"
                      >
                        Desactivar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {jardines.length === 0 && (
              <p className="text-center text-gray-500 mt-4">
                No hay jardines registrados actualmente.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

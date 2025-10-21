"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export interface Trabajo {
  id: number;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  fecha: string; // lo recibes como string desde la API
  servicio?: string; // Tipo de servicio realizado
}

export default function PortafolioCard({ trabajo }: { trabajo: Trabajo }) {
  const router = useRouter();
  const fechaFormateada = new Date(trabajo.fecha).toLocaleString("es-ES", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl shadow p-4 bg-white">
      <Image
        src={trabajo.imagenUrl}
        alt={trabajo.titulo}
        width={400}
        height={160}
        className="h-40 w-full object-cover rounded-lg"
      />
      <h3 className="font-semibold mt-4">{trabajo.titulo}</h3>
      <p className="text-sm text-gray-600 mb-2">{trabajo.descripcion}</p>
      {trabajo.servicio && (
        <span className="inline-block bg-[#2E5430] text-white text-xs px-2 py-1 rounded-full mb-3">
          {trabajo.servicio}
        </span>
      )}
      <div className="mt-3 text-center">
        <span className="px-3 py-1 bg-gray-200 rounded-lg text-sm">
          {fechaFormateada}
        </span>
        <button 
          onClick={() => router.push(`/portfolio/${trabajo.id}`)}
          className="inline-block rounded-md bg-[#2E5430] px-6 py-3 font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E5430] mt-3 w-full transition-colors"
        >
          Ver detalle
        </button>
      </div>
    </div>
  );
}

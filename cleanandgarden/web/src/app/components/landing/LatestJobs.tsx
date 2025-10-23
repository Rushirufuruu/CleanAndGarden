"use client";
import Link from "next/link";
import Image from "next/image";

const trabajos = [
  {
    id: "1",
    titulo: "Remodelación jardín Frank Ocean",
    fecha: "Agosto 2025",
    imagen: "/images/trabajo-1.jpg",
  },
  {
    id: "2",
    titulo: "Diseño jardín moderno",
    fecha: "Julio 2025",
    imagen: "/images/trabajo-2.jpg",
  },
  {
    id: "3",
    titulo: "Mantenimiento áreas verdes",
    fecha: "Julio 2025",
    imagen: "/images/trabajo-3.jpg",
  },
];

export default function LatestJobs() {
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

        {/* grid de cards DaisyUI */}
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 ">
          {trabajos.map((t) => (
            <div key={t.id} className="card bg-base-100 shadow-md rounded-2xl w-full">
              <figure>
                <Image
                  src={t.imagen}
                  alt={t.titulo}
                  width={400}
                  height={240}
                  className="h-48 w-full object-cover"
                />
              </figure>
              <div className="card-body">
                <h3 className="card-title text-[#2E5430] text-lg">{t.titulo}</h3>

                <div className="badge badge-neutral px-4 py-3 text-sm">
                  {t.fecha}
                </div>

                <div className="card-actions mt-4">
                  <button className="btn w-full bg-[#2E5430] rounded-lg text-white hover:bg-green-700">
                    Ver detalle
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA inferior */}
        <div className="mt-10 text-right">
          <Link
            href="/trabajos"
            className="inline-flex items-center gap-2 font-semibold text-[#2E5430] hover:underline"
          >
            Ver todos los trabajos <span aria-hidden>›</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

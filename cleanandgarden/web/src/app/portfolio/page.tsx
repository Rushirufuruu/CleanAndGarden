// src/app/portfolio/page.tsx
"use client";
import { useState, useEffect } from "react";
import PortafolioList from "../components/portfolio/PortfolioList";
import PortfolioCTA from "../components/portfolio/PortflioCTA";
import { Trabajo } from "../components/portfolio/PortfolioCard";

export default function PortfolioPage() {
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/portfolio`);
        
        if (!response.ok) {
          throw new Error('Error al cargar el portfolio');
        }
        
        const data = await response.json();
        setTrabajos(data);
      } catch (err) {
        console.error('Error fetching portfolio:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

  if (isLoading) {
    return (
      <main>
        <div className="bg-[#fefaf2] py-12 max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-extrabold text-[#2E5430] text-center">
            Portafolio
          </h1>
          <p className="text-center text-gray-700 mb-10">
            Cargando nuestros últimos trabajos...
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl shadow p-4 bg-white animate-pulse">
                <div className="h-40 w-full bg-gray-300 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-3 bg-gray-300 rounded mb-4"></div>
                <div className="h-8 bg-gray-300 rounded"></div>
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
            Portafolio
          </h1>
          <div className="text-center text-red-600 mb-10">
            <p className="text-xl mb-4">⚠️ {error}</p>
            <p className="text-gray-600">
              Por favor, asegúrate de que el servidor esté ejecutándose en ${process.env.NEXT_PUBLIC_API_URL}
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
            Portafolio
          </h1>
          <p className="text-center text-gray-700 mb-10">
            Aquí puedes ver algunos de nuestros últimos trabajos.
          </p>
          {trabajos.length > 0 ? (
            <PortafolioList trabajos={trabajos} />
          ) : (
            <div className="text-center text-gray-600 py-12">
              <p className="text-xl mb-4">No hay trabajos publicados aún</p>
              <p>Vuelve pronto para ver nuestros últimos proyectos.</p>
            </div>
          )}
        </div>
      </main>
      <footer>
        <PortfolioCTA />
      </footer>
    </>
  );
}

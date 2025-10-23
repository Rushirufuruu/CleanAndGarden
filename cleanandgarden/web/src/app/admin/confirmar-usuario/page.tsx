"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ConfirmarUsuarioContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [estado, setEstado] = useState<"cargando" | "exito" | "error">("cargando");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const confirmarCuenta = async () => {
      if (!token) {
        setEstado("error");
        setMensaje("Token no válido o ausente en el enlace.");
        return;
      }

      try {
        const res = await fetch(`http://localhost:3001/admin/confirmar-usuario/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setEstado("error");
          setMensaje(data.error || "Error al confirmar la cuenta.");
          return;
        }

        setEstado("exito");
        setMensaje(data.message || "Cuenta confirmada correctamente.");
      } catch (err) {
        console.error("Error al confirmar:", err);
        setEstado("error");
        setMensaje("Error de conexión con el servidor.");
      }
    };

    confirmarCuenta();
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f0f4f0]">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full border border-green-200 text-center">
        {estado === "cargando" && (
          <>
            <div className="animate-spin mx-auto mb-4 border-4 border-green-400 border-t-transparent rounded-full w-12 h-12"></div>
            <h2 className="text-xl font-semibold text-[#2E5430]">Confirmando tu cuenta...</h2>
            <p className="text-gray-600 mt-2">Por favor espera unos segundos 🌿</p>
          </>
        )}

        {estado === "exito" && (
          <>
            <h2 className="text-2xl font-bold text-[#2E5430] mb-2">✅ ¡Cuenta confirmada!</h2>
            <p className="text-gray-700 mb-6">{mensaje}</p>
            <Link
              href="/login"
              className="bg-[#2E5430] text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
            >
              Ir al inicio de sesión
            </Link>
          </>
        )}

        {estado === "error" && (
          <>
            <h2 className="text-2xl font-bold text-red-600 mb-2">❌ Error al confirmar</h2>
            <p className="text-gray-700 mb-6">{mensaje}</p>
            <Link
              href="/"
              className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition"
            >
              Volver al inicio
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmarUsuarioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#f0f4f0]">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full border border-green-200 text-center">
            <div className="animate-spin mx-auto mb-4 border-4 border-green-400 border-t-transparent rounded-full w-12 h-12"></div>
            <h2 className="text-xl font-semibold text-[#2E5430]">Cargando...</h2>
          </div>
        </div>
      }
    >
      <ConfirmarUsuarioContent />
    </Suspense>
  );
}

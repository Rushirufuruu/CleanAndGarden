"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

// Componente interno que usa useSearchParams
function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token"); // 👈 obtenemos el token de la URL
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setMessage("Token no válido.");
      setLoading(false);
      return;
    }

    // Llamamos al backend para confirmar el email
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/confirm-email/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMessage(data.message);
          Swal.fire({
            icon: "success",
            title: "Cuenta confirmada ✅",
            text: data.message,
            confirmButtonColor: "#2E5430",
          });
        } else {
          setMessage(data.message);
          Swal.fire({
            icon: "error",
            title: "Error ❌",
            text: data.message,
            confirmButtonColor: "#d33",
          });
        }
      })
      .catch(() => {
        setMessage("Error en la confirmación");
        Swal.fire({
          icon: "error",
          title: "Error de servidor ❌",
          text: "No se pudo confirmar la cuenta.",
        });
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#fefaf2]">
      <div className="p-6 bg-white rounded-lg shadow-md max-w-md text-center">
        {loading ? (
          <p className="text-gray-600">Confirmando tu cuenta...</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[#2E5430] mb-4">Confirmación</h1>
            <p>{message}</p>
            <a
              href="/login"
              className="mt-4 inline-block px-4 py-2 bg-[#2E5430] text-white rounded-md hover:bg-green-700"
            >
              Ir al login
            </a>
          </>
        )}
      </div>
    </div>
  );
}

// Componente de loading para Suspense
function ConfirmEmailLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#fefaf2]">
      <div className="p-6 bg-white rounded-lg shadow-md max-w-md text-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}

// Componente principal con Suspense boundary
export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<ConfirmEmailLoading />}>
      <ConfirmEmailContent />
    </Suspense>
  );
}

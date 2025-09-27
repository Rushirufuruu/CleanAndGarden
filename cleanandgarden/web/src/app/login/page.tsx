"use client";
import { useState } from "react";
import Link from "next/link";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // estados para mensajes
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log("Respuesta del backend:", data);

      if (res.ok) {
        setSuccess("✅ Login exitoso, bienvenido 👋");
        // Aquí podrías guardar el token o redirigir al dashboard
        // localStorage.setItem("token", data.token)
      } else {
        setError(`❌ ${data.error}`);
      }
    } catch (err) {
      console.error("Error al conectar con backend:", err);
      setError("❌ Error de conexión con el servidor");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#fefaf2]">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="mb-6 text-3xl font-bold text-center text-[#2E5430]">
          Iniciar sesión
        </h1>

        {/* Mensajes */}
        {error && (
          <div className="alert alert-error shadow-lg mb-4">
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success shadow-lg mb-4">
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>

          {/* Password con emoji 👁️ */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 text-gray-500"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          {/* Link recuperar */}
          <div className="flex justify-between text-sm">
            <a href="#" className="text-[#2E5430] hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {/* Botón login */}
          <button
            type="submit"
            className="w-full py-2 text-white rounded-md bg-[#2E5430] hover:bg-green-700"
          >
            Ingresar
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-gray-600">
          ¿No tienes una cuenta?{" "}
          <Link href="/register" className="font-medium text-[#2E5430] hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}

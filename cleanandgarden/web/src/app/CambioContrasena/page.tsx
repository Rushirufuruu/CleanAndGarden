"use client";
import { useState } from "react";

export default function CambioContrasena() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 👁️ Estados para mostrar/ocultar contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email:", email);
    console.log("Password actual:", password);
    console.log("Nueva Password:", newPassword);
    console.log("Confirmar Password:", confirmPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F0] px-4">
      <div className="card w-full max-w-md bg-white shadow-xl p-6">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Cambio de contraseña
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <label className="form-control">
            <span className="label-text font-medium">Correo electrónico</span>
            <input
              type="email"
              placeholder="tuemail@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input input-bordered w-full"
              required
            />
          </label>

          {/* Contraseña actual */}
          <label className="form-control">
            <span className="label-text font-medium">
              Ingresa tu contraseña actual
            </span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input input-bordered w-full pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-500"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </label>

          {/* Nueva contraseña */}
          <label className="form-control">
            <span className="label-text font-medium">
              Ingresa la nueva contraseña
            </span>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="********"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input input-bordered w-full pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-2.5 text-gray-500"
              >
                {showNewPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </label>

          {/* Confirmar nueva contraseña */}
          <label className="form-control">
            <span className="label-text font-medium">
              Confirma la nueva contraseña
            </span>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="********"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input input-bordered w-full pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-gray-500"
              >
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </label>

          {/* Enlace */}
          <a
            href="/recuperar"
            className="text-sm text-gray-500 hover:underline text-center"
          >
            ¿No recuerdas tu contraseña actual?
          </a>

          {/* Botones */}
          <div className="flex gap-3 mt-4">
            <button type="submit" className="btn bg-green-700 text-white flex-1">
              Confirmar cambio
            </button>
            <button type="button" className="btn bg-red-400 text-white flex-1">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

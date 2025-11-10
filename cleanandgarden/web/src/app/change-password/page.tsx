"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function CambioContrasena() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validarPassword = (password: string) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
    return regex.test(password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validarPassword(newPassword)) {
      setError(
        "La nueva contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula, un número y un carácter especial."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // 👈 envía el JWT (cookie)
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("✅ Contraseña actualizada correctamente. Debes iniciar sesión nuevamente.");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => (window.location.href = "/login"), 2000);
      } else {
        setError(data.error || "Error al actualizar contraseña.");
      }
    } catch (err) {
      console.error("Error al conectar con backend:", err);
      setError("Error de conexión con el servidor.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F0] px-4">
      <div className="card w-full max-w-md bg-white shadow-xl p-6">
        <h1 className="mb-6 text-3xl font-bold text-center text-[#2E5430]">
          Cambio de contraseña
        </h1>

        {error && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-300 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 text-sm text-green-700 bg-green-50 border border-green-300 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contraseña actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-2 text-gray-500"
              >
                {showOld ? <Eye /> : <EyeOff />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2 text-gray-500"
              >
                {showNew ? <Eye /> : <EyeOff />}
              </button>
            </div>
            <small className="text-xs text-gray-500">
              Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.
            </small>
          </div>

          {/* Confirmar nueva contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-2 text-gray-500"
              >
                {showConfirm ? <Eye /> : <EyeOff />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#2E5430] text-white py-2 rounded-md font-medium hover:bg-[#234624]"
          >
            Cambiar contraseña
          </button>
        </form>
      </div>
    </div>
  );
}

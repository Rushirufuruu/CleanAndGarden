"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import Swal from "sweetalert2";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (password === "") setShowPassword(false);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) return setError("Ingresa un correo");
    if (!password) return setError("Ingresa la contraseña");

    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok && data.user) {
        // Guardar datos de sesión
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userId", data.user.id);
        localStorage.setItem("userRole", data.user.rol);
        localStorage.setItem("userName", data.user.nombre);

        // ⚠️ Si el jardinero no tiene teléfono, redirigir al perfil
        if (data.warning && data.redirectTo) {
          await Swal.fire({
            icon: "warning",
            title: "Información requerida",
            text: data.warning,
            confirmButtonColor: "#2E5430",
          });
          router.push(data.redirectTo);
          return;
        }

        // ✅ Si todo está bien
        setSuccess("✅ Login exitoso, redirigiendo...");
        window.dispatchEvent(new CustomEvent("session-change", { detail: "login" }));

        // 🔄 Redirección según rol
        setTimeout(() => {
          switch (data.user.rol) {
            case "jardinero":
              // 👇 Si tiene teléfono registrado, va al inicio
              if (data.user.telefono && data.user.telefono.trim() !== "") {
                router.push("/");
              } else {
                router.push("/profile");
              }
              break;
            case "admin":
            case "cliente":
            default:
              router.push("/");
              break;
          }
        }, 1000);
      } else {
        setError(`❌ ${data.error || "Credenciales inválidas"}`);
      }
    } catch (err) {
      console.error("Error al conectar con backend:", err);
      setError("❌ Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#fefaf2]">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="mb-6 text-3xl font-bold text-center text-[#2E5430]">
          Iniciar sesión
        </h1>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success mb-4">
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              {password && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-gray-500 hover:text-[#2E5430]"
                >
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <a href="/forgot-password" className="text-[#2E5430] hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-white rounded-md bg-[#2E5430] hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Ingresar"}
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
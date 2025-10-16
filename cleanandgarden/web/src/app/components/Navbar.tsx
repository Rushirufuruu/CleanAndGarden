"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Swal from "sweetalert2";
import { Settings, UserPlus, BarChart3,ShieldCheck } from "lucide-react"; // 👈 nuevos íconos para admin

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  // ✅ Detectar cliente
  useEffect(() => setIsClient(true), []);

  // ✅ Verificar sesión
  useEffect(() => {
    if (!isClient) return;

    const checkSession = async () => {
      try {
        const res = await fetch("http://localhost:3001/profile", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();

        if (res.ok && data.user) {
          setIsLoggedIn(true);
          setUserRole(data.user.rol);
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("userRole", data.user.rol);
        } else {
          const storedLogin = localStorage.getItem("isLoggedIn");
          const storedRole = localStorage.getItem("userRole");
          if (storedLogin === "true" && storedRole) {
            setIsLoggedIn(true);
            setUserRole(storedRole);
          } else {
            setIsLoggedIn(false);
            setUserRole(null);
          }
        }
      } catch {
        const storedLogin = localStorage.getItem("isLoggedIn");
        const storedRole = localStorage.getItem("userRole");
        if (storedLogin === "true" && storedRole) {
          setIsLoggedIn(true);
          setUserRole(storedRole);
        } else {
          setIsLoggedIn(false);
          setUserRole(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // 🔁 Eventos globales de sesión
    const handleSessionChange = (event: Event) => {
      const custom = event as CustomEvent;
      if (custom.detail === "login") {
        setIsLoggedIn(true);
        setUserRole(localStorage.getItem("userRole"));
      }
      if (custom.detail === "logout") {
        setIsLoggedIn(false);
        setUserRole(null);
      }
    };

    window.addEventListener("session-change", handleSessionChange);
    return () => window.removeEventListener("session-change", handleSessionChange);
  }, [isClient]);

  // 🚪 Cerrar sesión
  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "¿Cerrar sesión?",
      text: "Tu sesión actual se cerrará.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4a7e49",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, cerrar sesión",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch("http://localhost:3001/logout", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        localStorage.clear();
        window.dispatchEvent(new CustomEvent("session-change", { detail: "logout" }));
        await Swal.fire({
          icon: "success",
          title: "Sesión cerrada",
          showConfirmButton: false,
          timer: 1500,
        });
        window.location.href = "/login";
      } else {
        Swal.fire("Error", "No se pudo cerrar la sesión correctamente", "error");
      }
    } catch {
      Swal.fire("Error", "Error de conexión con el servidor", "error");
    }
  };

  if (!isClient) return null;

  if (loading)
    return (
      <div className="navbar shadow-md px-4 sticky top-0 z-50 bg-[#f5e9d7]">
        <div className="flex justify-center w-full py-3 text-[#4a7e49] font-medium">
          Verificando sesión...
        </div>
      </div>
    );

  return (
    <div
      className="navbar shadow-md px-4 sticky top-0 z-50"
      style={{ backgroundColor: "#f5e9d7" }}
    >
      {/* Logo */}
      <div className="navbar-start">
        <Link href="/" style={{ display: "inline-block" }}>
          <Image
            src="/logo.png"
            alt="Logo Clean & Garden"
            width={48}
            height={48}
            className="h-12 w-auto"
            priority
          />
        </Link>
      </div>

      {/* Menú principal */}
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1 gap-1">
          <li><Link href="/">Inicio</Link></li>
          <li><Link href="/about-us">Quienes Somos</Link></li>
          <li><Link href="/our-services">Servicios</Link></li>
          <li><Link href="/portfolio">Portafolio</Link></li>
          <li><Link href="/book-appointment">Agenda tu hora</Link></li>

          {/* ✅ Panel Admin moderno */}
          {isLoggedIn && userRole === "admin" && (
            <li className="relative">
              <button
                onClick={() => setShowAdminMenu(!showAdminMenu)}
                className="flex items-center gap-2 bg-[#4a7e49] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#356c36] transition-all shadow-sm"
              >
                <Settings size={18} /> Panel Admin ▾
              </button>

              {showAdminMenu && (
                <ul
                  className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 shadow-xl rounded-xl animate-fadeIn z-50 overflow-hidden"
                  onMouseLeave={() => setShowAdminMenu(false)}
                >
                  <li>
                    <Link
                      href="/admin/gestion-usuarios"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-[#f5e9d7] hover:text-[#2E5430] transition"
                      onClick={() => setShowAdminMenu(false)}
                    >
                      <UserPlus size={18} /> Gestión de Usuarios
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin/gestion-roles"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-[#f5e9d7] hover:text-[#2E5430] transition"
                      onClick={() => setShowAdminMenu(false)}
                    >
                      <ShieldCheck size={18} /> Gestión de Roles
                    </Link>
                  </li>
                  <li>
                    <span className="flex items-center gap-2 px-4 py-2 text-gray-400 cursor-not-allowed">
                      <BarChart3 size={18} /> (Más opciones pronto)
                    </span>
                  </li>
                </ul>
              )}
            </li>
          )}
        </ul>
      </div>

      {/* Zona derecha (botones de sesión) */}
      <div className="navbar-end hidden lg:flex space-x-4">
        {!isLoggedIn ? (
          <>
            <Link href="/login">
              <span
                className="btn rounded-lg"
                style={{ backgroundColor: "#4a7e49", color: "#fff", border: "none" }}
              >
                Inicia Sesión
              </span>
            </Link>
            <Link href="/register">
              <span
                className="btn rounded-lg"
                style={{ backgroundColor: "#4a7e49", color: "#fff", border: "none" }}
              >
                Regístrate
              </span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/profile">
              <span
                className="btn rounded-lg"
                style={{ backgroundColor: "#4a7e49", color: "#fff", border: "none" }}
              >
                Mi Perfil
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="btn rounded-lg"
              style={{ backgroundColor: "#b93b3b", color: "#fff", border: "none" }}
            >
              Cerrar Sesión
            </button>
          </>
        )}
      </div>

      {/* Menú móvil */}
      <div className="lg:hidden navbar-end" style={{ backgroundColor: "#f5e9d7" }}>
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-ghost btn-circle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </label>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow rounded-box w-52 bg-[#f5e9d7]"
          >
            <li><Link href="/">Inicio</Link></li>
            <li><Link href="/about-us">Quienes Somos</Link></li>
            <li><Link href="/our-services">Servicios</Link></li>
            <li><Link href="/portfolio">Portafolio</Link></li>
            <li><Link href="/book-appointment">Agenda tu hora</Link></li>

            {/* Panel admin móvil */}
            {isLoggedIn && userRole === "admin" && (
              <>
                <li className="font-semibold text-[#2E5430]">Panel Admin</li>
                <li><Link href="/admin/registro-jardinero">Registrar Jardinero</Link></li>
              </>
            )}

            {!isLoggedIn ? (
              <li>
                <Link href="/login">
                  <span className="btn rounded-lg w-full bg-[#4a7e49] text-white border-none">
                    Regístrate o inicia sesión
                  </span>
                </Link>
              </li>
            ) : (
              <>
                <li>
                  <Link href="/profile">
                    <span className="btn rounded-lg w-full bg-[#4a7e49] text-white border-none">
                      Mi Perfil
                    </span>
                  </Link>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="btn rounded-lg w-full bg-[#b93b3b] text-white border-none"
                  >
                    Cerrar Sesión
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* 🔹 Animación fadeIn */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-in-out;
        }
      `}</style>
    </div>
  );
}

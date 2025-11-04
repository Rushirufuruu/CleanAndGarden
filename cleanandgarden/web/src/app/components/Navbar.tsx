"use client";
import { useEffect, useState } from "react";
import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Swal from "sweetalert2";
import { Settings, UserPlus, BarChart3, ShieldCheck, User, Wrench, Images } from "lucide-react";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showAgendaMenu, setShowAgendaMenu] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current as any);
    };
  }, []);

  // Detectar cliente
  useEffect(() => setIsClient(true), []);

  // ✅ Verificar sesión (versión mejorada)
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
          const rolValue = data.user.rol?.codigo || data.user.rol || "";
          const nombreValue = data.user.nombre || "";
          const apellidoValue = data.user.apellido || "";
          const fullName = `${nombreValue} ${apellidoValue}`.trim();

          setIsLoggedIn(true);
          setUserRole(rolValue);
          setUserName(fullName);

          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("userRole", rolValue);
          localStorage.setItem("userName", fullName);
        } else {
          // fallback con localStorage
          const storedLogin = localStorage.getItem("isLoggedIn");
          const storedRole = localStorage.getItem("userRole");
          const storedName = localStorage.getItem("userName");

          if (storedLogin === "true" && storedRole && storedName) {
            setIsLoggedIn(true);
            setUserRole(storedRole);
            setUserName(storedName);
          } else {
            setIsLoggedIn(false);
            setUserRole(null);
            setUserName(null);
          }
        }
      } catch {
        // si el backend no responde, usa localStorage
        const storedLogin = localStorage.getItem("isLoggedIn");
        const storedRole = localStorage.getItem("userRole");
        const storedName = localStorage.getItem("userName");

        if (storedLogin === "true" && storedRole && storedName) {
          setIsLoggedIn(true);
          setUserRole(storedRole);
          setUserName(storedName);
        } else {
          setIsLoggedIn(false);
          setUserRole(null);
          setUserName(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // 🔁 Escuchar eventos globales de sesión
    const handleSessionChange = (event: Event) => {
      const custom = event as CustomEvent;
      if (custom.detail === "login") {
        const storedRole = localStorage.getItem("userRole");
        const storedName = localStorage.getItem("userName");
        setIsLoggedIn(true);
        setUserRole(storedRole);
        setUserName(storedName);
      }
      if (custom.detail === "logout") {
        setIsLoggedIn(false);
        setUserRole(null);
        setUserName(null);
      }
    };

    window.addEventListener("session-change", handleSessionChange);
    return () => window.removeEventListener("session-change", handleSessionChange);
  }, [isClient]);

  // Cerrar sesión
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
      }
    } catch {
      Swal.fire("Error", "Error de conexión con el servidor", "error");
    }
  };

  if (!isClient || loading) return null;

  return (
    <div className="navbar shadow-md px-6 py-2 sticky top-0 z-50 bg-[#f5e9d7]">
      {/* Logo + Info usuario */}
      <div className="navbar-start flex items-center gap-4">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Logo Clean & Garden"
            width={48}
            height={48}
            className="h-12 w-auto"
            priority
          />
        </Link>

        {/*  Info usuario */}
        {isLoggedIn && userName && userRole && (
          <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
            <User className="text-[#2E5430]" size={20} />
            <div className="text-sm leading-tight">
              <p className="font-semibold text-[#2E5430] capitalize">{userName}</p>
              <p className="text-gray-600 text-xs">{userRole}</p>
            </div>
          </div>
        )}
      </div>

      {/* Menú principal */}
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1 gap-1">
          <li><Link href="/">Inicio</Link></li>
          <li><Link href="/about-us">Quienes Somos</Link></li>
          <li><Link href="/our-services">Servicios</Link></li>
          <li><Link href="/portfolio">Portafolio</Link></li>
          {/* Agenda dropdown: keep open while hovering button or menu using a short close timeout */}
          <li className="relative">
            {/* timeout ref and handlers */}
            {/* defined above in component scope */}
            <button
              onClick={() => setShowAgendaMenu((s) => !s)}
              onMouseEnter={() => {
                if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                setShowAgendaMenu(true);
              }}
              onMouseLeave={() => {
                closeTimeoutRef.current = setTimeout(() => setShowAgendaMenu(false), 150);
              }}
              className="px-3 py-2 rounded hover:bg-gray-100 transition relative z-20"
            >
              Agenda ▾
            </button>

            {showAgendaMenu && (
              <ul
                className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 shadow-lg rounded-lg z-10 overflow-hidden"
                onMouseEnter={() => {
                  if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                  setShowAgendaMenu(true);
                }}
                onMouseLeave={() => {
                  closeTimeoutRef.current = setTimeout(() => setShowAgendaMenu(false), 150);
                }}
              >
                <li>
                  <Link href="/book-appointment" className="block px-4 py-2 text-gray-700 hover:bg-[#f5e9d7]">
                    Agenda tu hora
                  </Link>
                </li>
                <li>
                  <Link href="/agendamientos" className="block px-4 py-2 text-gray-700 hover:bg-[#f5e9d7]">
                    Ver tus citas
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* Panel admin */}
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
                     Gestión de Usuarios
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin/gestion-roles"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-[#f5e9d7] hover:text-[#2E5430] transition"
                      onClick={() => setShowAdminMenu(false)}
                    >
                       Gestión de Roles
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin/gestion-insumos"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-[#f5e9d7] hover:text-[#2E5430] transition"
                      onClick={() => setShowAdminMenu(false)}
                    >
                       Gestión de Insumos
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin/gestion-direcciones-jardines"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-[#f5e9d7] hover:text-[#2E5430] transition"
                      onClick={() => setShowAdminMenu(false)}
                    >
                       Gestión de Jardines 
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin/gestion-horarios"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-[#f5e9d7] hover:text-[#2E5430] transition"
                      onClick={() => setShowAdminMenu(false)}
                    >
                       Gestión de Horarios/Disponibilidad 
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="gestion-excepciones"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-[#f5e9d7] hover:text-[#2E5430] transition"
                      onClick={() => setShowAdminMenu(false)}
                    >
                       Gestión de Excepciones de Horarios 
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin/crud-services"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-[#f5e9d7] hover:text-[#2E5430] transition"
                      onClick={() => setShowAdminMenu(false)}
                    >
                      <Wrench size={18} /> Gestión de Servicios
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin/crud-portfolio"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-[#f5e9d7] hover:text-[#2E5430] transition"
                      onClick={() => setShowAdminMenu(false)}
                    >
                      <Images size={18} /> Gestión de Portafolio
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

      {/* Botones sesión */}
      <div className="navbar-end hidden lg:flex space-x-3">
        {!isLoggedIn ? (
          <>
            <Link href="/login">
              <span className="btn rounded-lg bg-[#4a7e49] text-white border-none">
                Inicia Sesión
              </span>
            </Link>
            <Link href="/register">
              <span className="btn rounded-lg bg-[#4a7e49] text-white border-none">
                Regístrate
              </span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/mensajes">
              <span
                className="btn rounded-lg"
                style={{ backgroundColor: "#4a7e49", color: "#fff", border: "none" }}
              >
                Mensajes
              </span>
            </Link>
            <Link href="/profile">
              <span className="btn rounded-lg bg-[#2E5430] text-white border-none">
                Mi Perfil
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="btn rounded-lg bg-[#b93b3b] text-white border-none"
            >
              Cerrar Sesión
            </button>
          </>
        )}
      </div>

      {/* Animación */}
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
            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow rounded-box w-52"
            style={{ backgroundColor: "#f5e9d7" }}
          >
            <li><Link href="/">Inicio</Link></li>
            <li><Link href="/about-us">Quienes Somos</Link></li>
            <li><Link href="/our-services">Servicios</Link></li>
            <li><Link href="/portfolio">Portafolio</Link></li>
            <li
              className="relative"
              onMouseEnter={() => setShowAgendaMenu(true)}
              onMouseLeave={() => setShowAgendaMenu(false)}
            >
              <button
                onClick={() => setShowAgendaMenu((s) => !s)}
                className="px-3 py-2 rounded hover:bg-gray-100 transition"
              >
                Agenda ▾
              </button>

              {showAgendaMenu && (
                <ul className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg rounded-lg z-50 overflow-hidden">
                  <li>
                    <Link href="/book-appointment" className="block px-4 py-2 text-gray-700 hover:bg-[#f5e9d7]">
                      Agenda tu hora
                    </Link>
                  </li>
                  <li>
                    <Link href="/book-appointment#mis-citas" className="block px-4 py-2 text-gray-700 hover:bg-[#f5e9d7]">
                      Ver tus citas
                    </Link>
                  </li>
                </ul>
              )}
            </li>
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
                  <Link href="/mensajes">
                    <span className="btn rounded-lg w-full bg-[#4a7e49] text-white border-none">
                      Mensajes
                    </span>
                  </Link>
                </li>
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
    </div>
  );
}

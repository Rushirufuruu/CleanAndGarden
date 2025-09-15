"use client";

import { useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="header-bar">
      <nav className="header-nav">
        <div className="header-logo">
          <img src="/logo.png" alt="Logo Clean & Garden" style={{ height: 70 }} />
        </div>
        
        {/* Botón hamburguesa */}
        <button 
          className="mobile-menu-btn"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
        </button>

        {/* Menú de navegación */}
        <ul className={`header-menu ${isMenuOpen ? 'mobile-open' : ''}`}>
          <li><a href="#" onClick={() => setIsMenuOpen(false)}>Inicio</a></li>
          <li><a href="#" onClick={() => setIsMenuOpen(false)}>Quienes Somos</a></li>
          <li><a href="#" onClick={() => setIsMenuOpen(false)}>Servicios</a></li>
          <li><a href="#" onClick={() => setIsMenuOpen(false)}>Portafolio</a></li>
          <li><a href="#" onClick={() => setIsMenuOpen(false)}>Agenda tu hora</a></li>
          <li className="mobile-auth-btn">
            <a href="#" className="header-btn mobile" onClick={() => setIsMenuOpen(false)}>
              Regístrate o inicia sesión
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}

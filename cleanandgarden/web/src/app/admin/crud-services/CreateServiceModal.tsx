"use client";
import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import Swal from "sweetalert2";

// Función para subir imagen a Supabase Storage
const uploadImageToSupabase = async (file: File): Promise<string | null> => {
  try {
    console.log('🔄 Iniciando subida de imagen:', file.name, 'Tamaño:', file.size);
    
    // Generar nombre único para el archivo
    const fileName = `services/${Date.now()}-${file.name}`;
    console.log('📁 Nombre del archivo:', fileName);
    
    // Subir archivo al bucket
    const { data, error } = await supabase.storage
      .from('clean-and-garden-bucket')
      .upload(fileName, file);

    if (error) {
      throw error;
    }


    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('clean-and-garden-bucket')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    return null;
  }
};

interface CreateServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceCreated: () => void;
}

interface ServiceForm {
  nombre: string;
  categoria: string;
  descripcion: string;
  horas: number;
  minutos: number;
  precio: number;
  imagen: File | null;
}

export default function CreateServiceModal({
  isOpen,
  onClose,
  onServiceCreated,
}: CreateServiceModalProps) {
  const [form, setForm] = useState<ServiceForm>({
    nombre: "",
    categoria: "",
    descripcion: "",
    horas: 0,
    minutos: 0,
    precio: 0,
    imagen: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nombre.trim()) {
      setError("El nombre del servicio es requerido");
      return;
    }
    if (!form.categoria.trim()) {
      setError("La categoría es requerida");
      return;
    }
    if (form.precio <= 0) {
      setError("El precio debe ser mayor a 0");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const duracionTotal = form.horas * 60 + form.minutos;

      // Subir imagen si existe
      let imagenUrl = null;
      if (form.imagen) {
        try {
          imagenUrl = await uploadImageToSupabase(form.imagen);
        } catch {
          throw new Error("Error al subir la imagen");
        }
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/servicios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          categoria: form.categoria.trim(),
          descripcion: form.descripcion.trim() || null,
          duracion_minutos: duracionTotal,
          precio_clp: form.precio,
          imagen_url: imagenUrl, // Agregar URL de imagen
          activo: true,
        }),
      });

      if (!response.ok) {
        // Verificar si la respuesta es HTML (error del servidor)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          throw new Error(`Error del servidor (${response.status}). Verifica que el backend esté corriendo en ${process.env.NEXT_PUBLIC_API_URL}`);
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear el servicio");
      }

      // Mostrar alerta de éxito con SweetAlert
      await Swal.fire({
        icon: "success",
        title: "Servicio creado",
        text: `El servicio "${form.nombre}" ha sido creado correctamente.`,
        confirmButtonColor: "#2E5430",
        confirmButtonText: "Aceptar",
      });

      // limpiar form
      setForm({
        nombre: "",
        categoria: "",
        descripcion: "",
        horas: 0,
        minutos: 0,
        precio: 0,
        imagen: null,
      });

      onServiceCreated();
      onClose();
    } catch (err) {
      console.error("Error al crear servicio:", err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((err as any).message || "Error al crear el servicio");
      
      // Mostrar alerta de error con SweetAlert
      await Swal.fire({
        icon: "error",
        title: "Error al crear servicio",
        text: (err as any).message || "Error al crear el servicio",
        confirmButtonColor: "#d33",
        confirmButtonText: "Aceptar",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para manejar click fuera del modal
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-[#fefaf2]/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6">
          <h2 className="text-center text-lg sm:text-xl md:text-2xl font-bold text-[#2E5430] mb-4 sm:mb-6">
            Crear nuevo servicio
          </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">❌ {error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre servicio *
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
              placeholder="Ej: Corte de césped"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría *
            </label>
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
              disabled={isSubmitting}
              required
            >
              <option value="">Seleccione una categoría</option>
              <option value="Corte">Corte</option>
              <option value="Instalación">Instalación</option>
              <option value="Mantención">Mantención</option>
              <option value="Podación">Podación</option>
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
              placeholder="Describe brevemente el servicio..."
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Duración */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duración *
            </label>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <select
                value={form.horas}
                onChange={(e) =>
                  setForm({ ...form, horas: parseInt(e.target.value) || 0 })
                }
                className="w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430]"
                disabled={isSubmitting}
              >
                <option value={0}>0 horas</option>
                <option value={1}>1 hora</option>
                <option value={2}>2 horas</option>
                <option value={3}>3 horas</option>
                <option value={4}>4 horas</option>
                <option value={5}>5 horas</option>
                <option value={6}>6 horas</option>
                <option value={7}>7 horas</option>
                <option value={8}>8 horas</option>
              </select>
              <select
                value={form.minutos}
                onChange={(e) =>
                  setForm({ ...form, minutos: parseInt(e.target.value) || 0 })
                }
                className="w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430]"
                disabled={isSubmitting}
              >
                <option value={0}>0 minutos</option>
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
              </select>
            </div>
          </div>

          {/* Precio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio base (CLP) *
            </label>
            <input
              type="number"
              value={form.precio === 0 ? "" : form.precio}
              onChange={(e) =>
                setForm({ ...form, precio: e.target.value === "" ? 0 : parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430]"
              placeholder="Ej: 30000"
              min="0"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Imagen del servicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imagen del servicio
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setForm({ ...form, imagen: file });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430]"
              disabled={isSubmitting}
            />
            {form.imagen && (
              <div className="mt-2 text-sm text-gray-600 bg-green-50 p-2 rounded">
                📎 {form.imagen.name}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Formatos soportados: JPG, PNG, WEBP (máx. 5MB)
            </p>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row justify-between pt-4 space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#2E5430] hover:bg-green-800 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? "Registrando..." : "Registrar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-[#E57373] hover:bg-[#ef5350] text-white font-semibold py-2 rounded-lg disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

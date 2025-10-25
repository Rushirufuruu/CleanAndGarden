"use client";
import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import Swal from "sweetalert2";

const uploadImageToSupabase = async (file: File): Promise<string | null> => {
  try {
    console.log('Iniciando subida de imagen:', file.name, 'Tamaño:', file.size);
    
    const fileName = `portfolio/${Date.now()}-${file.name}`;
    console.log('Nombre del archivo:', fileName);
    
    const { data, error } = await supabase.storage
      .from('clean-and-garden-bucket')
      .upload(fileName, file);

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('clean-and-garden-bucket')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    return null;
  }
};

interface CreatePortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPortfolioCreated: () => void;
}

interface PortfolioForm {
  titulo: string;
  descripcion: string;
  publicado: boolean;
  imagen: File | null;
}

export default function CreatePortfolioModal({
  isOpen,
  onClose,
  onPortfolioCreated,
}: CreatePortfolioModalProps) {
  const [form, setForm] = useState<PortfolioForm>({
    titulo: "",
    descripcion: "",
    publicado: false,
    imagen: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.titulo.trim()) {
      setError("El título es requerido");
      return;
    }
    if (!form.descripcion.trim()) {
      setError("La descripción es requerida");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      let imagenUrl = null;
      if (form.imagen) {
        try {
          imagenUrl = await uploadImageToSupabase(form.imagen);
        } catch {
          throw new Error("Error al subir la imagen");
        }
      }

      const response = await fetch("http://localhost:3001/admin/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo.trim(),
          descripcion: form.descripcion.trim(),
          publicado: form.publicado,
          imagen_url: imagenUrl,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          throw new Error(`Error del servidor (${response.status}). Verifica que el backend esté corriendo en http://localhost:3001`);
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear el trabajo");
      }

      await Swal.fire({
        icon: "success",
        title: "Trabajo creado",
        text: `El trabajo "${form.titulo}" ha sido creado correctamente.`,
        confirmButtonColor: "#2E5430",
        confirmButtonText: "Aceptar",
      });

      setForm({
        titulo: "",
        descripcion: "",
        publicado: false,
        imagen: null,
      });

      onPortfolioCreated();
      onClose();
    } catch (err) {
      console.error("Error al crear trabajo:", err);
      setError((err as Error).message || "Error al crear el trabajo");
      
      await Swal.fire({
        icon: "error",
        title: "Error al crear trabajo",
        text: (err as Error).message || "Error al crear el trabajo",
        confirmButtonColor: "#d33",
        confirmButtonText: "Aceptar",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        className="bg-white rounded-2xl shadow-xl w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[90vh] overflow-y-auto border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6">
          <h2 className="text-center text-lg sm:text-xl md:text-2xl font-bold text-[#2E5430] mb-4 sm:mb-6">
            Crear nuevo trabajo del portafolio
          </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
              placeholder="Ej: Jardín residencial Los Andes"
              disabled={isSubmitting}
              required
            />
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
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
              placeholder="Describe el trabajo realizado..."
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Estado de publicación */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="publicado"
              checked={form.publicado}
              onChange={(e) => setForm({ ...form, publicado: e.target.checked })}
              className="w-4 h-4 text-[#2E5430] border-gray-300 rounded focus:ring-[#2E5430]"
              disabled={isSubmitting}
            />
            <label htmlFor="publicado" className="ml-2 text-sm font-medium text-gray-700">
              Publicar inmediatamente
            </label>
          </div>

          {/* Imagen del trabajo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imagen principal *
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
              required
            />
            {form.imagen && (
              <div className="mt-2 text-sm text-gray-600 bg-green-50 p-2 rounded">
                {form.imagen.name}
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
              {isSubmitting ? "Creando..." : "Crear trabajo"}
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

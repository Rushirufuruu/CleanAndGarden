"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
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
      console.error('Error uploading image:', error);
      throw error;
    }

    console.log('Imagen subida exitosamente:', data);

    const { data: urlData } = supabase.storage
      .from('clean-and-garden-bucket')
      .getPublicUrl(fileName);

    console.log('URL pública generada:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadImageToSupabase:', error);
    return null;
  }
};

interface PortfolioItem {
  id: number;
  titulo: string;
  descripcion: string | null;
  publicado: boolean;
  imagenUrl?: string | null;
}

interface UpdatePortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPortfolioUpdated: () => void;
  portfolio: PortfolioItem | null;
}

interface PortfolioForm {
  titulo: string;
  descripcion: string;
  publicado: boolean;
  imagen: File | null;
  imagenActual: string | null;
}

export default function UpdatePortfolioModal({
  isOpen,
  onClose,
  onPortfolioUpdated,
  portfolio,
}: UpdatePortfolioModalProps) {
  const [form, setForm] = useState<PortfolioForm>({
    titulo: "",
    descripcion: "",
    publicado: false,
    imagen: null,
    imagenActual: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (portfolio && isOpen) {
      setForm({
        titulo: portfolio.titulo,
        descripcion: portfolio.descripcion || "",
        publicado: portfolio.publicado,
        imagen: null,
        imagenActual: portfolio.imagenUrl || null,
      });
      setError(null);
    }
  }, [portfolio, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!portfolio) return;

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

      let imagenUrl = form.imagenActual;
      if (form.imagen) {
        try {
          const nuevaImagenUrl = await uploadImageToSupabase(form.imagen);
          if (nuevaImagenUrl) {
            imagenUrl = nuevaImagenUrl;
          }
        } catch {
          throw new Error("Error al subir la nueva imagen");
        }
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/portfolio/${portfolio.id}`, {
        method: "PUT",
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
          throw new Error(`Error del servidor (${response.status}). Verifica que el backend esté corriendo en ${process.env.NEXT_PUBLIC_API_URL}`);
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar el trabajo");
      }

      await Swal.fire({
        icon: "success",
        title: "¡Trabajo actualizado!",
        text: `El trabajo "${form.titulo}" ha sido actualizado correctamente.`,
        confirmButtonColor: "#2E5430",
        confirmButtonText: "Aceptar",
      });

      setForm({
        titulo: "",
        descripcion: "",
        publicado: false,
        imagen: null,
        imagenActual: null,
      });
      
      onPortfolioUpdated();
      onClose();
    } catch (err) {
      console.error("Error al actualizar trabajo:", err);
      setError(err instanceof Error ? err.message : "Error al actualizar el trabajo");
      
      await Swal.fire({
        icon: "error",
        title: "Error al actualizar",
        text: err instanceof Error ? err.message : "Error al actualizar el trabajo",
        confirmButtonColor: "#d33",
        confirmButtonText: "Aceptar",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona un archivo de imagen válido');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen debe ser menor a 5MB');
        return;
      }
      setForm(prev => ({ ...prev, imagen: file }));
      setError(null);
    }
  };

  const handleRemoveImage = () => {
    setForm(prev => ({ ...prev, imagen: null, imagenActual: null }));
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  if (!isOpen || !portfolio) return null;

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
            Actualizar trabajo del portafolio
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
                onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
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
                onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
                rows={4}
                placeholder="Describe el trabajo realizado..."
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Estado de publicación */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="publicado"
                checked={form.publicado}
                onChange={(e) => setForm(prev => ({ ...prev, publicado: e.target.checked }))}
                className="h-4 w-4 text-[#2E5430] focus:ring-[#2E5430] border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <label htmlFor="publicado" className="text-sm font-medium text-gray-700">
                Trabajo publicado
              </label>
            </div>

            {/* Imagen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imagen principal
              </label>
              
              {/* Imagen actual */}
              {form.imagenActual && !form.imagen && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">Imagen actual:</p>
                  <div className="relative inline-block">
                    <Image
                      src={form.imagenActual}
                      alt="Imagen actual"
                      width={200}
                      height={150}
                      className="rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                      disabled={isSubmitting}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Nueva imagen seleccionada */}
              {form.imagen && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">Nueva imagen:</p>
                  <div className="relative inline-block">
                    <Image
                      src={URL.createObjectURL(form.imagen)}
                      alt="Nueva imagen"
                      width={200}
                      height={150}
                      className="rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, imagen: null }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                      disabled={isSubmitting}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430] focus:border-transparent text-sm"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG, WEBP. Máximo 5MB.
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#2E5430] text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Actualizando..." : "Actualizar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

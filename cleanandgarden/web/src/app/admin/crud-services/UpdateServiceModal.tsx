"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "../../../lib/supabase";
import Swal from "sweetalert2";

// Función para subir imagen a Supabase Storage
const uploadImageToSupabase = async (file: File): Promise<string | null> => {
  try {
    console.log('Iniciando subida de imagen:', file.name, 'Tamaño:', file.size);
    
    // Generar nombre único para el archivo
    const fileName = `services/${Date.now()}-${file.name}`;
    console.log('Nombre del archivo:', fileName);
    
    // Subir archivo al bucket
    const { data, error } = await supabase.storage
      .from('clean-and-garden-bucket')
      .upload(fileName, file);

    if (error) {
      console.error('Error uploading image:', error);
      throw error;
    }

    console.log('Imagen subida exitosamente:', data);

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('clean-and-garden-bucket')
      .getPublicUrl(fileName);

    console.log('🔗 URL pública generada:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadImageToSupabase:', error);
    return null;
  }
};

interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  duracion: number;
  precio: number;
  activo: boolean;
  imagenUrl?: string | null;
}

interface UpdateServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceUpdated: () => void;
  servicio: Servicio | null;
}

interface ServiceForm {
  nombre: string;
  categoria: string;
  descripcion: string;
  horas: number;
  minutos: number;
  precio: number;
  activo: boolean;
  imagen: File | null;
  imagenActual: string | null;
}

export default function UpdateServiceModal({
  isOpen,
  onClose,
  onServiceUpdated,
  servicio,
}: UpdateServiceModalProps) {
  const [form, setForm] = useState<ServiceForm>({
    nombre: "",
    categoria: "",
    descripcion: "",
    horas: 0,
    minutos: 0,
    precio: 0,
    activo: true,
    imagen: null,
    imagenActual: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del servicio cuando se abre el modal
  useEffect(() => {
    if (servicio && isOpen) {
      const horas = Math.floor(servicio.duracion / 60);
      const minutos = servicio.duracion % 60;
      
      setForm({
        nombre: servicio.nombre,
        categoria: "", // TODO: Agregar categoria al modelo si es necesario
        descripcion: servicio.descripcion || "",
        horas,
        minutos,
        precio: servicio.precio,
        activo: servicio.activo,
        imagen: null,
        imagenActual: servicio.imagenUrl || null,
      });
      setError(null);
    }
  }, [servicio, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!servicio) return;

    if (!form.nombre.trim()) {
      setError("El nombre del servicio es requerido");
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

      // Subir nueva imagen si existe
      let imagenUrl = form.imagenActual; // Mantener la imagen actual por defecto
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/servicios/${servicio.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          categoria: form.categoria.trim() || null,
          descripcion: form.descripcion.trim() || null,
          duracion_minutos: duracionTotal,
          precio_clp: form.precio,
          imagen_url: imagenUrl,
          activo: form.activo,
        }),
      });

      if (!response.ok) {
        // Verificar si la respuesta es HTML (error del servidor)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          throw new Error(`Error del servidor (${response.status}). Verifica que el backend esté corriendo en ${process.env.NEXT_PUBLIC_API_URL}`);
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar el servicio");
      }

      // Mostrar alerta de éxito con SweetAlert
      await Swal.fire({
        icon: "success",
        title: "¡Servicio actualizado!",
        text: `El servicio "${form.nombre}" ha sido actualizado correctamente.`,
        confirmButtonColor: "#2E5430",
        confirmButtonText: "Aceptar",
      });

      // Limpiar formulario y cerrar modal
      setForm({
        nombre: "",
        categoria: "",
        descripcion: "",
        horas: 0,
        minutos: 0,
        precio: 0,
        activo: true,
        imagen: null,
        imagenActual: null,
      });
      
      onServiceUpdated();
      onClose();
    } catch (err) {
      console.error("Error al actualizar servicio:", err);
      setError(err instanceof Error ? err.message : "Error al actualizar el servicio");
      
      // Mostrar alerta de error con SweetAlert
      await Swal.fire({
        icon: "error",
        title: "Error al actualizar",
        text: err instanceof Error ? err.message : "Error al actualizar el servicio",
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
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona un archivo de imagen válido');
        return;
      }
      // Validar tamaño (5MB máximo)
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

  // Función para manejar click fuera del modal
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  if (!isOpen || !servicio) return null;

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
            Actualizar servicio
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">❌ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Nombre del servicio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre servicio *
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
                placeholder="Ej: Poda de árboles"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={form.categoria}
                onChange={(e) => setForm(prev => ({ ...prev, categoria: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
                disabled={isSubmitting}
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
                Descripción
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
                rows={3}
                placeholder="Describe el servicio..."
                disabled={isSubmitting}
              />
            </div>

            {/* Duración */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duración *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Horas</label>
                  <select
                    value={form.horas}
                    onChange={(e) => setForm(prev => ({ ...prev, horas: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
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
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Minutos</label>
                  <select
                    value={form.minutos}
                    onChange={(e) => setForm(prev => ({ ...prev, minutos: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
                    disabled={isSubmitting}
                  >
                    <option value={0}>0 minutos</option>
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={45}>45 minutos</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total: {form.horas * 60 + form.minutos} minutos
              </p>
            </div>

            {/* Precio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio (CLP) *
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={form.precio === 0 ? "" : form.precio}
                onChange={(e) => setForm(prev => ({ ...prev, precio: e.target.value === "" ? 0 : parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2E5430] focus:border-transparent"
                placeholder="Ej: 25000"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Estado activo */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activo"
                checked={form.activo}
                onChange={(e) => setForm(prev => ({ ...prev, activo: e.target.checked }))}
                className="h-4 w-4 text-[#2E5430] focus:ring-[#2E5430] border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <label htmlFor="activo" className="text-sm font-medium text-gray-700">
                Servicio activo
              </label>
            </div>

            {/* Imagen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imagen del servicio
              </label>
              
              {/* Imagen actual */}
              {form.imagenActual && !form.imagen && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">Imagen actual:</p>
                  <div className="relative inline-block">
                    <Image
                      src={form.imagenActual}
                      alt="Imagen actual"
                      width={150}
                      height={100}
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
                      width={150}
                      height={100}
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
                JPG, PNG, GIF. Máximo 5MB.
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
"use client";
import { useState, useEffect } from "react";
import { Trash2, Plus } from "lucide-react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

export default function PerfilUsuario() {
  const [user, setUser] = useState<any>(null);
  const [backupUser, setBackupUser] = useState<any>(null); // 👈 copia original para restaurar
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [regiones, setRegiones] = useState<any[]>([]);
  const [comunasPorRegion, setComunasPorRegion] = useState<Record<number, any[]>>({});

  const router = useRouter();

  // ✅ Cargar perfil normalizando direcciones
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("http://localhost:3001/profile", { credentials: "include" });
        const data = await res.json();

        if (res.ok && data.user) {
          const usuario = data.user;

          // 🔧 Normalizamos las direcciones
          usuario.direccion = (usuario.direccion || []).map((dir: any) => ({
            id: dir.id,
            calle: dir.calle || "",
            region: dir.comuna?.region?.nombre || "",
            comuna: dir.comuna?.nombre || "",
          }));

          setUser(usuario);
          setBackupUser(JSON.parse(JSON.stringify(usuario))); // 👈 guardamos copia profunda
        }
      } catch (err) {
        console.error("Error al cargar perfil:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ✅ Cargar regiones
  useEffect(() => {
    const fetchRegiones = async () => {
      try {
        const res = await fetch("http://localhost:3001/regiones");
        const data = await res.json();
        if (res.ok) setRegiones(data);
      } catch (err) {
        console.error("Error al cargar regiones:", err);
      }
    };
    fetchRegiones();
  }, []);

  // ✅ Cargar comunas de una región
  const fetchComunas = async (regionId: number) => {
    if (comunasPorRegion[regionId]) return;
    try {
      const res = await fetch(`http://localhost:3001/regiones/${regionId}/comunas`);
      const data = await res.json();
      if (res.ok) {
        setComunasPorRegion((prev) => ({ ...prev, [regionId]: data }));
      }
    } catch (err) {
      console.error("Error al cargar comunas:", err);
    }
  };

  // ➕ Agregar dirección
  const addDireccion = () => {
    setUser({
      ...user,
      direccion: [
        ...(user?.direccion || []),
        { calle: "", region: "", comuna: "", _new: true },
      ],
    });
  };

  // 🔄 Cambiar valores
  const handleDireccionChange = (index: number, field: string, value: string) => {
    const updated = [...user.direccion];
    updated[index][field] = value;
    setUser({ ...user, direccion: updated });
  };

  // 🗑️ Eliminar dirección
  const deleteDireccion = (index: number) => {
    const updated = [...user.direccion];
    updated.splice(index, 1);
    setUser({ ...user, direccion: updated });
  };

  // ✅ Validar formulario
  const validateForm = () => {
    if (!user.nombre.trim() || !user.apellido.trim() || !user.telefono.trim()) {
      Swal.fire("Campos obligatorios", "Debes completar todos los datos personales", "warning");
      return false;
    }

    for (const dir of user.direccion) {
      if (!dir.calle.trim() || !dir.region || !dir.comuna) {
        Swal.fire("Campos obligatorios", "Todas las direcciones deben tener calle, región y comuna", "warning");
        return false;
      }
    }
    return true;
  };

  // 💾 Guardar cambios
  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const res = await fetch("http://localhost:3001/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nombre: user.nombre,
          apellido: user.apellido,
          telefono: user.telefono,
          direcciones: user.direccion,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Perfil actualizado",
          text: "Los cambios fueron guardados correctamente",
          timer: 2500,
          showConfirmButton: false,
        });
        setEditMode(false);
        setBackupUser(JSON.parse(JSON.stringify(user))); // 👈 actualizamos respaldo
      } else {
        Swal.fire("Error", data.error || "No se pudo actualizar el perfil", "error");
      }
    } catch (err) {
      console.error("Error al guardar perfil:", err);
      Swal.fire("Error", "No se pudo conectar con el servidor", "error");
    } finally {
      setSaving(false);
    }
  };

  // ❌ Cancelar cambios → restaurar perfil original
  const handleCancel = () => {
    if (backupUser) {
      setUser(JSON.parse(JSON.stringify(backupUser))); // 👈 restaura valores previos
    }
    setEditMode(false);
  };

  // 🧭 Estados de carga
  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600">Cargando perfil...</p>
      </div>
    );
  if (!user)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-600 font-semibold">No se pudo cargar el perfil.</p>
      </div>
    );

  // ✅ Render principal
  return (
    <div className="min-h-screen bg-[#FAF6EB] flex flex-col items-center py-10">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-2xl">
        {!editMode ? (
          <>
            <h1 className="text-2xl font-bold text-center text-[#2E5430] mb-6">
              Mi Perfil
            </h1>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-600 text-sm mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={`${user.nombre} ${user.apellido}`}
                  readOnly
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-gray-600 text-sm mb-1">Correo electrónico</label>
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-gray-600 text-sm mb-1">Teléfono</label>
                <input
                  type="text"
                  value={user.telefono || ""}
                  readOnly
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-100"
                />
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-semibold text-[#2E5430] mb-2">Direcciones</h2>
              {user.direccion?.length ? (
                <ul className="space-y-3">
                  {user.direccion.map((dir: any, i: number) => (
                    <li key={i} className="border border-gray-300 rounded-md p-3 bg-gray-50">
                      <p className="font-medium text-gray-800">{dir.calle}</p>
                      <p className="text-sm text-gray-600">
                        {dir.comuna}, {dir.region}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No tienes direcciones registradas.</p>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => setEditMode(true)}
                className="bg-[#2E5430] text-white py-2 rounded-md font-medium hover:bg-[#234624]"
              >
                Editar Perfil
              </button>

              <button
                onClick={() => router.push("/change-password")}
                className="border border-[#2E5430] text-[#2E5430] py-2 rounded-md font-medium hover:bg-[#2E5430] hover:text-white transition-colors"
              >
                Cambiar Contraseña
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-center text-[#2E5430] mb-6">
              Editar Perfil
            </h1>

            {/* Campos personales */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-600 text-sm mb-1">Nombre *</label>
                <input
                  type="text"
                  value={user.nombre}
                  onChange={(e) => setUser({ ...user, nombre: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">Apellido *</label>
                <input
                  type="text"
                  value={user.apellido}
                  onChange={(e) => setUser({ ...user, apellido: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-600 text-sm mb-1">Teléfono *</label>
                <input
                  type="text"
                  value={user.telefono || ""}
                  onChange={(e) => setUser({ ...user, telefono: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>
            </div>

            {/* Direcciones */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-[#2E5430]">Direcciones *</h2>
                <button
                  onClick={addDireccion}
                  className="bg-[#2E5430] text-white px-3 py-1 rounded-md hover:bg-[#234624]"
                >
                  <Plus size={18} />
                </button>
              </div>

              {user.direccion?.map((dir: any, index: number) => {
                const regionObj = regiones.find((r) => r.nombre === dir.region);
                const regionId = regionObj?.id;
                if (regionId) fetchComunas(regionId);

                return (
                  <div key={index} className="border border-gray-300 rounded-md p-3 mb-3 relative">
                    <button
                      onClick={() => deleteDireccion(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>

                    <label className="block text-gray-600 text-sm mb-1">Calle *</label>
                    <input
                      type="text"
                      value={dir.calle}
                      onChange={(e) => handleDireccionChange(index, "calle", e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2 mb-2"
                      required
                    />

                    <label className="block text-gray-600 text-sm mb-1">Región *</label>
                    <select
                      value={dir.region}
                      onChange={(e) => {
                        handleDireccionChange(index, "region", e.target.value);
                        handleDireccionChange(index, "comuna", "");
                        const selectedRegion = regiones.find((r) => r.nombre === e.target.value);
                        if (selectedRegion) fetchComunas(selectedRegion.id);
                      }}
                      className="w-full border border-gray-300 rounded-md p-2 mb-2"
                      required
                    >
                      <option value="">Selecciona una región</option>
                      {regiones.map((r) => (
                        <option key={r.id} value={r.nombre}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>

                    <label className="block text-gray-600 text-sm mb-1">Comuna *</label>
                    <select
                      value={dir.comuna}
                      onChange={(e) => handleDireccionChange(index, "comuna", e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    >
                      <option value="">Selecciona una comuna</option>
                      {regionId &&
                        comunasPorRegion[regionId]?.map((c) => (
                          <option key={c.id} value={c.nombre}>
                            {c.nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between gap-3 mt-6">
              <button
                onClick={handleCancel}
                className="border border-[#2E5430] text-[#2E5430] py-2 px-4 rounded-md font-medium hover:bg-[#2E5430] hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#2E5430] text-white py-2 px-4 rounded-md font-medium hover:bg-[#234624] disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

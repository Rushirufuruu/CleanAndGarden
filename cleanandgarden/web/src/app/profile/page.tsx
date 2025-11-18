"use client";
import { useState, useEffect } from "react";
import { Trash2, Plus } from "lucide-react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

interface Direccion {
  id?: number;
  calle: string;
  region: string;
  comuna: string;
  _new?: boolean;
  _delete?: boolean;
}

interface User {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: Direccion[];
  rol?: { codigo: string; nombre: string };
}

interface Region {
  id: number;
  nombre: string;
}

interface Comuna {
  id: number;
  nombre: string;
}

// 🧩 Normaliza estructura del backend
function normalizarUsuario(usuario: any): User {
  return {
    ...usuario,
    direccion: (usuario.direccion || []).map((dir: any) => ({
      id: dir.id || Date.now() + Math.random(), // ID temporal único
      calle: dir.calle || "",
      region: dir.comuna?.region?.nombre || "",
      comuna: dir.comuna?.nombre || "",
    })),
  };
}

export default function PerfilUsuario() {
  const [user, setUser] = useState<User | null>(null);
  const [backupUser, setBackupUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [comunasPorRegion, setComunasPorRegion] = useState<Record<number, Comuna[]>>({});
  const router = useRouter();

  // ✅ Cargar perfil
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
          credentials: "include",
        });
        if (res.status === 401) {
          Swal.fire("Sesión expirada", "Por favor inicia sesión nuevamente", "warning");
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (res.ok && data.user) {
          const usuario = normalizarUsuario(data.user);
          setUser(usuario);
          setBackupUser(JSON.parse(JSON.stringify(usuario)));
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/regiones`);
        const data = await res.json();
        if (res.ok) setRegiones(data);
      } catch (err) {
        console.error("Error al cargar regiones:", err);
      }
    };
    fetchRegiones();
  }, []);

  // ✅ Cargar comunas
  const fetchComunas = async (regionId: number) => {
    if (comunasPorRegion[regionId]) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/regiones/${regionId}/comunas`);
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
    setUser((prev) => {
      if (!prev) return prev;
      const nuevaDireccion: Direccion = {
        id: Date.now() + Math.random(),
        calle: "",
        region: "",
        comuna: "",
        _new: true,
      };
      return {
        ...prev,
        direccion: [...(prev.direccion || []), nuevaDireccion],
      };
    });
  };

  // 🔄 Cambiar valores (forza re-render)
  const handleDireccionChange = (index: number, field: keyof Direccion, value: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev.direccion));
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, direccion: updated };
    });
  };

  // 🗑️ Eliminar dirección (clon profundo)
  const deleteDireccion = (index: number) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev.direccion));
      const dir = updated[index];
      if (dir.id && !dir._new) {
        updated[index] = { ...dir, _delete: true };
      } else {
        updated.splice(index, 1);
      }
      return { ...prev, direccion: updated };
    });
  };

  // ✅ Validar antes de guardar
  const validateForm = () => {
    const nombre = (user?.nombre ?? "").trim();
    const apellido = (user?.apellido ?? "").trim();
    const telefono = (user?.telefono ?? "").trim();

    if (!nombre || !apellido || !telefono) {
      Swal.fire({
        icon: "warning",
        title: "Campos obligatorios",
        text: "Debes completar nombre, apellido y teléfono.",
      });
      return false;
    }

    if (!/^\+569\d{8}$/.test(telefono)) {
      Swal.fire({
        icon: "warning",
        title: "Teléfono inválido",
        text: "Debe tener formato +569XXXXXXXX",
      });
      return false;
    }

    const direccionesActivas = (user?.direccion || []).filter((d) => !d._delete);
    if (direccionesActivas.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Dirección requerida",
        text: "Debes ingresar al menos una dirección antes de guardar.",
      });
      return false;
    }

    for (let i = 0; i < direccionesActivas.length; i++) {
      const dir = direccionesActivas[i];
      if (!dir.calle.trim() || !dir.region.trim() || !dir.comuna.trim()) {
        Swal.fire({
          icon: "warning",
          title: "Campos de dirección incompletos",
          text: `La dirección #${i + 1} está incompleta.`,
        });
        return false;
      }
    }

    return true;
  };

  // 💾 Guardar cambios
  const handleSave = async () => {
  if (!validateForm() || !user) return;
  setSaving(true);
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
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
        text: "Cambios guardados correctamente",
        timer: 2000,
        showConfirmButton: false,
      });

      // 🔥 NUEVO BLOQUE: recargar el perfil desde el backend
      const refresh = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
        credentials: "include",
      });
      const refreshedData = await refresh.json();
      if (refresh.ok && refreshedData.user) {
        const usuarioNormalizado = normalizarUsuario(refreshedData.user);
        setUser(usuarioNormalizado);
        setBackupUser(JSON.parse(JSON.stringify(usuarioNormalizado)));
      }

      setEditMode(false);
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

  const handleCancel = () => {
    if (backupUser) setUser(JSON.parse(JSON.stringify(backupUser)));
    setEditMode(false);
  };

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

  return (
    <div className="min-h-screen bg-[#FAF6EB] flex flex-col items-center py-10">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-2xl">
        {!editMode ? (
          <>
            <h1 className="text-2xl font-bold text-center text-[#2E5430] mb-6">Mi Perfil</h1>
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
                <label className="block text-gray-600 text-sm mb-1">Correo</label>
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
                  {user.direccion.map((dir, i) => (
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
            <h1 className="text-2xl font-bold text-center text-[#2E5430] mb-6">Editar Perfil</h1>

            {/* Campos personales */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-600 text-sm mb-1">Nombre *</label>
                <input
                  type="text"
                  value={user.nombre}
                  onChange={(e) => setUser({ ...user, nombre: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">Apellido *</label>
                <input
                  type="text"
                  value={user.apellido}
                  onChange={(e) => setUser({ ...user, apellido: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-600 text-sm mb-1">Teléfono *</label>
                <input
                  type="text"
                  value={user.telefono || ""}
                  onChange={(e) => setUser({ ...user, telefono: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2"
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

              {user.direccion
                ?.filter((d) => !d._delete)
                .map((dir, index) => {
                  const regionObj = regiones.find((r) => r.nombre === dir.region);
                  const regionId = regionObj?.id;

                  return (
                    <div
                      key={`${dir.id}-${index}`}
                      className="border border-gray-300 rounded-md p-3 mb-3 relative"
                      style={{ overflow: "visible" }}
                    >
                      {/* Botón eliminar reposicionado */}
                      <button
                        onClick={() => deleteDireccion(index)}
                        type="button"
                        className="absolute -top-3 right-1 text-red-500 hover:text-red-700 z-50"
                        style={{
                          backgroundColor: "white",
                          borderRadius: "50%",
                          padding: "3px",
                          boxShadow: "0 0 2px rgba(0,0,0,0.2)",
                        }}
                      >
                        <Trash2 size={18} />
                      </button>

                      <label className="block text-gray-600 text-sm mb-1">Calle *</label>
                      <input
                        type="text"
                        value={dir.calle}
                        onChange={(e) => handleDireccionChange(index, "calle", e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 mb-2"
                      />

                      <label className="block text-gray-600 text-sm mb-1">Región *</label>
                      <select
                        value={dir.region}
                        onChange={(e) => {
                          const regionName = e.target.value;
                          handleDireccionChange(index, "region", regionName);
                          const region = regiones.find((r) => r.nombre === regionName);
                          if (region) fetchComunas(region.id);
                        }}
                        className="w-full border border-gray-300 rounded-md p-2 mb-2"
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
                className="border border-[#2E5430] text-[#2E5430] py-2 px-4 rounded-md hover:bg-[#2E5430] hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#2E5430] text-white py-2 px-4 rounded-md hover:bg-[#234624] disabled:opacity-50"
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

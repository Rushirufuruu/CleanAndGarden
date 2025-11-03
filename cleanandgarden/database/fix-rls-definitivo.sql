-- ===========================================================
-- PERMISOS Y POLÍTICAS DE ACCESO - CLEAN & GARDEN
-- ===========================================================

-- PASO 1: Otorgar permisos explícitos al rol anon y authenticated
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON public.servicio TO anon;
GRANT SELECT ON public.imagen TO anon;
GRANT SELECT ON public.portafolio_item TO anon;
GRANT SELECT ON public.usuario TO anon;

GRANT SELECT, INSERT, UPDATE ON public.servicio TO authenticated;
GRANT SELECT ON public.imagen TO authenticated;
GRANT SELECT ON public.portafolio_item TO authenticated;
GRANT SELECT ON public.usuario TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cita TO authenticated;

-- ===========================================================
-- PASO 2: Activar Row Level Security (RLS)
-- ===========================================================

ALTER TABLE public.servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portafolio_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cita ENABLE ROW LEVEL SECURITY;

-- ===========================================================
-- PASO 3: Limpiar políticas previas
-- ===========================================================

DROP POLICY IF EXISTS "public_read_servicios_activos" ON public.servicio;
DROP POLICY IF EXISTS "public_read_imagenes" ON public.imagen;
DROP POLICY IF EXISTS "public_read_portfolio_publicado" ON public.portafolio_item;
DROP POLICY IF EXISTS "public_read_usuarios" ON public.usuario;

DROP POLICY IF EXISTS "usuario_puede_ver_sus_citas" ON public.cita;
DROP POLICY IF EXISTS "tecnico_puede_ver_sus_citas" ON public.cita;
DROP POLICY IF EXISTS "usuario_puede_crear_sus_citas" ON public.cita;
DROP POLICY IF EXISTS "tecnico_puede_actualizar_estado" ON public.cita;
DROP POLICY IF EXISTS "usuario_puede_cancelar_su_cita" ON public.cita;

-- ===========================================================
-- PASO 4: Crear políticas finales
-- ===========================================================

-- 🌿 SERVICIO
CREATE POLICY "public_read_servicios_activos"
ON public.servicio
FOR SELECT
TO anon, authenticated
USING (activo = true);

-- 🖼️ IMAGEN
CREATE POLICY "public_read_imagenes"
ON public.imagen
FOR SELECT
TO anon, authenticated
USING (true);

-- 🪴 PORTAFOLIO
CREATE POLICY "public_read_portfolio_publicado"
ON public.portafolio_item
FOR SELECT
TO anon, authenticated
USING (publicado = true);

-- 👤 USUARIO
CREATE POLICY "public_read_usuarios"
ON public.usuario
FOR SELECT
TO anon, authenticated
USING (true);

-- ===========================================================
-- 🗓️ POLÍTICAS PARA TABLA `cita`
-- ===========================================================

-- 🧍‍♂️ Cliente autenticado puede ver solo sus propias citas
CREATE POLICY "usuario_puede_ver_sus_citas"
ON public.cita
FOR SELECT
TO authenticated
USING (
  cliente_id = (
    SELECT id FROM public.usuario WHERE email = auth.email()
  )
);

-- 🧑‍🔧 Técnico puede ver solo las citas asignadas a él
CREATE POLICY "tecnico_puede_ver_sus_citas"
ON public.cita
FOR SELECT
TO authenticated
USING (
  tecnico_id = (
    SELECT id FROM public.usuario WHERE email = auth.email()
  )
);

-- 🧾 Cliente puede crear (agendar) sus propias citas
CREATE POLICY "usuario_puede_crear_sus_citas"
ON public.cita
FOR INSERT
TO authenticated
WITH CHECK (
  cliente_id = (
    SELECT id FROM public.usuario WHERE email = auth.email()
  )
);

-- 🔁 Técnico puede actualizar el estado de sus propias citas
CREATE POLICY "tecnico_puede_actualizar_estado"
ON public.cita
FOR UPDATE
TO authenticated
USING (
  tecnico_id = (
    SELECT id FROM public.usuario WHERE email = auth.email()
  )
)
WITH CHECK (
  tecnico_id = (
    SELECT id FROM public.usuario WHERE email = auth.email()
  )
);

-- ❌ Cliente puede cancelar solo sus propias citas
CREATE POLICY "usuario_puede_cancelar_su_cita"
ON public.cita
FOR UPDATE
TO authenticated
USING (
  cliente_id = (
    SELECT id FROM public.usuario WHERE email = auth.email()
  )
)
WITH CHECK (
  cliente_id = (
    SELECT id FROM public.usuario WHERE email = auth.email()
  )
);

-- ===========================================================
-- ✅ FIN DEL SCRIPT
-- ===========================================================

-- 🧠 Qué hace:
-- - Usuarios autenticados pueden ver SOLO sus propias citas.
-- - Técnicos pueden ver y actualizar las citas que se les asignan.
-- - Clientes pueden crear o cancelar sus citas.
-- - No se exponen datos de otros usuarios.
-- - Se mantienen las políticas públicas originales de servicio, imagen y usuario.

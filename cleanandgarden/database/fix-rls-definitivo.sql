-- ================================================
-- SOLUCIÓN DEFINITIVA PARA PERMISOS RLS
-- ================================================
-- Este script otorga permisos explícitos al rol anon
-- y recrea las políticas RLS de forma limpia
-- ================================================

-- PASO 1: Otorgar permisos explícitos al rol anon
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.servicio TO anon;
GRANT SELECT ON public.imagen TO anon;
GRANT SELECT ON public.portafolio_item TO anon;
GRANT SELECT ON public.usuario TO anon;

-- PASO 2: Otorgar permisos al rol authenticated también
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.servicio TO authenticated;
GRANT SELECT ON public.imagen TO authenticated;
GRANT SELECT ON public.portafolio_item TO authenticated;
GRANT SELECT ON public.usuario TO authenticated;

-- PASO 3: Verificar que RLS esté activo
ALTER TABLE servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagen ENABLE ROW LEVEL SECURITY;
ALTER TABLE portafolio_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;

-- PASO 4: Recrear políticas (por si hay corrupción)
DROP POLICY IF EXISTS "public_read_servicios_activos" ON servicio;
DROP POLICY IF EXISTS "public_read_imagenes" ON imagen;
DROP POLICY IF EXISTS "public_read_portfolio_publicado" ON portafolio_item;
DROP POLICY IF EXISTS "public_read_usuarios" ON usuario;

-- PASO 5: Crear políticas finales
CREATE POLICY "public_read_servicios_activos"
ON servicio
FOR SELECT
TO anon, authenticated
USING (activo = true);

CREATE POLICY "public_read_imagenes"
ON imagen
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "public_read_portfolio_publicado"
ON portafolio_item
FOR SELECT
TO anon, authenticated
USING (publicado = true);

CREATE POLICY "public_read_usuarios"
ON usuario
FOR SELECT
TO anon, authenticated
USING (true);

-- ================================================
-- VERIFICACIÓN FINAL
-- ================================================
-- Ejecuta esto después para confirmar:
-- 
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE tablename IN ('servicio', 'imagen', 'portafolio_item', 'usuario');
--
-- SELECT tablename, policyname, roles, cmd 
-- FROM pg_policies 
-- WHERE tablename IN ('servicio', 'imagen', 'portafolio_item', 'usuario');
-- ================================================

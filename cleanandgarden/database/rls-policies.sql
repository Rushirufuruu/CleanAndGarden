-- ================================================
-- LIMPIAR TODAS LAS POLÍTICAS EXISTENTES
-- ================================================

-- Eliminar TODAS las políticas duplicadas de servicio
DROP POLICY IF EXISTS "Allow public read on servicio" ON servicio;
DROP POLICY IF EXISTS "select_servicios_activos" ON servicio;
DROP POLICY IF EXISTS "Permitir lectura pública de servicios" ON servicio;
DROP POLICY IF EXISTS "Permitir lectura pública de servicios activos" ON servicio;

-- Eliminar TODAS las políticas duplicadas de imagen
DROP POLICY IF EXISTS "Allow public read on imagen" ON imagen;
DROP POLICY IF EXISTS "Permitir lectura pública de imagenes" ON imagen;
DROP POLICY IF EXISTS "Permitir lectura pública de imágenes" ON imagen;

-- Eliminar políticas de portfolio y usuario
DROP POLICY IF EXISTS "Permitir lectura pública de portfolio publicado" ON portafolio_item;
DROP POLICY IF EXISTS "Permitir lectura limitada de usuarios" ON usuario;

-- ================================================
-- CREAR POLÍTICAS LIMPIAS Y CORRECTAS
-- ================================================

-- Servicio: lectura pública solo de activos
CREATE POLICY "public_read_servicios_activos"
ON servicio
FOR SELECT
TO anon, authenticated
USING (activo = true);

-- Imagen: lectura pública de todas
CREATE POLICY "public_read_imagenes"
ON imagen
FOR SELECT
TO anon, authenticated
USING (true);

-- Portfolio: lectura pública solo de publicados
CREATE POLICY "public_read_portfolio_publicado"
ON portafolio_item
FOR SELECT
TO anon, authenticated
USING (publicado = true);

-- Usuario: lectura pública (opcional)
CREATE POLICY "public_read_usuarios"
ON usuario
FOR SELECT
TO anon, authenticated
USING (true);

-- ================================================
-- POLÍTICAS PARA OPERACIONES DE ESCRITURA (ADMIN)
-- ================================================
-- NOTA: Estas políticas están deshabilitadas porque tu app usa
-- autenticación por backend (JWT), no Supabase Auth.
-- El backend con Prisma tiene acceso completo a la base de datos.
-- Solo las aplicaciones frontend (web/mobile) con ANON_KEY tienen
-- las restricciones de lectura definidas arriba.

-- Si en el futuro implementas Supabase Auth, descomenta y ajusta:

-- CREATE POLICY "Solo backend puede modificar servicios"
-- ON servicio
-- FOR ALL
-- USING (false); -- Bloquear escritura desde cliente

-- CREATE POLICY "Solo backend puede modificar imágenes"
-- ON imagen
-- FOR ALL
-- USING (false); -- Bloquear escritura desde cliente

-- CREATE POLICY "Solo backend puede modificar portfolio"
-- ON portafolio_item
-- FOR ALL
-- USING (false); -- Bloquear escritura desde cliente

-- ================================================
-- NOTAS IMPORTANTES
-- ================================================
-- 1. Si ya existen políticas con estos nombres, elimínalas primero:
--    DROP POLICY "nombre_de_la_politica" ON nombre_tabla;
--
-- 2. Para ver las políticas existentes:
--    SELECT * FROM pg_policies WHERE schemaname = 'public';
--
-- 3. Las políticas de escritura (FOR ALL) requieren que los usuarios
--    estén autenticados con Supabase Auth y tengan el rol correcto.
--
-- 4. Si solo necesitas lectura pública (sin autenticación),
--    las primeras 4 políticas (FOR SELECT) son suficientes.
-- ================================================

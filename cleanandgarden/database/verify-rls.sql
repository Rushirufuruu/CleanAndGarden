-- ================================================
-- VERIFICACIÓN COMPLETA DE RLS
-- ================================================
-- Copia y pega TODO este archivo en Supabase SQL Editor
-- ================================================

-- 1. Ver estado de RLS en las tablas
SELECT 
    schemaname,
    tablename, 
    rowsecurity as "RLS Activo"
FROM pg_tables 
WHERE tablename IN ('servicio', 'imagen', 'portafolio_item', 'usuario')
ORDER BY tablename;

-- 2. Ver todas las políticas actuales
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('servicio', 'imagen', 'portafolio_item', 'usuario')
ORDER BY tablename, policyname;

-- 3. PRUEBA COMO ROL ANON (simula tu app móvil)
-- Esto prueba exactamente lo que hace tu ANON_KEY
BEGIN;
SET ROLE anon;
SET search_path TO public;

-- Intentar leer servicios activos
SELECT 
    'TEST SERVICIOS' as prueba,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE activo = true) as activos
FROM servicio;

-- Intentar leer imágenes
SELECT 
    'TEST IMAGENES' as prueba,
    COUNT(*) as total
FROM imagen;

RESET ROLE;
ROLLBACK;

-- 4. Ver permisos del rol anon
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
AND table_name IN ('servicio', 'imagen', 'portafolio_item', 'usuario');

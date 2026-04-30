-- ============================================================
-- HORARIO — Helpers de seed y desarrollo
-- Migración 005
-- NO ejecutar en producción sin revisar.
-- ============================================================

-- Esta migración solo contiene comentarios y utilidades
-- de conveniencia para el proceso de bootstrap.
-- Los datos reales de demo se encuentran en seed.sql (opcional).

-- INSTRUCCIONES BOOTSTRAP (ejecutar en Supabase SQL Editor):
--
-- 1. Registrarse con el email del superadmin en /login
--    (el trigger handle_new_user crea el perfil con role='employee', is_active=FALSE)
--
-- 2. Ejecutar desde el SQL Editor (con service_role):
--    SELECT bootstrap_superadmin('tu@email.com');
--
-- 3. El usuario ya puede acceder a /superadmin y crear empresas.
--
-- PARA CREAR LA PRIMERA EMPRESA (desde el SQL Editor o /superadmin):
--    INSERT INTO companies (name, slug, timezone, gps_radius_meters)
--    VALUES ('Mi Empresa S.L.', 'mi-empresa', 'Europe/Madrid', 100);
--
-- PARA CREAR EL PRIMER ADMIN DE EMPRESA:
--    1. El superadmin invita al admin desde /superadmin/companies/:id
--    2. El admin se registra con el link de invitación
--    3. El superadmin asigna role='admin' y company_id desde el panel

-- Función de resumen por empresa (solo superadmin).
-- Se usa función en lugar de vista para evitar bypass de RLS:
-- las vistas ejecutan con permisos del propietario, no del invocador.
CREATE OR REPLACE FUNCTION get_company_summary()
RETURNS TABLE (
  id            UUID,
  name          TEXT,
  slug          TEXT,
  is_active     BOOLEAN,
  active_employees   BIGINT,
  entries_last_24h   BIGINT,
  created_at    TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  -- SECURITY INVOKER: ejecuta con los permisos del usuario llamante.
  -- La RLS de companies filtrará a una sola empresa para admin/boss/employee.
  -- Para superadmin (sin company_id) la RLS de companies permite ALL.
  SELECT
    c.id,
    c.name,
    c.slug,
    c.is_active,
    COUNT(DISTINCT e.id) FILTER (WHERE e.is_active)::BIGINT AS active_employees,
    COUNT(DISTINCT te.id) FILTER (WHERE te.occurred_at > NOW() - INTERVAL '24 hours')::BIGINT AS entries_last_24h,
    c.created_at
  FROM companies c
  LEFT JOIN employees e ON e.company_id = c.id
  LEFT JOIN time_entries te ON te.company_id = c.id
  GROUP BY c.id;
$$;

REVOKE ALL ON FUNCTION get_company_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_company_summary() TO authenticated;

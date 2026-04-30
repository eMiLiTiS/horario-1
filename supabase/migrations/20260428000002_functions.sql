-- ============================================================
-- HORARIO — Funciones helper y lógica de negocio
-- Migración 002
-- ============================================================

-- ============================================================
-- HELPER: obtener company_id del usuario actual
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================
-- HELPER: obtener rol del usuario actual
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================
-- HELPER: ¿es superadmin?
-- ============================================================
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================
-- HELPER: ¿es admin o boss de esta empresa?
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin_or_boss_of(company UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin','boss')
      AND company_id = company
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================
-- HELPER: employee_id del usuario actual (si tiene perfil vinculado)
-- ============================================================
CREATE OR REPLACE FUNCTION my_employee_id()
RETURNS UUID AS $$
  SELECT e.id FROM employees e
  WHERE e.profile_id = auth.uid()
  LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================
-- HANDLE NEW USER — crea perfil al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Role is ALWAYS 'employee' on signup regardless of metadata.
  -- Elevation to admin/boss/superadmin is done by privileged actors only.
  INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'employee',
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- VALIDATE TIME ENTRY — máquina de estados del fichaje
-- Devuelve TRUE si la transición es válida, RAISE si no.
-- ============================================================
CREATE OR REPLACE FUNCTION validate_time_entry(
  p_employee_id UUID,
  p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  last_action          TEXT;
  today_start          TIMESTAMPTZ;
  v_caller_employee_id UUID;
  v_caller_company_id  UUID;
  v_target_company_id  UUID;
BEGIN
  -- 1. Whitelist de acciones válidas (falla rápido, sin tocar la BD).
  IF p_action NOT IN ('clock_in', 'break_start', 'break_end', 'clock_out') THEN
    RAISE EXCEPTION 'Acción de fichaje no reconocida: %', p_action
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 2. Ownership: el caller debe ser exactamente el empleado que ficha.
  --    Si p_employee_id no existe en employees, my_employee_id() devuelve
  --    el propio ID del caller (distinto), por lo que también se rechaza aquí.
  v_caller_employee_id := my_employee_id();

  IF v_caller_employee_id IS NULL OR v_caller_employee_id <> p_employee_id THEN
    RAISE EXCEPTION 'Acceso denegado'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 3. Company cross-check (defensa en profundidad).
  --    Si p_employee_id no existe, v_target_company_id queda NULL y la
  --    comparación con IS DISTINCT FROM dispara el mismo rechazo genérico.
  SELECT e.company_id INTO v_target_company_id
  FROM employees e
  WHERE e.id = p_employee_id;

  v_caller_company_id := get_my_company_id();

  IF v_caller_company_id IS DISTINCT FROM v_target_company_id THEN
    RAISE EXCEPTION 'Acceso denegado'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 4. Máquina de estados: obtener última acción del día.
  today_start := DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Madrid')
                   AT TIME ZONE 'Europe/Madrid';

  SELECT action INTO last_action
  FROM time_entries
  WHERE employee_id = p_employee_id
    AND occurred_at >= today_start
  ORDER BY occurred_at DESC
  LIMIT 1;

  -- 5. Transiciones válidas.
  CASE
    WHEN last_action IS NULL        AND p_action = 'clock_in'                    THEN RETURN TRUE;
    WHEN last_action = 'clock_in'   AND p_action IN ('break_start','clock_out')  THEN RETURN TRUE;
    WHEN last_action = 'break_start' AND p_action = 'break_end'                  THEN RETURN TRUE;
    WHEN last_action = 'break_end'  AND p_action IN ('break_start','clock_out')  THEN RETURN TRUE;
    ELSE
      RAISE EXCEPTION 'Transición de fichaje inválida: último=%, nuevo=%',
        COALESCE(last_action,'ninguno'), p_action
        USING ERRCODE = 'check_violation';
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================
-- BOOTSTRAP SUPERADMIN
-- Ejecutar manualmente desde el SQL editor de Supabase
-- con clave service_role ANTES de que el usuario se registre:
--   SELECT bootstrap_superadmin('tu@email.com');
-- ============================================================
CREATE OR REPLACE FUNCTION bootstrap_superadmin(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN
    RETURN 'ERROR: El usuario ' || p_email || ' no existe. Regístrate primero y luego ejecuta esta función.';
  END IF;

  UPDATE profiles
  SET role = 'superadmin',
      is_active = TRUE,
      company_id = NULL
  WHERE id = v_user_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_data)
  VALUES (
    v_user_id,
    'bootstrap.superadmin',
    'profile',
    v_user_id,
    jsonb_build_object('email', p_email, 'timestamp', NOW())
  );

  RETURN 'OK: ' || p_email || ' ahora es superadmin.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

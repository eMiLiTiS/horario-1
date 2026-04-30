-- ============================================================
-- HORARIO — Row Level Security
-- Migración 003
-- Principio: los datos de una empresa JAMÁS son accesibles
-- desde otra empresa. Ninguna política permite DELETE en
-- time_entries ni audit_logs.
-- ============================================================

-- Activar RLS en todas las tablas
ALTER TABLE companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees       ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE POLICY "companies_superadmin_all" ON companies
  FOR ALL USING (is_superadmin());

CREATE POLICY "companies_tenant_select" ON companies
  FOR SELECT USING (
    id = get_my_company_id()
  );

CREATE POLICY "companies_admin_update" ON companies
  FOR UPDATE USING (
    id = get_my_company_id() AND get_my_role() = 'admin'
  );

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "profiles_superadmin_all" ON profiles
  FOR ALL USING (is_superadmin());

-- Admin y boss ven los perfiles de su empresa
CREATE POLICY "profiles_company_select" ON profiles
  FOR SELECT USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('admin','boss')
  );

-- Empleado ve su propio perfil
CREATE POLICY "profiles_own_select" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Empleado actualiza su propio perfil (campos no sensibles via app)
CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- No puede cambiar su propio role ni company_id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND company_id IS NOT DISTINCT FROM (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Admin actualiza perfiles de su empresa (no puede mover profiles a otra empresa)
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'admin'
  )
  WITH CHECK (
    company_id = get_my_company_id()
    AND get_my_role() = 'admin'
  );

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE POLICY "employees_superadmin_all" ON employees
  FOR ALL USING (is_superadmin());

CREATE POLICY "employees_admin_all" ON employees
  FOR ALL USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'admin'
  );

CREATE POLICY "employees_boss_select" ON employees
  FOR SELECT USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'boss'
  );

-- Empleado ve solo su propio registro
CREATE POLICY "employees_own_select" ON employees
  FOR SELECT USING (profile_id = auth.uid());

-- ============================================================
-- SCHEDULES
-- ============================================================
CREATE POLICY "schedules_superadmin_all" ON schedules
  FOR ALL USING (is_superadmin());

CREATE POLICY "schedules_admin_all" ON schedules
  FOR ALL USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'admin'
  );

CREATE POLICY "schedules_boss_select" ON schedules
  FOR SELECT USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'boss'
  );

CREATE POLICY "schedules_employee_select" ON schedules
  FOR SELECT USING (
    employee_id = my_employee_id()
    AND company_id = get_my_company_id()
  );

-- ============================================================
-- SHIFTS
-- ============================================================
CREATE POLICY "shifts_superadmin_all" ON shifts
  FOR ALL USING (is_superadmin());

CREATE POLICY "shifts_admin_all" ON shifts
  FOR ALL USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'admin'
  );

CREATE POLICY "shifts_boss_select" ON shifts
  FOR SELECT USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'boss'
  );

CREATE POLICY "shifts_employee_select" ON shifts
  FOR SELECT USING (
    company_id = get_my_company_id()
    AND schedule_id IN (
      SELECT id FROM schedules WHERE employee_id = my_employee_id()
    )
  );

-- ============================================================
-- TIME_ENTRIES
-- REGLA DE ORO: nadie puede DELETE ni UPDATE en esta tabla.
-- Las correcciones se hacen mediante incidents.
-- ============================================================
CREATE POLICY "time_entries_superadmin_select" ON time_entries
  FOR SELECT USING (is_superadmin());

-- Admin y boss ven todos los fichajes de su empresa
CREATE POLICY "time_entries_admin_boss_select" ON time_entries
  FOR SELECT USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('admin','boss')
  );

-- Admin puede insertar fichajes manuales (method='manual') para correcciones
CREATE POLICY "time_entries_admin_insert" ON time_entries
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id()
    AND get_my_role() = 'admin'
    AND method = 'manual'
  );

-- Empleado ve sus propios fichajes
CREATE POLICY "time_entries_employee_select" ON time_entries
  FOR SELECT USING (employee_id = my_employee_id());

-- Empleado inserta sus propios fichajes
CREATE POLICY "time_entries_employee_insert" ON time_entries
  FOR INSERT WITH CHECK (
    employee_id = my_employee_id()
    AND company_id = get_my_company_id()
    AND method = 'mobile'
  );

-- NO hay políticas UPDATE ni DELETE para nadie.

-- ============================================================
-- INCIDENTS
-- ============================================================
CREATE POLICY "incidents_superadmin_all" ON incidents
  FOR ALL USING (is_superadmin());

CREATE POLICY "incidents_admin_all" ON incidents
  FOR ALL USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'admin'
  );

CREATE POLICY "incidents_boss_select" ON incidents
  FOR SELECT USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'boss'
  );

CREATE POLICY "incidents_employee_select" ON incidents
  FOR SELECT USING (employee_id = my_employee_id());

-- Empleado puede crear solicitudes de incidencia (ausencia, corrección personal)
CREATE POLICY "incidents_employee_insert" ON incidents
  FOR INSERT WITH CHECK (
    employee_id = my_employee_id()
    AND company_id = get_my_company_id()
    AND created_by = auth.uid()
  );

-- ============================================================
-- AUDIT_LOGS
-- Solo lectura. Nadie puede INSERT/UPDATE/DELETE desde cliente.
-- Los inserts los hacen triggers con SECURITY DEFINER.
-- ============================================================
CREATE POLICY "audit_logs_superadmin_select" ON audit_logs
  FOR SELECT USING (is_superadmin());

CREATE POLICY "audit_logs_admin_select" ON audit_logs
  FOR SELECT USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'admin'
  );

-- ============================================================
-- LEAVE_REQUESTS
-- ============================================================
CREATE POLICY "leave_superadmin_all" ON leave_requests
  FOR ALL USING (is_superadmin());

CREATE POLICY "leave_admin_all" ON leave_requests
  FOR ALL USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'admin'
  );

CREATE POLICY "leave_boss_select" ON leave_requests
  FOR SELECT USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'boss'
  );

CREATE POLICY "leave_employee_select" ON leave_requests
  FOR SELECT USING (employee_id = my_employee_id());

CREATE POLICY "leave_employee_insert" ON leave_requests
  FOR INSERT WITH CHECK (
    employee_id = my_employee_id()
    AND company_id = get_my_company_id()
  );

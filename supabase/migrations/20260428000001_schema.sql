-- ============================================================
-- HORARIO — Schema multitenant
-- Migración 001: Tablas principales
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE companies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  tax_id              TEXT,
  address             TEXT,
  phone               TEXT,
  email               TEXT,
  logo_url            TEXT,
  timezone            TEXT NOT NULL DEFAULT 'Europe/Madrid',
  gps_lat             NUMERIC(10,7),
  gps_lng             NUMERIC(10,7),
  gps_radius_meters   INTEGER NOT NULL DEFAULT 100,
  work_day_hours      NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  settings            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFILES (1-a-1 con auth.users)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  role        TEXT NOT NULL DEFAULT 'employee'
              CHECK (role IN ('superadmin','admin','boss','employee')),
  first_name  TEXT NOT NULL DEFAULT '',
  last_name   TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  phone       TEXT,
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_company_id ON profiles(company_id);
CREATE INDEX idx_profiles_role       ON profiles(role);

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  profile_id      UUID UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
  employee_code   TEXT,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  position        TEXT,
  department      TEXT,
  hire_date       DATE NOT NULL,
  contract_type   TEXT CHECK (contract_type IN ('full_time','part_time','temporal')),
  weekly_hours    NUMERIC(4,2) NOT NULL DEFAULT 40.0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, employee_code)
);

CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_employees_profile_id ON employees(profile_id);

-- ============================================================
-- SCHEDULES (horario semanal versionado)
-- ============================================================
CREATE TABLE schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  effective_from  DATE NOT NULL,
  effective_until DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedules_company_id   ON schedules(company_id);
CREATE INDEX idx_schedules_employee_id  ON schedules(employee_id);

-- ============================================================
-- SHIFTS (días del horario)
-- ============================================================
CREATE TABLE shifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id     UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  break_minutes   INTEGER NOT NULL DEFAULT 0,
  is_working_day  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_shifts_schedule_id  ON shifts(schedule_id);
CREATE INDEX idx_shifts_company_id   ON shifts(company_id);

-- ============================================================
-- INCIDENTS (forward declaration — referenciada por time_entries)
-- ============================================================
CREATE TABLE incidents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type                  TEXT NOT NULL
                        CHECK (type IN ('correction','absence','late','extra_hours','other')),
  description           TEXT NOT NULL,
  original_entry_id     UUID,
  corrected_action      TEXT CHECK (corrected_action IN ('clock_in','break_start','break_end','clock_out')),
  corrected_timestamp   TIMESTAMPTZ,
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected')),
  resolved_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at           TIMESTAMPTZ,
  created_by            UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_company_id   ON incidents(company_id);
CREATE INDEX idx_incidents_employee_id  ON incidents(employee_id);
CREATE INDEX idx_incidents_status       ON incidents(status);

-- ============================================================
-- TIME_ENTRIES (fichajes — append-only, nunca borrar)
-- ============================================================
CREATE TABLE time_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  action          TEXT NOT NULL
                  CHECK (action IN ('clock_in','break_start','break_end','clock_out')),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  gps_lat         NUMERIC(10,7),
  gps_lng         NUMERIC(10,7),
  gps_accuracy    NUMERIC(8,2),
  gps_valid       BOOLEAN,
  device_info     JSONB,
  ip_address      INET,
  notes           TEXT,
  method          TEXT NOT NULL DEFAULT 'mobile'
                  CHECK (method IN ('mobile','qr','kiosk','manual')),
  is_corrected    BOOLEAN NOT NULL DEFAULT FALSE,
  correction_ref  UUID REFERENCES incidents(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_entries_company_employee  ON time_entries(company_id, employee_id, occurred_at DESC);
CREATE INDEX idx_time_entries_company_date      ON time_entries(company_id, occurred_at DESC);
CREATE INDEX idx_time_entries_employee_date     ON time_entries(employee_id, occurred_at DESC);

-- Ahora añadimos la FK que incidents referencia a time_entries
ALTER TABLE incidents
  ADD CONSTRAINT fk_incidents_original_entry
  FOREIGN KEY (original_entry_id) REFERENCES time_entries(id) ON DELETE SET NULL;

-- ============================================================
-- AUDIT_LOGS (trazabilidad completa — append-only)
-- ============================================================
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,
  actor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  old_data      JSONB,
  new_data      JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_company_id   ON audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity       ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor_id     ON audit_logs(actor_id);

-- ============================================================
-- LEAVE_REQUESTS (preparado — no expuesto en UI MVP)
-- ============================================================
CREATE TABLE leave_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('vacation','sick','personal','other')),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected')),
  notes         TEXT,
  approved_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_requests_company_id   ON leave_requests(company_id);
CREATE INDEX idx_leave_requests_employee_id  ON leave_requests(employee_id);

-- ============================================================
-- updated_at auto-update trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

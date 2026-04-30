DO $$
DECLARE
  v_user_id     UUID := '59b5ab20-e800-46c6-a227-a767d52f91a0';
  v_company_id  UUID;
  v_employee_id UUID;
  v_schedule_id UUID;
BEGIN

  -- EMPRESA
  INSERT INTO companies (
    name, slug, tax_id, address, timezone,
    gps_lat, gps_lng, gps_radius_meters,
    work_day_hours, is_active
  ) VALUES (
    'Empresa Demo S.L.',
    'empresa-demo',
    'B12345678',
    'Gran Vía 1, 28013 Madrid',
    'Europe/Madrid',
    NULL,
    NULL,
    200,
    8.0,
    TRUE
  )
  RETURNING id INTO v_company_id;

  -- PERFIL
  UPDATE profiles
  SET
    company_id = v_company_id,
    is_active  = TRUE,
    first_name = 'Juan',
    last_name  = 'García'
  WHERE id = v_user_id;

  -- EMPLEADO
  INSERT INTO employees (
    company_id, profile_id,
    first_name, last_name, email,
    position, department,
    hire_date, contract_type, weekly_hours,
    is_active
  )
  SELECT
    v_company_id,
    v_user_id,
    p.first_name,
    p.last_name,
    p.email,
    'Técnico',
    'Tecnología',
    CURRENT_DATE,
    'full_time',
    40.0,
    TRUE
  FROM profiles p
  WHERE p.id = v_user_id
  RETURNING id INTO v_employee_id;

  -- HORARIO
  INSERT INTO schedules (
    company_id, employee_id, name,
    effective_from, effective_until, is_active
  ) VALUES (
    v_company_id, v_employee_id,
    'Horario Estándar',
    CURRENT_DATE, NULL, TRUE
  )
  RETURNING id INTO v_schedule_id;

  INSERT INTO shifts
    (schedule_id, company_id, day_of_week, start_time, end_time, break_minutes, is_working_day)
  VALUES
    (v_schedule_id, v_company_id, 0, '09:00', '18:00', 60, TRUE),
    (v_schedule_id, v_company_id, 1, '09:00', '18:00', 60, TRUE),
    (v_schedule_id, v_company_id, 2, '09:00', '18:00', 60, TRUE),
    (v_schedule_id, v_company_id, 3, '09:00', '18:00', 60, TRUE),
    (v_schedule_id, v_company_id, 4, '09:00', '18:00', 60, TRUE);

END;
$$;
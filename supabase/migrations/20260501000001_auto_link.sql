-- ============================================================
-- HORARIO — Auto-vinculación employee ↔ profile en signup
-- Migración 20260501000001
--
-- Reemplaza handle_new_user() para que, al registrarse un
-- usuario, si ya existe un registro en employees con el mismo
-- email (creado por el admin), se vincule automáticamente
-- y se active el profile.
--
-- El trigger on_auth_user_created ya existe (migración 002).
-- Solo se reemplaza la función.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_emp employees%ROWTYPE;
BEGIN
  -- 1. Insertar perfil base (siempre rol employee, siempre inactivo)
  INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'employee',
    FALSE
  );

  -- 2. Buscar employee pre-creado con mismo email sin cuenta vinculada
  SELECT * INTO v_emp
  FROM employees
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(COALESCE(NEW.email, '')))
    AND profile_id IS NULL
  LIMIT 1;

  -- 3. Si hay coincidencia: vincular y activar automáticamente
  IF FOUND THEN
    -- Vincular profile al employee
    UPDATE employees
      SET profile_id = NEW.id
    WHERE id = v_emp.id;

    -- Activar perfil y asignar empresa del employee
    -- Usar nombre del employee si el usuario no proporcionó uno en signup
    UPDATE profiles
      SET
        company_id = v_emp.company_id,
        is_active  = TRUE,
        first_name = CASE
          WHEN TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')) = ''
          THEN v_emp.first_name
          ELSE COALESCE(NEW.raw_user_meta_data->>'first_name', v_emp.first_name)
        END,
        last_name = CASE
          WHEN TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', '')) = ''
          THEN v_emp.last_name
          ELSE COALESCE(NEW.raw_user_meta_data->>'last_name', v_emp.last_name)
        END
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

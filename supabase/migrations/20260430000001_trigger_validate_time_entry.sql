-- ============================================================
-- HORARIO — Trigger server-side para state machine de fichaje
-- Migración 006
--
-- Gap cerrado: validate_time_entry() existía pero solo se
-- ejecutaba desde la UI. Cualquier cliente con el anon key
-- podía insertar transiciones inválidas directamente.
-- Este trigger convierte la validación en una restricción
-- de base de datos para todos los fichajes de auto-servicio.
-- ============================================================

-- ============================================================
-- FUNCIÓN WRAPPER DEL TRIGGER
--
-- Por qué SECURITY DEFINER:
--   validate_time_entry() hace SELECT en time_entries y employees
--   con sus propias políticas RLS. Como es SECURITY DEFINER,
--   puede leer sin restricción; el wrapper hereda ese requisito
--   para que las llamadas encadenadas funcionen correctamente.
--
-- Por qué SET search_path:
--   Hardening estándar para SECURITY DEFINER — evita que un
--   schema malicioso en el search_path suplante funciones públicas.
--
-- Por qué el guard method = 'mobile':
--   validate_time_entry() incluye un ownership check:
--     my_employee_id() (auth.uid()-based) debe coincidir con p_employee_id.
--   Para inserts de auto-servicio (mobile) esto siempre se cumple
--   porque la RLS ya lo garantiza.
--   Para correcciones manuales de admin (method = 'manual'), el admin
--   inserta en nombre de otro empleado: my_employee_id() != NEW.employee_id
--   → el ownership check fallaría → las correcciones admin quedarían rotas.
--   La validación de correcciones admin la cubre la RLS de time_entries
--   (company_id = get_my_company_id() AND get_my_role() = 'admin').
--   Cuando se implementen QR y kiosk se revisará este guard.
-- ============================================================
CREATE OR REPLACE FUNCTION trg_validate_time_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.method = 'mobile' THEN
    PERFORM validate_time_entry(NEW.employee_id, NEW.action);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================
-- TRIGGER BEFORE INSERT
--
-- DROP IF EXISTS: idempotente — permite re-ejecutar la migración
-- sin error si el trigger ya fue creado.
-- BEFORE (no AFTER): al usar BEFORE podemos abortar el INSERT
-- lanzando una excepción antes de que el dato llegue al heap.
-- FOR EACH ROW: necesario para acceder a NEW.employee_id / NEW.action.
-- ============================================================
DROP TRIGGER IF EXISTS trg_time_entries_validate ON time_entries;

CREATE TRIGGER trg_time_entries_validate
  BEFORE INSERT ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION trg_validate_time_entry();

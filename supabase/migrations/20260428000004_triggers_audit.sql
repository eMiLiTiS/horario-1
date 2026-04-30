-- ============================================================
-- HORARIO — Triggers de auditoría
-- Migración 004
-- Registra cambios en tablas sensibles a audit_logs.
-- ============================================================

-- Función genérica de auditoría
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Extraer company_id del registro (si existe)
  BEGIN
    v_company_id := CASE
      WHEN TG_OP = 'DELETE' THEN (row_to_json(OLD) ->> 'company_id')::UUID
      ELSE (row_to_json(NEW) ->> 'company_id')::UUID
    END;
  EXCEPTION WHEN OTHERS THEN
    v_company_id := NULL;
  END;

  INSERT INTO audit_logs (
    company_id, actor_id, action, entity_type, entity_id,
    old_data, new_data
  )
  VALUES (
    v_company_id,
    auth.uid(),
    LOWER(TG_OP) || '.' || LOWER(TG_TABLE_NAME),
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN (row_to_json(OLD) ->> 'id')::UUID
      ELSE (row_to_json(NEW) ->> 'id')::UUID
    END,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::JSONB ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::JSONB ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger en employees
CREATE TRIGGER audit_employees
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Trigger en companies
CREATE TRIGGER audit_companies
  AFTER UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Trigger en schedules
CREATE TRIGGER audit_schedules
  AFTER INSERT OR UPDATE OR DELETE ON schedules
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================
-- Trigger para marcar time_entry como corregida al aprobar incidencia
-- ============================================================
CREATE OR REPLACE FUNCTION on_incident_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved'
     AND OLD.status != 'approved'
     AND NEW.original_entry_id IS NOT NULL
  THEN
    UPDATE time_entries
    SET is_corrected = TRUE,
        correction_ref = NEW.id
    WHERE id = NEW.original_entry_id;

    -- Auditar la corrección
    INSERT INTO audit_logs (
      company_id, actor_id, action, entity_type, entity_id,
      old_data, new_data
    )
    SELECT
      NEW.company_id,
      auth.uid(),
      'incident.approve',
      'time_entry',
      NEW.original_entry_id,
      jsonb_build_object('is_corrected', FALSE),
      jsonb_build_object(
        'is_corrected', TRUE,
        'correction_ref', NEW.id,
        'incident_description', NEW.description,
        'corrected_timestamp', NEW.corrected_timestamp
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_incident_status_change
  AFTER UPDATE OF status ON incidents
  FOR EACH ROW EXECUTE FUNCTION on_incident_approved();

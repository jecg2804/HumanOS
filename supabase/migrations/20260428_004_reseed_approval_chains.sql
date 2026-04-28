-- Module 1 — Task 14: Re-seed approval_chain con roles semánticos por tipo + ACT_DATOS requires_approval=true.
-- Aplicado via MCP el 2026-04-28; smoke verifica los 5 P1.

UPDATE humanos.request_types SET approval_chain = ARRAY['supervisor_directo','hr_oficial','hr_gerente'], requires_approval=true WHERE code='VACACIONES';
UPDATE humanos.request_types SET approval_chain = ARRAY['supervisor_directo','hr_gerente','presidencia'], requires_approval=true WHERE code='ACCION_PERSONAL';
UPDATE humanos.request_types SET approval_chain = ARRAY['supervisor_directo','hr_planilla','hr_gerente'], requires_approval=true WHERE code='PRESTAMO';
UPDATE humanos.request_types SET approval_chain = ARRAY['hr_oficial','hr_gerente'], requires_approval=true WHERE code='ACTUALIZACION_DATOS';
UPDATE humanos.request_types SET approval_chain = ARRAY['hr_planilla','hr_gerente'], requires_approval=true WHERE code='RECLAMO_PAGO';

-- P2 placeholders (chains preliminares; no funcionales para MVP).
UPDATE humanos.request_types SET approval_chain = ARRAY['supervisor_directo','hr_oficial'] WHERE code='PERMISO';
UPDATE humanos.request_types SET approval_chain = ARRAY['hr_oficial'] WHERE code='CONSTANCIA_TRABAJO';
UPDATE humanos.request_types SET approval_chain = ARRAY['hr_oficial'] WHERE code='REFERENCIA_LABORAL';
UPDATE humanos.request_types SET approval_chain = ARRAY['hr_oficial'] WHERE code='ENTREVISTA_SALIDA';
UPDATE humanos.request_types SET approval_chain = ARRAY['supervisor_directo','hr_oficial'] WHERE code='CAPACITACION';
UPDATE humanos.request_types SET approval_chain = ARRAY['supervisor_directo','hr_gerente','presidencia'] WHERE code='LIQUIDACION';
UPDATE humanos.request_types SET approval_chain = ARRAY['supervisor_directo','hr_planilla'] WHERE code='HORAS_EXTRAS';

DO $$
DECLARE r RECORD;
BEGIN
  RAISE NOTICE 'reseed verify:';
  FOR r IN SELECT code, approval_chain, requires_approval FROM humanos.request_types
           WHERE code IN ('VACACIONES','ACCION_PERSONAL','PRESTAMO','ACTUALIZACION_DATOS','RECLAMO_PAGO')
           ORDER BY code LOOP
    RAISE NOTICE '  %: chain=%, required=%', r.code, r.approval_chain, r.requires_approval;
  END LOOP;
END $$;

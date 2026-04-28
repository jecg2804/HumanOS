-- Module 1 — Task 10: Plan B del spec §4.1.1 — asignación por departamento.
-- Aplicado via Supabase MCP el 2026-04-28 en 2 pasos:
--   1) Mapeo principal por dept (KOSM01/VAL130/AVE629/RIO806/EIS772 + CUC166/EIS809→EIS772).
--   2) Fix: Denise Marciaga (Construcción) está Inactivo, así que Construcción → Franklin Marciaga (Ing, Activo)
--      per nota de James: "Si no es claro, reportan a Franklin Marciaga (Director de Ingeniería y Const.)".
--
-- Resultado: 35/52 activos con supervisor_id. Cumplimiento/Seguridad/Presupuesto/Movilizaciones/Admin general
-- + top-tier (EIS772) quedan NULL → fallback A en humanos.resolve_approver los cubre (skip step + RAISE NOTICE).

-- Paso 1: mapeo principal
WITH mgr AS (
  SELECT
    (SELECT id FROM humanos.people WHERE code='KOSM01') AS kosm01,
    (SELECT id FROM humanos.people WHERE code='VAL130') AS val130,
    (SELECT id FROM humanos.people WHERE code='AVE629') AS ave629,
    (SELECT id FROM humanos.people WHERE code='RIO806') AS rio806,
    (SELECT id FROM humanos.people WHERE code='EIS772') AS eis772
)
UPDATE humanos.people p
SET supervisor_id = CASE
  WHEN p.department = 'Recursos Humanos' AND p.code != 'KOSM01' THEN (SELECT kosm01 FROM mgr)
  WHEN p.department = 'Equipo' AND p.code != 'VAL130' THEN (SELECT val130 FROM mgr)
  WHEN p.department = 'Ingeniería' AND p.code != 'AVE629' AND p.name != 'Franklin Marciaga' THEN (SELECT ave629 FROM mgr)
  WHEN p.department = 'Contabilidad' AND p.code != 'RIO806' THEN (SELECT rio806 FROM mgr)
  WHEN p.code IN ('CUC166','EIS809') THEN (SELECT eis772 FROM mgr)
  WHEN p.code IN ('KOSM01','VAL130','AVE629','RIO806') THEN (SELECT eis772 FROM mgr)
  WHEN p.name = 'Franklin Marciaga' AND p.department = 'Ingeniería' THEN (SELECT eis772 FROM mgr)
  ELSE p.supervisor_id
END
WHERE p.status = 'Activo';

-- Paso 2: Construcción → Franklin (Denise está Inactivo)
WITH mgr AS (
  SELECT (SELECT id FROM humanos.people WHERE name='Franklin Marciaga' AND status='Activo' LIMIT 1) AS franklin
)
UPDATE humanos.people p
SET supervisor_id = (SELECT franklin FROM mgr)
WHERE p.status = 'Activo'
  AND p.department = 'Construcción'
  AND p.supervisor_id IS NULL;

-- Smoke
DO $$
DECLARE
  n_with_sup int; n_total int; n_self int;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE supervisor_id IS NOT NULL),
    COUNT(*)
  INTO n_with_sup, n_total
  FROM humanos.people WHERE status='Activo';

  SELECT COUNT(*) INTO n_self FROM humanos.people WHERE supervisor_id = id;

  RAISE NOTICE 'seed_supervisors: % de % activos con supervisor (% reportan a sí mismos — debe ser 0)',
    n_with_sup, n_total, n_self;

  IF n_self > 0 THEN RAISE EXCEPTION 'self-reporting detected'; END IF;
END $$;

-- 085_core_persons_view
-- F0.2 (ADR-0032 / SP-0b decision #5). core.persons = VIEW sobre hr.people (golden record FISICA,
-- 75 FKs intactos, NO repoint). Contrato people cross-app (MovimientOS/futuras leen la VIEW).
-- security_invoker=true: la VIEW HEREDA la RLS de hr.people (NO la bypassa) - sin esto seria fuga.
-- Expone solo identidad/linkage SEGURA; EXCLUYE PII (cedula/national_id, DOB, genero, estado civil,
-- dependientes, auth_id) - un consumidor que requiera cedula necesita un path controlado aparte (Ley 81 R27).
-- NO se crea core.employees master paralelo (recrearia el dual-master).

CREATE VIEW core.persons WITH (security_invoker = true) AS
SELECT
  p.id,
  p.employee_code,
  p.full_name,
  p.given_names,
  p.surnames,
  p.preferred_name,
  p.status,
  p.photo_url,
  p.source_system
FROM hr.people p
WHERE p.deleted_at IS NULL;

COMMENT ON VIEW core.persons IS 'Contrato people cross-app (ADR-0032 dec #5). VIEW security_invoker sobre hr.people (golden record fisica; sin repoint de 75 FKs). Solo identidad/linkage segura - SIN PII (cedula/DOB/genero/dependientes). Hereda RLS de hr.people. NO es tabla ni segundo master.';

GRANT SELECT ON core.persons TO authenticated;
GRANT SELECT ON core.persons TO service_role;

-- 066_drop_humanos_legacy_schema
-- SEC-LEGACY: DROP del schema demo v1 humanos.* (5 tablas ~49 filas + fn update_updated_at + policies permisivas).
-- Excepcion SANCIONADA a R1: humanos.* es el prototipo MUERTO de HumanOS (NO public.*/payroll.* ajenos),
-- ya consolidado en hr.* (employee_profiles 36 == person_sources humanos_v1 36), 0 FK entrantes / 0 deps,
-- fuera de exposed-schemas (2026-05-29). OK explicito de Jaime 2026-06-02 = la autorizacion que R1 exige
-- para destructivo. Snapshot a backup.* PRIMERO (R22), atomico (si el DROP falla, el snapshot rollbackea).
-- humanos.* SE MANTIENE en la lista de prohibidos (CLAUDE.md/R1/Constitution) para prevenir recreacion.

-- backup schema fue dropeado en 040; recrear + lockear (service-role only, NO expuesto, sin RLS = OK solo locked).
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM PUBLIC;
GRANT USAGE ON SCHEMA backup TO service_role;
COMMENT ON SCHEMA backup IS 'Snapshots pre-destructivos (R22). Locked a service-role/postgres; NO expuesto via PostgREST; sin RLS por diseno (acceso solo service-role/owner). Ver CHANGELOG W3 SEC-LEGACY.';

CREATE TABLE backup.humanos_employee_profiles_20260602 AS SELECT * FROM humanos.employee_profiles;
CREATE TABLE backup.humanos_request_types_20260602     AS SELECT * FROM humanos.request_types;
CREATE TABLE backup.humanos_sequences_20260602         AS SELECT * FROM humanos.sequences;
CREATE TABLE backup.humanos_request_approvals_20260602 AS SELECT * FROM humanos.request_approvals;
CREATE TABLE backup.humanos_requests_20260602          AS SELECT * FROM humanos.requests;

DROP SCHEMA humanos CASCADE;

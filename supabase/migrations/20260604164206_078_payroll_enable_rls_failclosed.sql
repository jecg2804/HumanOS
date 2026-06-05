-- 078_payroll_enable_rls_failclosed
-- Fail-closed RLS hardening on payroll.* (now ours; only public.* prohibited - ADR-0011 update + ADR-0028).
-- payroll.* was just added to PostgREST Exposed Schemas (2026-06-04). To avoid exposing rows once
-- grants are added for HumanOS, enable RLS NOW: deny-all to anon/authenticated; service_role bypasses RLS.
-- Policies + grants are DEFERRED to the planilla grill/spec (ADR-0028, backlog PAYROLL-RLS).
-- COMMENT ON TABLE per R3; column comments + policies land with the planilla build.

ALTER TABLE payroll.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.project_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.person_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.stg_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.stg_project_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.stg_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.stg_cost_centers ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE payroll.projects IS 'Catalogo maestro de proyectos ICONSA (base_project_code ej. 22-208). Master data consumido por HumanOS para planilla (ADR-0028). Origen: PayDay/ProjectSight via ETL. RLS fail-closed; policies en el grill de planilla.';
COMMENT ON TABLE payroll.project_extras IS 'Extras (sub-proyectos/entidades) por proyecto. Nivel intermedio de la jerarquia de costo de mano de obra (proyecto->extra->fase).';
COMMENT ON TABLE payroll.phases IS 'Fases / cost codes (CSI MasterFormat, ej. 013100) por extra. = Project Phase de la planilla (ADR-0028).';
COMMENT ON TABLE payroll.cost_centers IS 'Centros de costo por extra.';
COMMENT ON TABLE payroll.person_project_assignments IS 'Puente persona (hr.people) <-> proyecto/extra/fase con horas y allocation. Disenado por el ETL, hoy vacio. Modelo de asignacion de cuadrilla a definir en el grill de planilla (ADR-0028).';
COMMENT ON TABLE payroll.stg_projects IS 'Staging ETL: import crudo de proyectos desde PayDay/ProjectSight. Scratch, no para lectura de la app.';
COMMENT ON TABLE payroll.stg_project_entities IS 'Staging ETL: import crudo de entidades/extras. Scratch.';
COMMENT ON TABLE payroll.stg_phases IS 'Staging ETL: import crudo de fases/cost codes. Scratch.';
COMMENT ON TABLE payroll.stg_cost_centers IS 'Staging ETL: import crudo de centros de costo. Scratch.';

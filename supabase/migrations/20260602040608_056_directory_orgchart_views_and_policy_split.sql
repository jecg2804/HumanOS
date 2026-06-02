-- 056_directory_orgchart_views_and_policy_split
-- FOUNDATION-NOW: read-projection views (F8/F34) + fix multiple_permissive_policies (8 tablas).

-- (A) Vista directorio (F8). security_invoker -> respeta RLS del que consulta (decision #2).
CREATE OR REPLACE VIEW hr.v_directory WITH (security_invoker = true) AS
SELECT
  p.id AS person_id, p.employee_code, p.full_name, p.preferred_name, p.photo_url,
  e.id AS employment_id,
  COALESCE(pos.title, e.position_text)   AS position,
  COALESCE(ou.name, e.department_text)   AS department,
  COALESCE(loc.name, e.office_text)      AS office,
  e.supervisor_id, sup.full_name AS supervisor_name, e.hire_date
FROM hr.people p
JOIN hr.employments e ON e.person_id = p.id AND e.is_current AND e.deleted_at IS NULL
LEFT JOIN hr.positions pos ON pos.id = e.position_id
LEFT JOIN hr.org_units  ou ON ou.id  = e.department_id
LEFT JOIN hr.locations loc ON loc.id = e.office_id
LEFT JOIN hr.people    sup ON sup.id = e.supervisor_id AND sup.deleted_at IS NULL
WHERE p.deleted_at IS NULL AND e.termination_date IS NULL;
COMMENT ON VIEW hr.v_directory IS 'Directorio (F8): persona + employment actual + cargo/depto/oficina + supervisor, solo activos. security_invoker (respeta RLS del que consulta).';

-- (B) Vista organigrama (F34). Recursiva supervisor->reports con guard de ciclos. security_invoker.
CREATE OR REPLACE VIEW hr.v_org_chart WITH (security_invoker = true) AS
WITH RECURSIVE chart AS (
  SELECT e.person_id, e.supervisor_id, 0 AS depth, ARRAY[e.person_id] AS path
  FROM hr.employments e
  WHERE e.is_current AND e.deleted_at IS NULL AND e.supervisor_id IS NULL
  UNION ALL
  SELECT e.person_id, e.supervisor_id, c.depth + 1, c.path || e.person_id
  FROM hr.employments e
  JOIN chart c ON e.supervisor_id = c.person_id
  WHERE e.is_current AND e.deleted_at IS NULL AND NOT (e.person_id = ANY(c.path))
)
SELECT person_id, supervisor_id, depth FROM chart;
COMMENT ON VIEW hr.v_org_chart IS 'Organigrama / Mi Equipo (F34): jerarquia recursiva supervisor->reports + depth, guard de ciclos. security_invoker. Completitud depende de data-hygiene de supervisor_id (raiz = supervisor_id IS NULL).';

-- (C) Fix multiple_permissive_policies (8 tablas): split FOR ALL -> por-accion.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('hr','leave_assignments','leave_assignments_write_admin'),
    ('hr','leave_policies','leave_policies_write_admin'),
    ('hr','locations','locations_modify'),
    ('hr','org_units','org_units_modify'),
    ('hr','positions','positions_modify'),
    ('requests','types','types_modify')
  ) AS v(sch,tbl,pol) LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.pol, r.sch, r.tbl);
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin())', r.tbl||'_ins', r.sch, r.tbl);
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin())', r.tbl||'_upd', r.sch, r.tbl);
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR DELETE TO authenticated USING (hr.is_hr_admin())', r.tbl||'_del', r.sch, r.tbl);
  END LOOP;
END $$;

DROP POLICY approvals_modify ON requests.approvals;
CREATE POLICY approvals_ins ON requests.approvals FOR INSERT TO authenticated
  WITH CHECK (approver_id = hr.current_person_id() OR delegated_to_id = hr.current_person_id() OR hr.is_hr_admin());
CREATE POLICY approvals_upd ON requests.approvals FOR UPDATE TO authenticated
  USING (approver_id = hr.current_person_id() OR delegated_to_id = hr.current_person_id() OR hr.is_hr_admin())
  WITH CHECK (approver_id = hr.current_person_id() OR delegated_to_id = hr.current_person_id() OR hr.is_hr_admin());
CREATE POLICY approvals_del ON requests.approvals FOR DELETE TO authenticated
  USING (approver_id = hr.current_person_id() OR delegated_to_id = hr.current_person_id() OR hr.is_hr_admin());

DROP POLICY revisions_modify ON requests.revisions;
CREATE POLICY revisions_ins ON requests.revisions FOR INSERT TO authenticated
  WITH CHECK (revised_by = hr.current_person_id() OR responded_by = hr.current_person_id() OR hr.is_hr_admin());
CREATE POLICY revisions_upd ON requests.revisions FOR UPDATE TO authenticated
  USING (revised_by = hr.current_person_id() OR responded_by = hr.current_person_id() OR hr.is_hr_admin())
  WITH CHECK (revised_by = hr.current_person_id() OR responded_by = hr.current_person_id() OR hr.is_hr_admin());
CREATE POLICY revisions_del ON requests.revisions FOR DELETE TO authenticated
  USING (revised_by = hr.current_person_id() OR responded_by = hr.current_person_id() OR hr.is_hr_admin());

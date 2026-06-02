-- 063_add_given_surnames_to_people
-- W2 DATA-HYGIENE (forma): split estructural de full_name. Valores poblados por revision asistida de HR (no auto-split).
-- full_name sigue siendo el display SoR. Aditiva, reversible, no muta data. Ver docs/work/2026-06-02-w2-data-hygiene-plan.md.
ALTER TABLE hr.people
  ADD COLUMN given_names text,
  ADD COLUMN surnames   text;

COMMENT ON COLUMN hr.people.given_names IS 'Nombre(s) de pila separados de full_name. Convencion Panama: 1-2 nombres. Poblado por revision asistida de HR (NO auto-split); full_name sigue siendo el display SoR. NULL hasta revisar (marcar needs_review=true). W2 063.';
COMMENT ON COLUMN hr.people.surnames IS 'Apellido(s) separados de full_name. Convencion Panama: tipicamente 2 (paterno + materno); puede incluir particulas (de, del, de la). Poblado por revision asistida de HR; NULL hasta revisar. W2 063.';

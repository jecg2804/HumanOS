-- 064_national_id_unique_index
-- W2 DATA-HYGIENE (forma): UNIQUE defensivo sobre national_id (cedula/pasaporte = identidad legal unica por persona).
-- Normaliza case+espacios; parcial (permite multiples NULL: 317 sin cedula hoy). 0 duplicados -> creacion segura.
-- Soporta SIGNUP-datamodel (Group 3). CHECK de formato DGI diferido (soft-flag needs_review) hasta validar variantes con Samantha.
-- Ver docs/work/2026-06-02-w2-data-hygiene-plan.md.
CREATE UNIQUE INDEX people_national_id_unique
  ON hr.people (upper(btrim(national_id)))
  WHERE national_id IS NOT NULL AND btrim(national_id) <> '';

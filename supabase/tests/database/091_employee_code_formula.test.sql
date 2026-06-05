-- 091_employee_code_formula.test.sql
-- pgTAP coverage for SIGNUP-formula (migracion 091): hr.generate_employee_code(apellido, cedula).
-- ADR-0036 / PO-06: employee_code = 3 letras apellido paterno (sin acentos, UPPER) + 3 ultimos digitos
-- cedula (CUCALON + 8-930-2166 -> CUC166). La funcion lee hr.people para resolver colisiones contra
-- upper(employee_code) y NO escribe hr.people (generacion y persistencia separadas).
--
-- HOW TO RUN: `supabase test db` (pgTAP via Supabase CLI; carga la extension pgtap y corre cada
--   *.test.sql bajo supabase/tests/database/ dentro de una transaccion que hace rollback).
-- NOT YET WIRED into the vitest / `npm run verify` gate -- pgTAP corre aparte por ahora (igual que
--   089/090); TF-FOUNDATION lo cableara en CI. Hasta entonces, correr on demand pre-merge.
--
-- Self-contained: siembra sus propias filas hr.people, asierta, y hace rollback. Todas las referencias
-- van schema-qualified (la funcion bajo prueba es SECURITY DEFINER + search_path='').

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT extensions.plan(11);

-- ---------------------------------------------------------------------------
-- Fixtures: ids deterministas para que el bump de colision sea predecible.
--   Persona G: employee_code 'CUC166' (case exacto) -> forzar bump a CUC16A.
--   Persona H: employee_code 'cuc166' (lowercase)    -> probar el path upper() del indice CI.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- (1) Caso limpio: sin colision, devuelve la base PO-06.
-- ===========================================================================
SELECT extensions.is(
  hr.generate_employee_code('CUCALON', '8-930-2166'),
  'CUC166',
  'caso limpio: CUCALON + 8-930-2166 -> CUC166 (PO-06)'
);

-- strip de acentos (apellido panameno) + ultimos 3 digitos.
SELECT extensions.is(
  hr.generate_employee_code('Núñez', '08-888-1234'),
  'NUN234',
  'strip de acentos: Nunez + 08-888-1234 -> NUN234'
);

-- letras de pasaporte/guiones en la cedula se descartan; toma los ultimos 3 digitos.
SELECT extensions.is(
  hr.generate_employee_code('Vásquez', 'PE-9-55-8842'),
  'VAS842',
  'cedula con letras/guiones: Vasquez + PE-9-55-8842 -> VAS842'
);

-- ===========================================================================
-- (2) RAISE: precondiciones de longitud (ERRCODE 22023).
-- ===========================================================================
SELECT extensions.throws_ok(
  $$ SELECT hr.generate_employee_code('Ng', '8-930-2166') $$,
  '22023',
  NULL,
  'apellido < 3 letras utiles -> RAISE (22023)'
);

SELECT extensions.throws_ok(
  $$ SELECT hr.generate_employee_code('CUCALON', '8-9') $$,
  '22023',
  NULL,
  'cedula < 3 digitos -> RAISE (22023)'
);

-- ===========================================================================
-- (3) Bump de colision case-exacto: seed 'CUC166' -> esperar 'CUC16A'.
-- ===========================================================================
INSERT INTO hr.people (id, employee_code, full_name, status, created_from)
VALUES ('99000000-0000-0000-0000-000000000001', 'CUC166', 'Colision G', 'Activo', 'manual');

SELECT extensions.is(
  hr.generate_employee_code('CUCALON', '166'),
  'CUC16A',
  'bump de colision: con CUC166 ocupado, devuelve el primer slot libre CUC16A (A3)'
);

-- el bump NO escribe hr.people: sigue habiendo exactamente una fila con code que empieza por CUC16.
SELECT extensions.is(
  (SELECT count(*)::int FROM hr.people WHERE upper(employee_code) LIKE 'CUC16%'),
  1,
  'la funcion NO escribe hr.people (sigue 1 fila CUC16*; el caller persiste)'
);

-- ===========================================================================
-- (4) Bump encadenado: con CUC166 y CUC16A ocupados -> esperar CUC16B.
-- ===========================================================================
INSERT INTO hr.people (id, employee_code, full_name, status, created_from)
VALUES ('99000000-0000-0000-0000-000000000002', 'CUC16A', 'Colision G2', 'Activo', 'manual');

SELECT extensions.is(
  hr.generate_employee_code('CUCALON', '166'),
  'CUC16B',
  'bump encadenado: CUC166 + CUC16A ocupados -> CUC16B'
);

-- ===========================================================================
-- (5) CI-collision: seed lowercase 'cuc999' debe forzar bump para base CUC999
--     (prueba el path upper(employee_code) del indice people_code_ci_unique).
-- ===========================================================================
INSERT INTO hr.people (id, employee_code, full_name, status, created_from)
VALUES ('99000000-0000-0000-0000-000000000003', 'cuc999', 'Colision H lower', 'Activo', 'manual');

SELECT extensions.is(
  hr.generate_employee_code('CUCALON', '999'),
  'CUC99A',
  'CI-collision: cuc999 (lowercase) ocupa CUC999 bajo upper() -> bump a CUC99A'
);

-- ===========================================================================
-- (6) Sin colision para una base distinta: codigo limpio aunque haya otros codes sembrados.
-- ===========================================================================
SELECT extensions.is(
  hr.generate_employee_code('Pérez', '777'),
  'PER777',
  'base sin colision: Perez + 777 -> PER777 pese a los seeds CUC*'
);

-- la funcion es de solo lectura sobre hr.people: ninguno de los asserts anteriores creo filas extra
-- mas alla de los 3 seeds explicitos.
SELECT extensions.is(
  (SELECT count(*)::int FROM hr.people WHERE id::text LIKE '99000000-%'),
  3,
  'solo lectura: exactamente los 3 seeds explicitos existen (la funcion nunca inserto)'
);

SELECT * FROM extensions.finish();

ROLLBACK;

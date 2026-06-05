-- 091_employee_code_formula
-- SIGNUP-formula (Group 3, ADR-0036 / PO-06). ADDITIVE build slice: NO toca auth.users, NO toca
-- datos de hr.people (solo agrega un indice + una funcion). Unit/build-verificable, sin E2E.
--
-- Que agrega:
--   (1) hr.people_code_ci_unique -- UNIQUE parcial sobre upper(employee_code) WHERE employee_code IS NOT NULL.
--       Garantia case-insensitive que la resolucion de login y los codigos generados necesitaran.
--       Coexiste con people_code_key (UNIQUE case-sensitive crudo; NO se dropea => no destructivo).
--       Verificado live 2026-06-05: 0 case-collisions bajo upper() => seguro de crear hoy.
--   (2) hr.generate_employee_code(p_apellido_paterno text, p_national_id text) RETURNS text
--       -- genera employee_code = 3 letras apellido paterno (sin acentos, UPPER) + 3 ultimos digitos cedula
--       (CUCALON + 8-930-2166 -> CUC166). SECURITY DEFINER search_path='' (lee hr.people para resolver
--       colisiones). service_role-only (mismo patron least-privilege que mig 077 + create_employee_with_invite
--       mig 071). NO escribe hr.people: generacion y persistencia separadas (el caller persiste).
--
-- Reconciliacion con codigos Spectrum (ADR-0036, prueba empirica: Spectrum code == formula PO-06 al 90%):
--   El link de identidad DURABLE es el crosswalk hr.person_sources, NO la columna employee_code.
--   sync_spectrum_people (mig 089) resuelve crosswalk-first y luego employee_code case-insensitive.
--   Las personas spectrum-sourced conservan su codigo Spectrum; la formula genera SOLO para net-new
--   sin crosswalk spectrum. Re-derivar la formula para alguien ya en Spectrum esta PROHIBIDO (reproduce
--   /colisiona su codigo existente) -- por eso el caller (no esta funcion) decide cuando generar.
--
-- Decisiones de implementacion (ADR-0036 / ADR-0033 log + keep moving):
--   - SET search_path = '' (estilo del repo, == SET search_path TO ''): unaccent NO esta garantizado bajo
--     search_path vacio, asi que el strip de acentos se hace con translate() explicito (no extension).
--   - Indice CREATE UNIQUE INDEX PLANO (no CONCURRENTLY): A2 -- CONCURRENTLY no corre dentro de un bloque
--     de transaccion y el runner de migracion envuelve en txn. Con 370 filas + 0 case-collisions el build
--     es instantaneo y seguro. IF NOT EXISTS lo hace idempotente.
--   - Colision -> bump determinista del ultimo char (0-9 luego A-Z, A3), replicando el deconflict de Spectrum
--     y preservando la forma de 6 chars. El INDICE es la garantia de unicidad; el loop es best-effort ante
--     carreras concurrentes.
--
-- FLAGGED para el build ATENDIDO de Jaime (NO en esta slice, requiere E2E + R22 care):
--   - Wiring de hr.generate_employee_code en create_employee_with_invite (param aditivo p_apellido_paterno
--     + write crosswalk person_sources(source_system='humanos') en la misma txn que el insert a hr.people).
--     Esto altera una RPC de aprovisionamiento que la onboarding code ya shipped invoca => va en el build
--     atendido (ADR-0036 cierra el resto de SIGNUP-datamodel ahi). SIGNUP-session-bug / SIGNUP-phone /
--     SIGNUP-guardrails (salvo este indice) tambien quedan design-only (mutan auth.users, R22-critico).
--   - CHECK de formato estricto ^[A-Z]{3}[0-9]{3}$: diferido (5 codigos Activo desviados; datos sucios primero).

-- =========================================================================
-- (1) Indice CI-unique aditivo sobre upper(employee_code) (SIGNUP-datamodel).
-- =========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS people_code_ci_unique
  ON hr.people (upper(employee_code))
  WHERE employee_code IS NOT NULL;

COMMENT ON INDEX hr.people_code_ci_unique IS
  'CI-unique sobre upper(employee_code): garantia case-insensitive para la resolucion de login y para los codigos que genera hr.generate_employee_code (ADR-0036). Parcial (excluye los employee_code NULL). Coexiste con people_code_key (UNIQUE case-sensitive crudo, NO se dropea). 0 case-collisions al crear (verificado live 2026-06-05).';

-- =========================================================================
-- (2) hr.generate_employee_code -- generador PO-06 (SIGNUP-formula).
-- =========================================================================
CREATE OR REPLACE FUNCTION hr.generate_employee_code(
  p_apellido_paterno text,
  p_national_id      text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_letters text;
  v_digits  text;
  v_base    text;
  v_cand    text;
  v_suffix  text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i         integer;
BEGIN
  -- (1) apellido -> 3 letras A-Z, sin acentos, UPPER. ADR-0036 / PO-06. El apellido es PARAMETRO
  --     (guardrail #11: nunca derivar de full_name en BD). unaccent NO se usa (no garantizado bajo
  --     search_path=''); se hace translate() explicito de los diacriticos del espanol + n con tilde.
  v_letters := upper(regexp_replace(
                 translate(coalesce(p_apellido_paterno, ''),
                   'áéíóúàèìòùäëïöüâêîôûãõñçÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕÑÇ',
                   'aeiouaeiouaeiouaeiouaoncAEIOUAEIOUAEIOUAEIOUAONC'),
                 '[^A-Za-z]', '', 'g'));
  IF length(v_letters) < 3 THEN
    RAISE EXCEPTION 'apellido_paterno requiere al menos 3 letras utiles (recibido: %)', p_apellido_paterno
      USING ERRCODE = '22023';
  END IF;
  v_letters := left(v_letters, 3);

  -- (2) ultimos 3 digitos de la cedula (descarta guiones/espacios/letras de pasaporte).
  v_digits := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  IF length(v_digits) < 3 THEN
    RAISE EXCEPTION 'national_id requiere al menos 3 digitos (recibido: %)', p_national_id
      USING ERRCODE = '22023';
  END IF;
  v_digits := right(v_digits, 3);

  -- (3) base CUC166.
  v_base := v_letters || v_digits;
  v_cand := v_base;

  -- (4) colision contra upper(employee_code) -> bump determinista del ultimo char: 0-9 luego A-Z (A3).
  --     El indice people_code_ci_unique es la garantia real; este loop es best-effort ante carreras.
  IF EXISTS (SELECT 1 FROM hr.people WHERE upper(employee_code) = upper(v_cand)) THEN
    FOR i IN 1 .. length(v_suffix) LOOP
      -- Replace the 6th char with a deconfliction char (alpha first: CUC166 -> CUC16A, then CUC16B...,
      -- then digits). The guard v_cand <> v_base keeps us from re-proposing the colliding base itself.
      v_cand := left(v_base, 5) || substr(v_suffix, i, 1);
      EXIT WHEN v_cand <> v_base
            AND NOT EXISTS (SELECT 1 FROM hr.people WHERE upper(employee_code) = upper(v_cand));
      IF i = length(v_suffix) THEN
        RAISE EXCEPTION 'espacio de codigo agotado para base % (ADR-0036 A3: extender el bump hacia adentro)', v_base
          USING ERRCODE = '23505';
      END IF;
    END LOOP;
  END IF;

  RETURN v_cand;
END;
$$;

COMMENT ON FUNCTION hr.generate_employee_code(text, text) IS
  'SIGNUP-FORMULA (ADR-0036 / PO-06): genera employee_code = 3 letras apellido paterno (sin acentos, UPPER) + 3 ultimos digitos cedula (CUCALON + 8-930-2166 -> CUC166). Solo para net-new sin crosswalk spectrum; las personas spectrum-sourced conservan su codigo (el crosswalk hr.person_sources es el link durable; sync_spectrum_people resuelve crosswalk-first). El apellido es PARAMETRO (guardrail #11: nunca derivar de full_name). Colision contra upper(employee_code) -> bump determinista del ultimo char (A3). NO escribe hr.people: el caller persiste y escribe person_sources(source_system=humanos). El indice people_code_ci_unique es la garantia de unicidad (esta funcion es best-effort ante carreras concurrentes). SECURITY DEFINER, search_path='''', service_role only.';

-- Least-privilege: la genera el caller server-side (service_role); sin superficie de cliente.
REVOKE EXECUTE ON FUNCTION hr.generate_employee_code(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION hr.generate_employee_code(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION hr.generate_employee_code(text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION hr.generate_employee_code(text, text) TO service_role;

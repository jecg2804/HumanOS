# 0036 — employee_code: formula PO-06 (3 letras apellido + 3 digitos cedula) con crosswalk como link durable y reconciliacion con codigos Spectrum

**Fecha:** 2026-06-05 · **Status:** Accepted · **Decidido por:** Jaime (confirmo la formula PO-06) + consejo adversarial (ADR-0033, overnight). **Relacionado:** ADR-0034 (people sync v2: crosswalk `person_sources` + FLAG-ONLY), ADR-0032 (Core MDM / `core.field_authority`), ADR-0014 (MDM gradual; `hr.people` golden), ADR-0013 (invite codes signup), R22 (auth.users), R27 (Ley 81). **Spec/plan:** `docs/superpowers/specs/2026-06-05-signup-cluster-design.md`. **Fuente PO-06:** `docs/work/2026-06-03-hr-catalog-and-launch-plan.md` linea 102.

## Contexto (verificado live 2026-06-05, proyecto `bzeoszympkkicwlfdtcn`)

PO-06 define el convenio: **`employee_code` = 3 letras del apellido paterno + 3 ultimos digitos de la cedula** (ej. CUCalon, cedula 8-930-2166 → `CUC166`), confirmado por Jaime. SIGNUP-formula (backlog Group 3) pide un generador para net-new hires. Esto entro en aparente tension con people-sync v2 (ADR-0034): hoy `hr.people.employee_code` contiene el **codigo Spectrum** (BA323, RIO83, VAL130…) para los 184 Activo, y `hr.sync_spectrum_people` matchea por crosswalk `person_sources(source_system='spectrum', external_id=employee_code)` y por `employee_code` case-insensitive. Si signup generara `CUC166`, divergiria de los codigos Spectrum sobre los que el sync matchea.

Hechos que reformaron el diseno (re-verificados live, no confiados del handoff):

- **Los codigos Spectrum SON la formula PO-06.** De las 49 personas con code + `national_id`, **44 (90%) tienen sufijo = ultimos 3 digitos de cedula**; los 5 que difieren son los propios bumps de deconfliction de Spectrum. ⇒ "Spectrum conserva su code" y "signup genera CUC166" son **el mismo esquema en dos momentos**, no un conflicto. La unica divergencia real es el sufijo de deconfliction.
- **`people_code_key` es case-SENSITIVE** (`CREATE UNIQUE INDEX ... USING btree (employee_code)` sobre texto crudo) — NO sobre `upper()`. El advisory asumio que la garantia CI ya existia: **falso**. No existe garantia case-insensitive todavia.
- **0 case-collisions hoy** (`GROUP BY upper(employee_code) HAVING count(*)>1` = 0 filas) ⇒ un nuevo indice `UNIQUE (upper(employee_code))` es seguro de agregar.
- **5 codigos desviados** del formato `^[A-Z]{3}[0-9]{3}$` (`KOSM01, PI1939, RIO83, RU1681, SA7620`, todos Activo) — no colisionan bajo `upper()`, asi que toleran el indice CI pero bloquean un CHECK de formato estricto.
- **`surnames`/`given_names` (mig 063) = 0/370 poblados.** El apellido NO se puede leer de BD; parsear `full_name` esta prohibido (frontera que deriva apellido de `full_name`). El apellido debe ser **parametro**.
- **`national_id` = 53/370 poblado** ⇒ para la mayoria de net-new los digitos de cedula vienen de `user_input` de signup.
- **No existe `hr.generate_employee_code`** (verificado via `pg_proc`); net-new justificado.
- Poblacion sin crosswalk spectrum = **194** (de las cuales **10 Activo**, 4 de esas sin code) — esa es la poblacion a la que la formula generara codigo.

## Decision

1. **El link de identidad durable es el crosswalk `hr.person_sources`, NO la columna `employee_code`.** `sync_spectrum_people` ya resuelve crosswalk-first y luego `employee_code` case-insensitive (ADR-0034). Esto se mantiene como columna vertebral.

2. **La formula PO-06 genera codigo SOLO para net-new hires sin crosswalk spectrum.** Las personas spectrum-sourced (176) conservan su codigo Spectrum; re-derivar la formula para ellas reproduce/colisiona su codigo existente (origen de las 35 colisiones simuladas) y esta prohibido. A los net-new generados se les escribe una fila crosswalk `source_system='humanos'` (external_id = `upper(code)`) en la misma transaccion que el insert de `hr.people`, dandoles el mismo link durable que los spectrum.

3. **Generador `hr.generate_employee_code(p_apellido_paterno text, p_national_id text) RETURNS text`** — `SECURITY DEFINER SET search_path TO ''` (lee `hr.people` para resolver colisiones), service_role-only (REVOKE public/anon/authenticated, GRANT service_role; mismo patron que `create_employee_with_invite` mig 071 y el least-privilege de mig 077). El **apellido es parametro** (aportado por el form hr_admin), nunca derivado de `full_name`. No escribe `hr.people`: generacion y persistencia separadas; el caller persiste.

4. **Garantia de unicidad case-insensitive = indice aditivo `people_code_ci_unique` sobre `upper(employee_code)` parcial (`WHERE employee_code IS NOT NULL`).** Coexiste con `people_code_key` (no se dropea = no destructivo sobre `hr.people`). 0 case-collisions verificadas al crear. El **indice es la garantia**; el loop de bump del generador es best-effort ante carreras concurrentes.

5. **Colision → bump determinista** del ultimo caracter (`0-9` luego `A-Z`, extensible hacia adentro), replicando el comportamiento de deconfliction de Spectrum, preservando la forma de 6 chars.

6. **Si una persona humanos-coded luego aparece en un extract Spectrum:** el `sync_spectrum_people` existente la resuelve via fallback CI y escribe crosswalk `spectrum`; Spectrum pasa a autoritativo. Si el texto del codigo difiere, **el crosswalk (no la columna) es autoritativo** y reconciliar la columna se difiere a `needs_review` (el sync sigue FLAG-ONLY, ADR-0034).

## Alternativas rechazadas

- **Generar siempre desde `surnames`/`given_names` limpios** — imposible hoy (0/370 poblado) y obligaria a parsear `full_name` (frontera prohibida). El apellido-como-parametro permite shippear antes del backfill.
- **Apilar codigos `humanos` sobre los Spectrum / re-codear a todos con la formula** — produce las 35 colisiones simuladas y rompe el match del sync; viola "Spectrum conserva su code".
- **Un CHECK de formato `^[A-Z]{3}[0-9]{3}$` ahora** — 5 filas Activo lo violan; forzaria tocar `hr.people` (destructivo, prohibido). Diferido a data-hygiene flagged.
- **Persistir dentro del generador** — mezcla generacion con el path de escritura; lo separamos para tests puros y un solo lugar de escritura (el caller, en su transaccion).
- **Confiar en el loop del generador como garantia de unicidad** — no es seguro ante concurrencia; la garantia es el indice unico.

## Consecuencias

- **Reconcilia el backlog Group 3:** SIGNUP-formula (el generador) + cierra SIGNUP-datamodel (el indice CI-unique + el write crosswalk `humanos` completan el link `employee_code ↔ person_sources` que ADR-0034 dejo "parcialmente satisfecho").
- **SIGNUP-formula + el indice son la unica slice BUILD del cluster** (aditiva, unit/build-verificable, no toca `auth.users`). SIGNUP-session-bug / SIGNUP-phone / SIGNUP-guardrails quedan design-only para build atendido (mutan `auth.users`, R22-critico, requieren E2E) — ver el spec.
- **Assumptions registradas (ADR-0033: log + keep moving):** (A1) crosswalk > columna en reaparicion Spectrum → `needs_review`; (A2) `CREATE UNIQUE INDEX CONCURRENTLY` salvo runner-en-txn (fallback plano, 0 collisions hoy); (A3) bump determinista del ultimo char suficiente para escala ICONSA (0 collisions internas net-new hoy). **Nota B1 (shipped):** el bump es **alpha-first** (`'ABC...Z012...9'`) con guard `v_cand <> v_base`; el suffix digit-first sin guard reproducia `CUC160==base` en i=7 (false-positive). La forma shipped corrige eso (CUC166 colisionado → CUC16A).
- **Pendiente (flagged, no bloquea):** CHECK de formato de `employee_code` + CHECK DGI de `national_id` (datos sucios primero); backfill de `surnames`; semantica de reconciliacion de columna en reaparicion Spectrum.
- **Aplicado + live-verified 2026-06-05** (proyecto `bzeoszympkkicwlfdtcn`, remote version `20260605073213`): `hr.generate_employee_code` + `hr.people_code_ci_unique` vivos; colision `ZZZ999 → ZZZ99A`, acento `Nunez → NUN899`, `CUCALON + 8-930-2166 → CUC16A` (colision real con el Cucalon/Spectrum `CUC166` existente — la reconciliacion evita el reuso); 0 filas de prueba residuales; `employee-code.test.ts` = 14 vitest passed. SIGNUP-formula = **DONE**; wiring en `create_employee_with_invite` = follow-up atendido.

# Signup cluster design — Group 3 (HumanOS)

**Decisions in scope:** ADR-0033, ADR-0034, ADR-0036

**Fecha:** 2026-06-05 · **Autor:** consejo adversarial (overnight, ADR-0033) · **Proyecto:** `bzeoszympkkicwlfdtcn` (HumanOS, ICONSA Panama). **Estado:** spec congelado para gate grill-with-docs → writing-plans.

Este spec cubre los 5 items del backlog Group 3 (STATUS seccion 6): SIGNUP-datamodel, SIGNUP-formula, SIGNUP-session-bug, SIGNUP-phone, SIGNUP-guardrails.

> **SCOPE SPLIT (no negociable en este run, ADR-0033):**
> - **BUILD esta noche** (aditivo, unit/build-verificable, NO toca `auth.users`): **SIGNUP-formula** (generador de `employee_code`) + la pieza aditiva que le falta a **SIGNUP-datamodel** (indice unico CI).
> - **DESIGN ONLY — ATTENDED BUILD, NO construir esta noche**: **SIGNUP-session-bug**, **SIGNUP-phone**, **SIGNUP-guardrails**. Mutan el aprovisionamiento de `auth.users` (R22-critico; el incidente 2026-05-25 borro 47 usuarios) y/o requieren **E2E** del flujo login/onboarding que NO puede correr autonomamente. Quedan marcados para el build atendido de Jaime.

Todos los hechos de BD abajo fueron **re-verificados live 2026-06-05** (no confiados del brief). Las suposiciones del advisory que resultaron FALSAS estan marcadas.

---

## 0. Ground-truth (correcciones al advisory)

| Claim del advisory/brief | Resultado verificado live |
|---|---|
| `people_code_key` es CI sobre `upper(employee_code)` | **FALSO.** `CREATE UNIQUE INDEX people_code_key ON hr.people USING btree (employee_code)` — texto crudo, case-SENSITIVE. La garantia CI **no existe** todavia. |
| Existen case-collisions bajo `upper()` (bloquearian un indice CI) | **NINGUNA** — `GROUP BY upper(employee_code) HAVING count(*)>1` = 0 filas. Un nuevo `UNIQUE (upper(employee_code))` es **seguro de agregar hoy**. |
| Codigos desviados (no `^[A-Z]{3}[0-9]{3}$`) | **5**, todos `status='Activo'`: `KOSM01, PI1939, RIO83, RU1681, SA7620`. Bloquean un `CHECK` de formato estricto pero NO el indice CI (no colisionan entre si bajo `upper()`). |
| `surnames` / `given_names` poblados (mig 063) | **0 / 370** — vacios. El apellido NO se puede leer de BD; parsear `full_name` esta prohibido por guardrail #11. El apellido debe ser **parametro**. |
| `national_id` poblado | **53 / 370** — para la mayoria de net-new los digitos de cedula vienen de signup `user_input`, no de BD. |
| enum de status | Espanol `Activo`/`Inactivo` — **NO** `active`. Cualquier filtro sobre `'active'` matchea 0 filas. |
| Funciones SECURITY DEFINER reusables con `search_path=''` | Confirmado para `find_auth_user_by_identifier`, `regenerate_invite_code`, `check_invite_code_rate_limit`, `sync_spectrum_people`, `complete_onboarding_writes`. **Reusar, no redefinir.** |
| Existe `hr.generate_employee_code` o `hr.resolve_login_identifier` | **NO existen** (verificado via `pg_proc`). Net-new del generador justificado. |
| Spectrum code == formula PO-06 | **CONFIRMADO empiricamente:** 44/49 (90%) de los sufijos Spectrum (de quienes tienen code + national_id) = ultimos 3 digitos de cedula. Los 5 que difieren son los propios bumps de deconfliction de Spectrum. |
| `signInWithPassword` sobre el server client cookie-bound de `@supabase/ssr` setea cookies | Confirmado via Context7 — patron canonico de login en Next.js. |

**Poblacion y constraints clave (hr.people, 370 no-borradas):** 184 con `employee_code`, 186 NULL · 184 `Activo` (180 con code, **4 Activo sin code**) · crosswalk `person_sources` spectrum=176 · **194 sin crosswalk spectrum** (de los cuales **10 Activo** sin crosswalk; 4 de esos sin code). Esta poblacion "194 sin crosswalk spectrum" = a quien la formula generara codigo.

---

## 1. employee_code ↔ Spectrum reconciliation (resuelve la tension central — ADR-0036)

**La prueba empirica disuelve la tension: los codigos Spectrum SON la formula PO-06** (90% de coincidencia). "Spectrum people keep their code" y "signup genera CUC166" son el **mismo esquema en dos momentos distintos**, no un conflicto. La unica divergencia es el sufijo de deconfliction — y el link durable que lo preserva es el crosswalk.

**Regla de autoridad (single source of truth del codigo):**

1. **`hr.person_sources(source_system='spectrum', external_id)` es el link de identidad durable**, NO `employee_code`. `sync_spectrum_people` ya resuelve crosswalk-first y luego `employee_code` case-insensitive (ADR-0034). Esto se mantiene como la columna vertebral.
2. **Las personas spectrum-sourced (176) conservan su codigo Spectrum.** La formula NUNCA genera para quien tiene crosswalk spectrum — re-derivar CUC166 para alguien ya en Spectrum simplemente reproduce su codigo existente (fuente de las 35 colisiones simuladas). Nunca hacerlo.
3. **La formula genera SOLO para net-new hires sin crosswalk spectrum** (operacionalmente: los 10 Activo / 4 codeless-Activo de hoy + futuros net-new). A estos se les escribe una fila crosswalk `source_system='humanos'` en el momento de generacion, dandoles el mismo link durable que los spectrum.
4. **Si una persona humanos-coded luego aparece en un extract de Spectrum**, el `sync_spectrum_people` existente la resuelve via el fallback CI sobre `employee_code` y escribe una fila crosswalk `spectrum`; Spectrum pasa a ser autoritativo desde ahi.
   - **ASSUMPTION A1:** si el texto del codigo Spectrum difiere del generado localmente, el **crosswalk (no la columna) es autoritativo**; reconciliar la columna se difiere a un `needs_review` flagged. El sync sigue FLAG-ONLY y NO escribe identidad (ADR-0034).

**Uniqueness + collision strategy (aditivo, seguro — 0 case-collisions hoy):**

- Agregar `UNIQUE INDEX people_code_ci_unique ON hr.people (upper(employee_code)) WHERE employee_code IS NOT NULL` — aditivo, parcial (preserva los 186 NULL), da la garantia case-insensitive que la resolucion de login necesitara. Mantener `people_code_key` (no DROP = no destructivo sobre `hr.people`).
  - **ASSUMPTION A2:** `CREATE UNIQUE INDEX CONCURRENTLY` no puede correr dentro de un bloque de transaccion. Si el runner de migracion envuelve en txn, fallback a `CREATE UNIQUE INDEX` plano (seguro: 0 case-collisions hoy; tabla de 370 filas). El plan elige segun el runner.
- **NO agregar el CHECK de formato estricto** (`^[A-Z]{3}[0-9]{3}$`) esta noche — 5 filas Activo lo violan; un CHECK fallaria o forzaria tocar esas filas (destructivo sobre `hr.people`, prohibido). Diferido a item de data-hygiene flagged (prerequisito de guardrail #11).
- **Sufijo de colision determinista (replica el bump de Spectrum):** base = `UPPER(left(apellido,3)) || right(digits,3)`. En colision contra `upper(employee_code)`, reemplazar el ultimo caracter por `0-9` y luego `A-Z` en orden fijo (`CUC166 → CUC16A → CUC16B …`), preservando la forma de 6 chars, devolviendo el primer slot libre. Determinista dado el estado de BD y acotado.
  - **ASSUMPTION A3:** el espacio de sufijo (36 por posicion del ultimo char, extensible hacia adentro) es amplio para escala ICONSA — colisiones internas net-new observadas hoy = 0.

---

## 2. SIGNUP-formula — generador de employee_code (BUILD esta noche — ver §8 plan)

**Net-new justificado** — no existe `hr.generate_employee_code` (verificado via `pg_proc`).

Resumen de diseno (el plan concreto a construir verbatim esta en §8):

- **Funcion:** `hr.generate_employee_code(p_apellido_paterno text, p_national_id text) RETURNS text`, `SECURITY DEFINER SET search_path TO ''`, `LANGUAGE plpgsql`. Lee `hr.people` para resolver colisiones ⇒ DEFINER (no pura). REVOKE de public/anon/authenticated, GRANT a service_role (mismo patron que `create_employee_with_invite`, mig 071, y el least-privilege de mig 077).
- **Inputs son PARAMETROS, nunca derivados en-BD** — mantiene guardrail #11 (sin frontera que derive apellido de `full_name`) y permite shippear antes del backfill de `surnames`. El apellido viene del form hr_admin de crear-empleado; los digitos de cedula de `user_input`.
- **Logica:** (1) normalizar apellido (strip acentos/diacriticos + no-`A-Z`, `UPPER`, primeras 3 letras; RAISE si `<3`). (2) ultimos 3 digitos de `regexp_replace(p_national_id,'\D','','g')` (RAISE si `<3`). (3) base = `letras||digitos`. (4) loop de bump determinista (§1) contra `upper(employee_code)` hasta encontrar libre (acotado, RAISE si se agota). (5) devolver el codigo. **NO escribe `hr.people`** — generacion y persistencia separadas para que el unit test sea puro y el path de escritura quede en un solo lugar (el caller).
- **Integracion (blast radius minimo):** `create_employee_with_invite` gana un param opcional `p_apellido_paterno text DEFAULT NULL`. Cuando `p_employee_code` viene blank Y `p_apellido_paterno` esta presente, el RPC llama `hr.generate_employee_code(...)` antes del INSERT. Ambos blank → inserta NULL (comportamiento actual; el sync puede backfillear via crosswalk). Aditivo: callers existentes que pasan code explicito quedan intactos.
- **Crosswalk durable:** el caller escribe `person_sources(source_system='humanos', external_id=upper(code))` en la **misma transaccion** que el insert de `hr.people` (el link durable de los net-new; cierra el resto de SIGNUP-datamodel mas alla del indice).
- **RLS/COMMENT:** funcion `SECURITY DEFINER`, sin superficie de cliente. `COMMENT ON FUNCTION` documentando PO-06, la regla de exclusion spectrum, y A1–A3. UTF-8 sin BOM, sin voseo (`tu/tienes/puedes`).
- **Tests (vitest + pgTAP):** caso limpio (`CUCALON`,`8-930-2166` → `CUC166`); strip de acentos (`NUNEZ`→`NUN…`); bump de colision (seed `CUC166` → `CUC16A`); apellido corto RAISE; cedula corta RAISE; **CI-collision** (seed `cuc166` lowercase, esperar bump — prueba el path del indice `upper()`). Sin `auth.users`, sin E2E ⇒ seguro para el run autonomo.

**Verificar antes de declarar done:** `npm run verify` (typecheck + lint + vitest + build) + `iconsa-rls-validation` sobre el indice/grants nuevos.

---

## 3. SIGNUP-session-bug — DESIGN ONLY (ATTENDED BUILD — needs E2E + R22 care, NOT built tonight)

**Root cause (confirmado en source):** `completeOnboardingAction` corre enteramente sobre el client admin/service_role (`actions.ts:368`), que no escribe cookies de auth; retorna `{redirect_to:'/perfil'}` sin sesion (`:533`). `Step10PhotoConfirm.tsx:78-106` hace `router.push('/perfil')`; `/perfil` llama `supabase.auth.getUser()` sobre el client cookie (`perfil/page.tsx:9`) → sin sesion → el guard `(authenticated)` rebota a `/login`.

**Fix disenado (NO construir esta noche):** tras exito del RPC `complete_onboarding_writes`, establecer la sesion sobre el **server client cookie-bound** (`createSupabaseServerClient()`, el de `@supabase/ssr` cuyo `setAll` escribe cookies — confirmado via Context7), luego redirigir. Por branch:

- **New-user / email branch:** la action tiene el password en texto plano → `serverClient.auth.signInWithPassword({ email: normalized_target, password })`. Cookies seteadas → `/perfil` resuelve. Hacerlo DESPUES de que el RPC tenga exito, para no mintear sesion sobre una cuenta semi-aprovisionada.
- **Existing-user merge branch:** ignora el password tecleado a proposito (anti-enumeracion, guardrail #8); el sign-in por password es poco fiable. **Recomendacion: redirect-to-login** con aviso "tu cuenta ya existia, inicia sesion" — opcion conservadora y R22-safe (sin elevacion implicita de sesion cross-app). Decidir con Jaime.
- **Phone-only branch:** sin email para sign-in → bloqueado por SIGNUP-phone (§4); se resuelve cuando email sea canonico.

**Por que attended + E2E:** cambia si se mintea una sesion durante el aprovisionamiento — exactamente la superficie de la clase de incidente 2026-05-25. E2E requerido antes de merge: (a) happy path new-email aterriza autenticado en `/perfil`; (b) path de fallo del RPC NO mintea sesion y rollbackea auth (la logica compensatoria existente en `:484-510` debe seguir disparando); (c) merge branch no crea sesion cross-app silenciosa; (d) idempotencia de double-submit.
- **ASSUMPTION A4:** la sesion se establece SOLO despues de que `complete_onboarding_writes` retorne ok — nunca antes — para que un onboarding rollbackeado no deje sesion usable.

**ADR necesario (build atendido):** "onboarding establece sesion solo en el branch new-email; merge/phone → redirect a login."

---

## 4. SIGNUP-phone — DESIGN ONLY (ATTENDED BUILD — needs E2E + R22 care, NOT built tonight)

**Root cause (confirmado):** el aprovisionamiento mintea por `[input.target_field]` ∈ {email,phone} (`actions.ts:447-452`, seteado por deteccion de `@` en `:118-122`); un onboarding phone-only crea `auth.users` con phone seteado, email NULL. El login es email-only (`login/actions.ts` `z.string().email()` + `signInWithPassword({email})`) → cuentas phone-only quedan permanentemente no-logueables. Step3 todavia ofrece phone activamente (free-text `delivery_target`, deteccion de `@`). **Live: 1 auth user humanOS, email-based; 0 phone-only — solo prevencion, no migracion de filas malas.**

**Resolucion disenada (Recomendacion A — deprecar phone como identificador de auth):**

1. **Email es canonico para `auth.users`.** El onboarding siempre mintea con email. Para obreros sin buzon, generar un **email sintetico no-ruteable** (ej. `{employee_code|cedula-digits}@no-mail.iconsa.local`) para que toda cuenta sea logueable por el mismo path email+password. El phone se captura como dato de perfil/alias (`hr.people.phone` / alias en `person_sources`), nunca como identificador de login de `auth.users`.
2. **Mantener `find_auth_user_by_identifier` matcheando phone SOLO para el lookup de MERGE multi-app** (ya hace match exacto de phone) — pero **nunca mintear cuenta phone-only**. Preserva el merge cross-app sin crear filas no-logueables.
3. **Cambio en Step3:** seguir recolectando un target de contacto para delivery del invite, pero el identificador de auth es siempre email (real o sintetico). Phone-as-login queda OFF hasta paridad de login (OTP/`resolve_login_identifier`), que es **post-MVP**.
4. **Guard interino (barato, ship-safe incluso antes del diseno completo):** bloquear el minteo phone-only — si `target_field='phone'`, exigir el path de email sintetico o RAISE "email requerido", de modo que ninguna nueva cuenta no-logueable pueda crearse.

**R22 / `allowed_apps` (no negociable):** el merge branch (`:426-442`) debe seguir agregando `humanOS` a `allowed_apps` **sin nunca remover entradas de otras apps** (ya hace spread `...existing` correctamente — preservar). Sin UPDATE/DELETE masivo sobre `auth.users`; los unicos writes son `createUser`/`updateUserById` de una fila keyed a un id resuelto. **Antes de cualquier futuro bulk Spectrum→auth** (guardrail #10): snapshot `backup.auth_users_YYYYMMDD` + filtro `allowed_apps` — NO en esta slice.

- **ASSUMPTION A5:** email sintetico (`@no-mail.iconsa.local`) para obreros sin buzon hace de email el identificador universal de auth; phone es alias-only hasta paridad OTP (post-MVP). Confirmar con Jaime si los obreros sin email loguean con (email sintetico + password en una hoja) o si se necesita login phone-OTP.

**Por que attended + E2E:** toca el identificador que gatea el acceso cross-app. E2E: (a) onboarding email logueable; (b) obrero email-sintetico logueable; (c) merge preserva el `allowed_apps` de una app ajena; (d) ninguna fila phone-only puede crearse.

**ADR necesario (build atendido):** "email es el identificador canonico de auth; phone es alias-only; obreros sin buzon reciben email sintetico `@no-mail`."

---

## 5. SIGNUP-guardrails — los 11, clasificados (DESIGN ONLY salvo el indice CI — NOT built tonight)

Ya shippeados (verificados): **#3** (invite CSPRNG via `randomInt`, `employees-actions.ts:36-42`) y **#7** (commitment-hash anti-enumeracion, `actions.ts` + re-check `:388-413`). Los otros 9:

| # | Guardrail | Capa | Estado / accion |
|---|---|---|---|
| 1 | Spectrum code = USERNAME only; credencial = password alta-entropia (≥10/≥12) u OTP | App | Design. Regla Zod de fuerza de password en onboarding/login. |
| 2 | Activacion SIEMPRE requiere factor de posesion out-of-band; code+cedula solos NUNCA activan | App + DB | Parcial (invite + `validated_delivery_target_hash`). Preservar; asertar code+cedula solos nunca activan. |
| 3 | Invite CSPRNG, TTL corto, expirar previos no-consumidos en regen | App + DB | **DONE** (`randomInt` + `regenerate_invite_code`). Mantener. |
| 4 | Respuestas uniformes no-enumerantes en code/login/reset | App | Design — auditar login/activate/reset; sin code/cedula en errores/URLs/logs. |
| 5 | Rate-limit `(identifier, IP)` + cap global por-IP con backoff en **login** + endpoints Spectrum | DB (preferido) + App | Gap: `check_invite_code_rate_limit` esta keyed `(invite_code_id, ip)` — NO cubre login. Disenar limiter de login (reusar patron DB, key nueva). Attended. |
| 6 | Reset keyed SOLO en email verificado; code/cedula nunca en recovery | App | `/forgot-password` ya email-based. Verificar sin path code/cedula. |
| 7 | Preservar commitment-hash anti-enumeracion; no reintroducir oraculo cross-app | DB + App | **DONE + preservar.** session-bug/phone NO deben regresarlo. |
| 8 | Merge cross-app solo via identificador HR-controlado tras factor de posesion; ignora password tecleado | App | Preservar comportamiento merge actual (`:426-442`). |
| 9 | TTL corto del invite (30d hoy; considerar menos); **resolver phone-only antes de confiar en phone** | DB (TTL) + App | TTL tuneable en `regenerate_invite_code`. Phone-only → §4. Attended. |
| 10 | Futuro bulk Spectrum→auth honra R22 (`allowed_apps` filter + backup snapshot) | App/ops | Fuera de esta slice; gate documentado para cualquier bulk provisioning. |
| 11 | Prereqs data-model: `national_id` UNIQUE + DGI CHECK; link `employee_code ↔ person_sources`; sin apellido-de-`full_name` | DB | `national_id` partial-UNIQUE existe (mig 064); **DGI CHECK falta** (diferir — datos sucios). Link crosswalk cubierto por §1/§2. Apellido-como-parametro cubierto por §2. |

**DB-enforceable ahora (aditivo, puede ir con el build de la formula):** el indice CI-unique `upper(employee_code)` (#11 integridad del link). **Todo lo demas que toca login/auth (#1,#4,#5,#6,#9) es attended** porque necesita E2E contra el flujo de auth.

**ADR necesario (build atendido):** "guardrails triage — #3/#7 done; #2/#4/#6/#11 en Group 3; #1/#5/#9/#10 en una slice dedicada de auth-hardening."

---

## 6. Net assumptions log (ADR-0033: log + keep moving)

- **A1** — Crosswalk (no la columna `employee_code`) es autoritativo cuando una persona humanos-coded luego aparece en Spectrum; reconciliacion de columna diferida a `needs_review`. Sync sigue FLAG-ONLY.
- **A2** — Usar `CREATE UNIQUE INDEX CONCURRENTLY` para `people_code_ci_unique`; fallback a plano (0 case-collisions verificadas) si el runner envuelve en txn.
- **A3** — Bump determinista del ultimo char (`0-9` luego `A-Z`, extensible hacia adentro) suficiente para escala ICONSA; 0 colisiones internas net-new hoy.
- **A4** — La sesion post-onboarding se establece SOLO tras exito de `complete_onboarding_writes`; un onboarding rollbackeado no deja sesion.
- **A5** — Email sintetico (`@no-mail.iconsa.local`) para obreros sin buzon hace de email el identificador universal de auth; phone es alias-only hasta paridad OTP de login (post-MVP).
- **A6** — Merge branch (existing cross-app user) en el fix de session-bug debe **redirect-to-login** (conservador, R22-safe) en vez de auto-mintear sesion; confirmar con Jaime.

---

## 7. Build vs flag, explicitamente

- **BUILD esta noche (aditivo, sin `auth.users`, unit/build-verificable):**
  1. `hr.generate_employee_code(p_apellido_paterno, p_national_id)` — `SECURITY DEFINER SET search_path TO ''`, REVOKE public/anon/authenticated / GRANT service_role, COMMENT, tests vitest + pgTAP.
  2. `UNIQUE INDEX people_code_ci_unique ON hr.people (upper(employee_code)) WHERE employee_code IS NOT NULL` — aditivo, 0 case-collisions confirmadas.
  3. `p_apellido_paterno text DEFAULT NULL` aditivo en `create_employee_with_invite`; el caller escribe `person_sources(source_system='humanos', external_id=upper(code))` en la misma txn que el insert de `hr.people` (link durable de net-new). Gate: `npm run verify` + `iconsa-rls-validation`.
- **FLAG para el build atendido de Jaime (aprovisionamiento de `auth.users` + E2E requerido):** SIGNUP-session-bug (§3), SIGNUP-phone (§4), guardrails #1/#4/#5/#6/#9 (§5). SIGNUP-datamodel queda satisfecho por la columna vertebral del crosswalk (people-sync v2, ADR-0034) + el write crosswalk `humanos` del item 3.
- **DEFER (data hygiene, datos sucios lo bloquean):** CHECK de formato estricto de `employee_code` + CHECK DGI de `national_id` (guardrail #11) — 5 codigos desviados + formatos mixtos de `national_id` deben limpiarse primero; flagged, no silenciosamente dropeado.

**R22 bottom line:** nada en la slice BUILD toca `auth.users` ni hace op destructiva sobre `hr.people`. Cada cambio que muta auth es design-only y explicitamente E2E-gated, porque este cluster esta exactamente sobre la superficie del incidente 2026-05-25.

---

## 8. BUILD plan concreto — SIGNUP-formula (verbatim-buildable)

> Esta seccion es el plan ejecutable de la unica slice BUILD. El resto del spec es design-only.

### 8.1 Migracion `091_employee_code_formula_and_ci_unique.sql`

Naming: timestamp + `091` + descripcion (convencion del repo). HEAD actual de migrations = `090_consent_enforcement_ley81`. Si Codex movio HEAD (memoria: collisions de numero de migracion esperadas), renumerar local por version.

**(a) Indice CI-unique aditivo (SIGNUP-datamodel):**

```sql
-- CONCURRENTLY no corre dentro de un bloque de txn (A2). Si el runner envuelve en txn,
-- quitar CONCURRENTLY (tabla de 370 filas, 0 case-collisions verificadas -> build instantaneo y seguro).
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS people_code_ci_unique
  ON hr.people (upper(employee_code))
  WHERE employee_code IS NOT NULL;

COMMENT ON INDEX hr.people_code_ci_unique IS
  'CI-unique sobre upper(employee_code): garantia case-insensitive para resolucion de login y para los codigos generados por hr.generate_employee_code (ADR-0036). Parcial (excluye 186 NULL). Coexiste con people_code_key (case-sensitive crudo, no se dropea). 0 case-collisions al crear (verificado 2026-06-05).';
```

**(b) Funcion generadora (SIGNUP-formula):**

```sql
CREATE OR REPLACE FUNCTION hr.generate_employee_code(
  p_apellido_paterno text,
  p_national_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_letters text;
  v_digits  text;
  v_base    text;
  v_cand    text;
  v_suffix  text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i int;
BEGIN
  -- (1) apellido -> 3 letras A-Z, sin acentos, UPPER. ADR-0036 / PO-06. Apellido es PARAMETRO (guardrail #11),
  --     nunca derivado de full_name en BD. unaccent NO se usa (no garantizado en search_path=''); se hace translate explicito.
  v_letters := upper(regexp_replace(
                 translate(p_apellido_paterno,
                   'áéíóúàèìòùäëïöüâêîôûãõñçÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕÑÇ',
                   'aeiouaeiouaeiouaeiouaoncAEIOUAEIOUAEIOUAEIOUAONC'),
                 '[^A-Za-z]', '', 'g'));
  IF length(v_letters) < 3 THEN
    RAISE EXCEPTION 'apellido_paterno requiere al menos 3 letras utiles (recibido: %)', p_apellido_paterno
      USING ERRCODE = '22023';
  END IF;
  v_letters := left(v_letters, 3);

  -- (2) ultimos 3 digitos de la cedula.
  v_digits := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  IF length(v_digits) < 3 THEN
    RAISE EXCEPTION 'national_id requiere al menos 3 digitos (recibido: %)', p_national_id
      USING ERRCODE = '22023';
  END IF;
  v_digits := right(v_digits, 3);

  -- (3) base CUC166.
  v_base := v_letters || v_digits;
  v_cand := v_base;

  -- (4) bump determinista contra upper(employee_code): reemplaza el ultimo char (alpha first A-Z luego 0-9, A3).
  --     CUC166 colisionado -> CUC16A, luego CUC16B... y al final los digitos. El guard v_cand <> v_base evita
  --     re-proponer la base que ya colisiona (B1 fix: con suffix digit-first + sin guard, i=7 reproducia CUC160==base).
  IF EXISTS (SELECT 1 FROM hr.people WHERE upper(employee_code) = upper(v_cand)) THEN
    FOR i IN 1 .. length(v_suffix) LOOP
      v_cand := left(v_base, 5) || substr(v_suffix, i, 1);
      EXIT WHEN v_cand <> v_base
            AND NOT EXISTS (SELECT 1 FROM hr.people WHERE upper(employee_code) = upper(v_cand));
      IF i = length(v_suffix) THEN
        RAISE EXCEPTION 'espacio de codigo agotado para base % (ADR-0036 A3: extender el bump)', v_base
          USING ERRCODE = '23505';
      END IF;
    END LOOP;
  END IF;

  RETURN v_cand;
END;
$function$;

REVOKE EXECUTE ON FUNCTION hr.generate_employee_code(text, text) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION hr.generate_employee_code(text, text) TO service_role;

COMMENT ON FUNCTION hr.generate_employee_code(text, text) IS
  'SIGNUP-FORMULA (ADR-0036 / PO-06): genera employee_code = 3 letras apellido paterno + 3 ultimos digitos cedula (ej. CUCALON + 8-930-2166 -> CUC166). Solo para net-new sin crosswalk spectrum; las personas spectrum-sourced conservan su codigo (el crosswalk person_sources es el link durable, sync_spectrum_people resuelve crosswalk-first). Apellido es PARAMETRO (guardrail #11: nunca derivar de full_name). Colision contra upper(employee_code) -> bump determinista del ultimo char (A3). NO escribe hr.people; el caller persiste y escribe person_sources(source_system=humanos). El indice people_code_ci_unique es la garantia de unicidad (esta funcion es best-effort ante carreras concurrentes). service_role only.';
```

**(c) Param aditivo en `create_employee_with_invite`:** `CREATE OR REPLACE` con la firma de mig 071 + `p_apellido_paterno text DEFAULT NULL` al final (Postgres exige que todo param despues del primer default tambien tenga default — ok, todos ya lo tienen). Logica nueva, justo antes del INSERT a `hr.people`:

```sql
  v_code := NULLIF(p_employee_code, '');
  IF v_code IS NULL AND p_apellido_paterno IS NOT NULL THEN
    v_code := hr.generate_employee_code(p_apellido_paterno, p_national_id);
  END IF;
  -- INSERT ... employee_code = v_code ...
  -- y tras obtener v_person_id, si v_code IS NOT NULL:
  INSERT INTO hr.person_sources (person_id, source_system, external_id, external_data)
  VALUES (v_person_id, 'humanos', upper(v_code), jsonb_build_object('generated_by','create_employee_with_invite'))
  ON CONFLICT (source_system, external_id) DO NOTHING;
```

Re-asertar `REVOKE`/`GRANT`/`COMMENT` con la firma nueva (18 params). **Verificar la firma exacta del INSERT a `person_sources` contra el esquema vivo antes de construir** (columnas `external_data` vs el snapshot de ADR-0034) — el caller la usa, no la funcion generadora.

### 8.2 Tests

- **vitest unit** sobre un mirror TS puro de la formula (`src/lib/admin/employee-code.ts` o similar — solo la parte determinista letras+digitos+normalizacion, sin BD): `CUCALON`/`8-930-2166`→`CUC166`; acentos `NUNEZ`→`NUN`; espacios/guiones en cedula; `<3` letras lanza; `<3` digitos lanza.
- **pgTAP** sobre `hr.generate_employee_code` (BD, en branch de test): caso limpio; bump de colision (seed `CUC166` → esperar `CUC16A`); **CI-collision** (seed `cuc166` lowercase → esperar bump, prueba el path `upper()`); RAISE en apellido/cedula cortos. Sin mutar datos live.

### 8.3 Gate

`npm run verify` (typecheck + lint + vitest + docs:check + build) verde + `iconsa-rls-validation` sobre el indice y los grants nuevos. CHANGELOG + STATUS actualizados en el mismo commit.

### 8.4 Assumptions tomadas (resumen para el plan)

- **A1** crosswalk autoritativo > columna en reaparicion Spectrum (reconciliacion → `needs_review`).
- **A2** `CONCURRENTLY` salvo runner-en-txn (fallback plano; 0 collisions hoy).
- **A3** bump determinista del ultimo char suficiente (0 collisions net-new hoy).
- **(formula)** Spectrum==PO-06 (90% probado) ⇒ crosswalk-first previene re-coding; apellido es input de hr_admin, no parseado de `full_name`; los 5 codigos desviados son tolerados por el indice parcial CI (no colisionan bajo `upper()`); el indice es la garantia de unicidad, el loop es advisory.

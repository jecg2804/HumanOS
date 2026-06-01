# Signup Advisory — HumanOS (ICONSA)

**Status:** ADVISORY (output de la mini-auditoría multi-agente 2026-06-01; 9 agentes, 3/3 refutaron la versión ingenua de seguridad). Siembra el brainstorming de signup en **Group 3**. NO es spec final. Decisiones marcadas para James abajo.

> **CORRECCIÓN (James, 2026-06-01): la fórmula SÍ es correcta** — `employee_code` = 3 letras del apellido + 3 últimos dígitos de la cédula (ej. `CUC166` = CUCalon, cédula 8-930-2**166**). El reporte original ("falla 84-90%, dígitos intercambiados") fue un **falso negativo por DATA SUCIA**: el agente comparó `employee_code` vs `national_id` y, como el CONTENIDO no está limpio/normalizado (nombres/apellidos, formato cédula, solo ~14% con cédula poblada, no hay columna `apellido`), vio mismatches. **Eso es auditoría de CONTENIDO, no de ESTRUCTURA — y el contenido nunca se ha auditado.** Implicaciones: (1) el código **se puede computar** de apellido+cédula cuando están limpios; (2) **antes** de usarlo como identificador, correr un **workstream de normalización de datos** (split nombre/apellido, formato cédula DGI, backfill, dedup) — ver `DEFERRED-ITEMS.md` "data-hygiene"; (3) la seguridad del §4 NO cambia (sigue siendo un identificador adivinable, nunca credencial).

## 1. Cómo funciona hoy

- **No hay self-service.** Un `hr_admin` crea la persona + genera un invite code de 8 chars (`hr.invite_codes`), entregado manualmente out-of-band. `employees-actions.ts:33-40`.
- **Activación = wizard** (`/onboarding/[code]`, público). Triple validación app-level: `invite_code` + `national_id` + `employee_code` (este último opcional, se omite si la persona no lo tiene — `actions.ts:110-116`).
- **Login de retorno = email + contraseña** únicamente (`login-form.tsx` es `type=email`; `signInWithPassword`). Gate: `allowed_apps ⊇ humanOS`.
- **Bug: el onboarding NO crea sesión** — `completeOnboardingAction` aprovisiona y redirige a `/perfil`, pero nunca llama `signInWithPassword` → el usuario rebota a `/login`.

## 2. Modelo objetivo (identificador vs secreto)

- **Email corporativo (`@iconsanet.com`) = identificador canónico** + ancla de `auth.users` (único que soporta reset/confirm/SSO Google futuro sin cambiar esquema).
- **Código Spectrum = alias de login alternativo, NO credencial.** Resuelve al mismo `auth.users` vía nuevo RPC `hr.resolve_login_identifier` (solo filas con `auth_id IS NOT NULL`).
- **Invite-code = único mecanismo de activación** (mint de `auth.users`). Obra sin mailbox: email sintético no-ruteable + alias Spectrum.
- Una persona → una cuenta; email/Spectrum/SSO son puertas a la misma fila.

## 3. Código Spectrum: feasibility + generación

- Vive en `hr.people.employee_code` (UNIQUE, nullable, 184/370 poblados); debería espejar `hr.person_sources(source_system='spectrum', external_id)`. **Nada enforza que coincidan** → trigger de mirror.
- **Modo A = espejar** el código real desde Spectrum (`person_sources`, la fuente de verdad). **Modo B = computar** `UPPER(left(apellido,3)) || right(cedula,3)` para empleados sin código — **válido SOLO con data limpia** (requiere el workstream data-hygiene primero: apellido separado + cédula formateada). **Modo C = generar local** con secuencia si computar produce colisión, marcado `source_system='humanos'`.
- Requiere índice único case-insensitive `upper(employee_code)` para login + colisión-handling (CUC166 puede repetirse entre dos CUCalon con mismos 3 dígitos de cédula).

## 4. Seguridad — reglas no-negociables (3/3 refutaron la versión ingenua)

Un identificador adivinable es un USERNAME, jamás una credencial. Apellido público + cédula semi-pública ⇒ el código Spectrum es enumerable (~1.000 valores/apellido).

1. Spectrum code = USERNAME only; credencial sigue siendo password alta entropía (≥10, preferir ≥12) u OTP.
2. Activación SIEMPRE requiere factor de posesión out-of-band (invite code obligatorio, u OTP/enlace firmado al `delivery_target` en registro HR). **code+cédula solos NUNCA crean/activan cuenta.**
3. **Invite code = secreto load-bearing: cambiar generación de `Math.random()` (`employees-actions.ts:33-38`) a CSPRNG** (`crypto.randomInt/randomBytes`); TTL corto; expirar códigos previos no consumidos al regenerar.
4. Respuestas uniformes no-enumerantes en TODO endpoint que acepte código (login/activate/reset): sin "no existe" vs "contraseña incorrecta", sin código/cédula en errores/URLs/logs.
5. Rate-limiting `(identifier, IP)` + tope global por-IP con lockout/backoff en login y endpoints Spectrum; el limiter actual `(invite_code_id, ip)` NO los cubre.
6. Reset keyed SOLO en email verificado (`/forgot-password`); código/cédula nunca en recuperación; tokens solo al contacto HR.
7. Preservar el commitment-hash anti-enumeración (`validated_delivery_target_hash` CAS, `actions.ts:140-173` + re-check `:388-394`); no reintroducir el oráculo cross-app vía `find_auth_user_by_identifier`.
8. El merge cross-app de `auth.users` (rama `allowed_apps += humanOS`, `actions.ts:407-423`, que ignora el password tipeado) solo vía identificador HR-controlado tras el factor de posesión.
9. TTL invite corto (hoy 30 días, considerar acortar). Resolver cuentas phone-only (onboarding mintea por teléfono pero login es email-only) antes de confiar en onboarding por teléfono.
10. Provisioning masivo futuro Spectrum→auth honra R22 (filtro `allowed_apps` + snapshot `backup.auth_users_YYYYMMDD`).
11. Pre-requisitos de data-model antes de que cédula/`employee_code` sean load-bearing: `national_id` UNIQUE + CHECK formato DGI (hoy nullable/no-unique/sin-check); link de integridad `employee_code` ↔ `person_sources`; ninguna frontera derivando apellido de `full_name`.

## 5. Cambios vs hoy

- **Aditivos:** RPC `hr.resolve_login_identifier`; campo "identifier" con detección `@` (rama email = camino actual); ladder de identificador en Step 3; CSPRNG en `generateInviteCode`; índice único CI; (recomendado) `hr.people.login_alias` + trigger mirror.
- **Breaking / con cuidado:** deprecar phone como identificador de `auth.users`; hacer que onboarding establezca sesión; backfill que toque `auth.users` → R22.

## 6. Decisiones para James

1. Canónico = email corporativo + Spectrum alias (recomendado) vs. co-iguales.
2. Google Workspace SSO: ¿MVP o fase posterior? ¿Restringir a dominio `iconsanet.com`?
3. Obra sin mailbox: email sintético `@no-mail` (recomendado) vs. email personal obligatorio.
4. Formato del código fallback: legible-con-checksum vs. hash opaco (no usar el raw de cédula).
5. ¿`employee_code` (re-COMMENT) o columna dedicada `login_alias` (recomendado)?
6. ¿Deprecar phone como identificador de onboarding (recomendado)?

**Archivos clave:** `src/app/(public)/login/{login-form.tsx,actions.ts}`, `src/lib/onboarding/actions.ts`, `src/components/onboarding/{Step3Identifier.tsx,WizardReducer.ts}`, `src/lib/admin/employees-actions.ts`, `supabase/schemas/humanos_baseline.sql`.

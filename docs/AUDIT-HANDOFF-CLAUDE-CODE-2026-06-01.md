# HumanOS Audit Handoff para Claude Code — 2026-06-01

**Auditor:** Codex  
**Objetivo:** revalidar la auditoria HumanOS repo + Supabase y dejar un paquete accionable para Claude Code, main programmer.  
**Repo:** `C:\Users\Jaime Cucalon\Documents\iconsa_apps\HumanOS`  
**Supabase live:** `bzeoszympkkicwlfdtcn` (`MovimientOS`, compartido)  
**Modo:** read-only contra BD. Se escribio solo este archivo Markdown.

## Veredicto ejecutivo

**No listo para go-live.** El repo compila, typecheck/lint/test/build pasan, CI remoto esta verde y la BD viva tiene los objetos HumanOS principales. Pero siguen abiertos bloqueos reales antes de usuarios reales:

1. P1 legal/producto: onboarding captura datos medicos/emergencia sin consentimiento registrado.
2. P1 seguridad BD: `notifications.enqueue` es `SECURITY DEFINER`, ejecutable por `authenticated`, y no valida si el caller puede notificar al `recipient_id`.
3. P1/P2 data workflow: el versionado local de migraciones no esta alineado con `supabase_migrations`; `supabase migration list --linked` muestra `047..051` locales separados de las versiones remotas `2026060113/14...`.
4. P2: `src/lib/supabase/database.types.ts` y `supabase/schemas/humanos_baseline.sql` estan desfasados contra la BD viva generada por `supabase gen types`.
5. P2: la auditoria de dependencias sigue fallando con advisories high.

Tambien hay una correccion importante de estado: **el checkout actual ya no es HEAD `00a1df5`; ahora es `58298ac` y esta `ahead 1` sobre `origin/main`**, con `docs/HANDOFF.json` dirty preexistente.

## Estado de repo/GitHub

### Git local

```text
git status --short --branch
## main...origin/main [ahead 1]
 M docs/HANDOFF.json
```

```text
HEAD:        58298ac5c4acaca7699f8d39e06ad5d2851f1e7f
origin/main: 00a1df534f290ce35db294f4dbba81c901be4077
```

Commit local no subido:

```text
58298ac docs: deferred-items registry + gate + docs-restructure plan + honest status correction
```

Archivos del commit local:

```text
CLAUDE.md
docs/AUDITS-PENDING-CONSOLIDATED-2026-05-29.md
docs/DEFERRED-ITEMS.md
docs/superpowers/specs/2026-06-01-docs-restructure-plan.md
```

Dirty preexistente:

```text
docs/HANDOFF.json | 10 +++-------
```

### GitHub

`gh run list --repo jecg2804/HumanOS --limit 8`:

```text
completed success verify main push 26763804586 1m41s 2026-06-01T15:13:29Z
completed success verify main push 26658444801 3m4s 2026-06-01T13:29:44Z
```

Branch protection en `main`:

```json
{
  "required_status_checks": ["typecheck / lint / test / scan", "build"],
  "allow_force_pushes": false,
  "allow_deletions": false,
  "enforce_admins": false,
  "required_pull_request_reviews": null
}
```

Nota: [docs/09-ESTADO-ACTUAL.md](docs/09-ESTADO-ACTUAL.md) aun dice GitHub `https://github.com/ICONSA-Solutions/HumanOS`, pero el remoto real auditado es `https://github.com/jecg2804/HumanOS`.

## Validacion runtime

| Comando | Exit | Resultado |
|---|---:|---|
| `npm run typecheck` | 0 | `tsc --noEmit` limpio |
| `npm run lint` | 0 | `eslint .` limpio |
| `npm run test` | 0 | 9 archivos / 67 tests pasan |
| `npm run build` | 0 | Next.js 16.2.6 compila, 14 paginas generadas |
| `npx playwright test e2e/auth-flow.spec.ts --reporter=line --output "$env:TEMP\humanos-pw-auth-smoke-20260601"` | 0 | 5/5 smoke auth no mutante |
| `npm audit --audit-level=high` | 1 | 5 vulnerabilidades: 3 high / 2 moderate |
| `vercel --version` | 0 | Vercel CLI 54.4.1 disponible en esta shell |

Warning de build/smoke:

```text
The "middleware" file convention is deprecated. Please use "proxy" instead.
```

`vercel ls --format json --yes --cwd .` no valido HumanOS: como no existe `.vercel/project.json`, la CLI termino listando deployments de `movilizaciones-iconsa`. No tocar env/deploy desde este checkout hasta hacer `vercel link` contra el proyecto correcto.

## Supabase live

### Proyecto y migraciones

`supabase projects list --output json` confirmo:

```text
project_ref: bzeoszympkkicwlfdtcn
name: MovimientOS
region: us-west-2
status: ACTIVE_HEALTHY
postgres: 17.6.1.063
linked: true
```

`supabase migration list --linked` confirma remotas hasta:

```text
20260601130108 047_create_leave_ledger
20260601141307 048_notifications_outbox_dedupe
20260601142152 049_fk_covering_indexes
20260601142249 050_requests_next_sequence
20260601142428 051_backfill_comments_leave_requests
```

Pero los archivos locales son:

```text
047_create_leave_ledger.sql
048_notifications_outbox_dedupe.sql
049_fk_covering_indexes.sql
050_requests_next_sequence.sql
051_backfill_comments_leave_requests.sql
```

Y `supabase migration list --linked` los muestra como versiones locales `047..051`, separadas de las remotas timestamped. Esto significa que la carpeta `supabase/migrations/` no esta alineada con el mecanismo normal de Supabase CLI. No ejecutar `supabase db push` contra este proyecto compartido.

### Conteos live

Consulta SQL read-only:

```text
auth_users_total: 48
auth_humanos_allowed: 0
auth_movimientos_only: 48
hr_people_total: 370
hr_people_with_auth: 0
hr_user_settings: 370
current_employment_duplicate_people: 0
unconsumed_invite_codes: 6
requests_types: 24
requests_tickets: 0
notifications_outbox: 0
audit_log: 0
legacy_humanos_employee_profiles: 36
legacy_humanos_requests: 0
```

### RLS / policies

Query de tablas HumanOS con RLS off o sin policies:

```text
requests.sequences -> rls_enabled=true, policy_count=0
```

Esto no es necesariamente un bug si solo se escribe via RPC, pero el RPC actual `requests.next_sequence` esta concedido a `authenticated` y no tiene guard interno.

### SECURITY DEFINER y grants

Consulta live:

```text
hr.apply_employment_scd2_change: SECURITY DEFINER, search_path="", ACL service_role
hr.complete_onboarding_writes: SECURITY DEFINER, search_path="", ACL service_role
hr.find_auth_user_by_identifier: SECURITY DEFINER, search_path="", ACL service_role
hr.check_invite_code_rate_limit: SECURITY DEFINER, search_path="", ACL PUBLIC/anon/authenticated/service_role
hr.post_leave_ledger_entry: SECURITY DEFINER, search_path="", ACL authenticated
notifications.enqueue: SECURITY DEFINER, search_path="", ACL authenticated/service_role
requests.next_sequence: SECURITY DEFINER, search_path="", ACL authenticated/service_role
```

`hr.post_leave_ledger_entry` tiene guard interno `if not hr.is_hr_admin() then raise exception`, asi que el grant a `authenticated` es defendible. `notifications.enqueue` y `requests.next_sequence` no tienen guard equivalente.

### Storage

Buckets live:

```text
attachments: private, 10MB, pdf/jpeg/png/webp/heic/heif
avatars: private, 5MB, jpeg/png/webp
```

Policies storage live auditadas para `avatars`:

```text
avatars_select_authenticated: SELECT bucket_id='avatars' to authenticated
avatars_owner_or_hr_admin_write: ALL owner by path/person auth_id or hr_admin
```

No aparecieron policies `attachments_*` en `storage.objects` en esta consulta actual.

### Advisors

`supabase db advisors --linked --output json` corrio OK. Resumen relevante HumanOS/shared:

- `humanos.update_updated_at` con `function_search_path_mutable`.
- `humanos.employee_profiles`, `humanos.request_approvals`, `humanos.requests`, `humanos.sequences` con policies `true` para writes.
- `public.*` compartido sigue con varios `SECURITY DEFINER` ejecutables por `anon`/`authenticated`; afecta el proyecto compartido, aunque no es surface HumanOS directo.
- Performance warnings por multiple permissive policies en `hr.leave_assignments`, `hr.leave_policies`, `hr.locations`, `hr.org_units`, `hr.positions`, `requests.approvals`, `requests.revisions`, `requests.types`.

## Drive/specs

El conector Google Drive no arranco en esta pasada:

```text
MCP startup failed: timed out awaiting tools/list after 30s
```

Por eso no marco como revalidado el contenido actual de Drive. El drift conocido de la pasada anterior sigue como pista no revalidada aqui: `humanos-mvp-spec.md` en Drive apuntaba al stack viejo `humanos-dev` / `woonbmfmconldxbeqdnr` / `humanos.*`, mientras el repo y BD viva actuales usan `bzeoszympkkicwlfdtcn` y schemas `hr/requests/docs/...`.

Claude Code debe reintentar Drive si necesita comparar el spec exacto antes de cambiar alcance de producto.

## Hallazgos priorizados

### P1 — Onboarding captura datos sensibles sin consentimiento registrado

**Evidencia:**

- [src/components/onboarding/Step6Emergency.tsx:28](../src/components/onboarding/Step6Emergency.tsx) captura contacto de emergencia.
- [src/components/onboarding/Step7Medical.tsx:30](../src/components/onboarding/Step7Medical.tsx) captura informacion medica.
- [src/lib/onboarding/actions.ts:445](../src/lib/onboarding/actions.ts) llama `hr.complete_onboarding_writes`.
- [src/lib/onboarding/actions.ts:450](../src/lib/onboarding/actions.ts) pasa `p_emergency`.
- [src/lib/onboarding/actions.ts:451](../src/lib/onboarding/actions.ts) pasa `p_medical`.
- [docs/05-BUSINESS-RULES.md:579](05-BUSINESS-RULES.md) exige consentimiento previo, expreso e irrefutable para datos de salud.
- [docs/14-COMPLIANCE-LEY81.md:33](14-COMPLIANCE-LEY81.md) dice que el consentimiento no se captura.

**Impacto:** riesgo legal bajo Ley 81 aunque RLS proteja filas. No go-live con datos medicos/emergencia hasta registrar consentimiento.

**Fix recomendado:** agregar paso de aviso/consentimiento antes de Step 6/7, versionar consentimiento (`consent_at`, `consent_version`, `consent_scope`, actor/IP/user_agent), bloquear write de `hr.medical_info`/emergency si no hay consentimiento. Validar texto con abogado panameno.

### P1 — `notifications.enqueue` permite side effects de notificacion/email sin authZ interno

**Evidencia live:**

```text
notifications.enqueue: SECURITY DEFINER, ACL authenticated/service_role, search_path=""
```

Definicion live:

```sql
INSERT INTO notifications.outbox (... recipient_id, channel, status, subject, body, ...)
VALUES (p_recipient_id, 'in_app', 'pending', ...)

SELECT preferences -> 'notifications' -> 'email' -> p_notification_type
FROM hr.user_settings
WHERE person_id = p_recipient_id;

IF v_email_opted_in THEN
  INSERT INTO notifications.outbox (... channel='email' ...)
END IF;
```

No hay `hr.current_person_id()`, `hr.is_hr_admin()` ni allowlist por tipo/caller. El helper app esta en [src/lib/notifications/insert.ts:29](../src/lib/notifications/insert.ts).

**Impacto:** si el schema/RPC esta expuesto, un usuario autenticado podria encolar notificaciones/email hacia cualquier `recipient_id`.

**Fix recomendado:** preferido: `REVOKE EXECUTE ... FROM authenticated` y solo llamar via service role desde server actions/cron. Alternativa: guard interno por `recipient_id`, tipo y rol. Agregar `import 'server-only'` al helper.

### P1/P2 — Migraciones locales no estan alineadas con Supabase CLI

**Evidencia:**

```text
supabase/migrations/
047_create_leave_ledger.sql
048_notifications_outbox_dedupe.sql
049_fk_covering_indexes.sql
050_requests_next_sequence.sql
051_backfill_comments_leave_requests.sql
```

`supabase migration list --linked`:

```text
Local: 047, 048, 049, 050, 051
Remote: 20260601130108, 20260601141307, 20260601142152, 20260601142249, 20260601142428
```

**Impacto:** el repo dice que versiona schema, pero la carpeta no es replayable/alineada con `supabase_migrations`. Riesgo alto si Claude Code intenta `db push`, `migration repair`, o usar CLI como source of truth.

**Fix recomendado:** decidir una de dos:

- Renombrar archivos locales a los timestamps remotos reales: `20260601130108_047_create_leave_ledger.sql`, etc., y verificar `supabase migration list --linked`.
- O moverlos a `supabase/snippets/` y documentar que no son migraciones CLI. Para schema real, generar migraciones timestamped nuevas en adelante.

No ejecutar `supabase db push` contra el proyecto compartido hasta resolver esto.

### P2 — `database.types.ts` y baseline estan desfasados contra BD viva

**Evidencia live:** `supabase gen types typescript --linked --schema hr,requests,docs,workflows,audit,notifications,files,performance,learning | Select-String ...` muestra:

```text
leave_balances
leave_ledger
post_leave_ledger_entry
dedupe_key
next_sequence
```

**Evidencia local:**

- [src/lib/supabase/database.types.ts](../src/lib/supabase/database.types.ts) solo contiene `p_dedupe_key`; no contiene columna row `dedupe_key`, `leave_ledger`, `leave_balances`, `post_leave_ledger_entry`, ni `requests.next_sequence`.
- [supabase/schemas/humanos_baseline.sql:2248](../supabase/schemas/humanos_baseline.sql) todavia define `notifications.enqueue(...)` sin `p_dedupe_key`, aunque live ya lo tiene.

**Impacto:** los proximos cambios que usen ledger/sequences/outbox van a requerir casts o van a compilar contra tipos incorrectos.

**Fix recomendado:** regenerar `database.types.ts` desde live, revisar diff, y regenerar/relabel `humanos_baseline.sql` o marcarlo stale con fecha exacta.

### P2 — `requests.next_sequence` puede quemar secuencias por cualquier usuario autenticado

**Evidencia live:**

```text
requests.sequences -> RLS enabled, 0 policies
requests.next_sequence -> SECURITY DEFINER, ACL authenticated/service_role
```

Definicion live:

```sql
UPDATE requests.sequences
SET current_value = current_value + 1
WHERE seq_type = p_seq_type
RETURNING current_value, format ...
```

No hay guard interno.

**Impacto:** cualquier authenticated que pueda llamar RPC puede consumir numeracion. No expone PII, pero contamina ticket numbering.

**Fix recomendado:** revocar `authenticated` y llamar solo desde server action autorizada, o agregar guard interno que valide que el actor puede crear el tipo de ticket que consume esa secuencia.

### P2 — Creacion admin de empleado no es transaccional

**Evidencia:**

- [src/lib/admin/employees-actions.ts:72](../src/lib/admin/employees-actions.ts) inserta `hr.people`.
- [src/lib/admin/employees-actions.ts:88](../src/lib/admin/employees-actions.ts) inserta `hr.employments`.
- [src/lib/admin/employees-actions.ts:107](../src/lib/admin/employees-actions.ts) inserta `hr.user_settings` sin revisar error.
- [src/lib/admin/employees-actions.ts:110](../src/lib/admin/employees-actions.ts) inserta invite.

**Impacto:** si falla `employments`, `user_settings` o invite despues de crear `people`, queda un empleado parcial.

**Fix recomendado:** mover a RPC transaccional service-role-only, o agregar compensating cleanup y checkear todos los errores.

### P2 — Cron notifications ignora errores de UPDATE

**Evidencia:**

- [src/app/api/cron/process-notifications/route.ts:123](../src/app/api/cron/process-notifications/route.ts) marca `sent` sin leer `{ error }`.
- [src/app/api/cron/process-notifications/route.ts:157](../src/app/api/cron/process-notifications/route.ts) `markPermanent` no revisa error.
- [src/app/api/cron/process-notifications/route.ts:179](../src/app/api/cron/process-notifications/route.ts) `markRetryable` no revisa error.

**Impacto:** el worker puede reportar `sent`/`failed` aunque la fila quede `pending`, generando duplicados o reintentos eternos.

**Fix recomendado:** capturar resultado de cada update, reportar a Sentry/stderr y decidir si el tick debe devolver 500 o estado parcial.

### P2 — Legacy `humanos` conserva policies permisivas y datos

**Evidencia live:**

```text
legacy_humanos_employee_profiles: 36
humanos.employee_profiles profiles_insert WITH CHECK true
humanos.employee_profiles profiles_update USING true
humanos.request_approvals approvals_insert/update true
humanos.requests requests_insert/update true
humanos.sequences seq_update true
```

`CLAUDE.md` prohibe writes a `humanos.*`.

**Impacto:** si `humanos` queda expuesto por Data API o se re-expone, authenticated puede escribir legacy.

**Fix recomendado:** confirmar exposed schemas en Supabase Dashboard. Si no se usa, revocar grants/droppear legacy o endurecer policies. Mantener fuera de `pgrst.db_schemas`.

### P2 — `.env.local` no sirve para consultas Supabase JS actuales

**Evidencia:** intento read-only con `@supabase/supabase-js` + `SUPABASE_SERVICE_ROLE_KEY` de `.env.local` retorno:

```text
auth.admin.listUsers -> Invalid API key
storage.listBuckets -> JWS Protected Header is invalid
schema queries -> HTTP 401
```

No se imprimieron secretos.

**Impacto:** local dev/admin actions/E2E mutante pueden fallar aunque `next build` pase. No concluye que produccion este igual; Vercel puede tener secretos correctos.

**Fix recomendado:** James/Claude Code deben verificar que `SUPABASE_SERVICE_ROLE_KEY` local sea compatible con `supabase-js` usado por la app, y que Vercel tenga el secreto correcto. No rotar ni imprimir secretos en repo.

### P2 — `npm audit` falla con advisories high

**Evidencia:**

```text
path-to-regexp 4.0.0 - 6.2.2, high, via @vercel/config -> @vercel/routing-utils
postcss <8.5.10, moderate, via next
5 vulnerabilities (2 moderate, 3 high)
```

`npm audit fix --force` propone cambios breaking/downgrade (`@vercel/config@0.0.32`, `next@9.3.3`).

**Fix recomendado:** no usar `--force`. Seguir update upstream de Next/Vercel, dejar excepcion documentada y revisar cuando haya patch compatible.

### P3 — `middleware.ts` deprecated en Next 16

**Evidencia:** `npm run build` y Playwright smoke emiten:

```text
The "middleware" file convention is deprecated. Please use "proxy" instead.
```

Archivo actual: [src/middleware.ts](../src/middleware.ts).

**Fix recomendado:** migrar a `src/proxy.ts` antes de Next 17, con tests existentes.

### P3 — Google Drive no revalidado por conector

**Evidencia:** `mcp__codex_apps__google_drive` fallo por startup timeout.

**Impacto:** no hay confirmacion actual de que `humanos-mvp-spec.md` o `ICONSA_HR_Document_Catalog.md` no hayan cambiado.

**Fix recomendado:** reintentar Drive antes de cambiar scope de producto o SOP mappings.

## Que esta bien

- CI remoto verde en `origin/main` con checks requeridos.
- `npm run typecheck`, `lint`, `test`, `build` limpios localmente.
- Smoke auth Playwright 5/5 pasa sin escribir BD.
- `login/actions.ts` ya sanitiza `next`: rechaza no-slash, `//`, `/\`.
- `/admin` tiene guard de `requireHrAdmin`.
- `complete_onboarding_writes`, `find_auth_user_by_identifier`, `apply_employment_scd2_change` estan `service_role` only y `search_path=""`.
- `hr.post_leave_ledger_entry` concede `authenticated`, pero trae guard interno `hr.is_hr_admin()`.
- `avatars` esta privado con policy owner/hr_admin para writes.
- `docs/DEFERRED-ITEMS.md` introduce un gate util para evitar que diferidos se pierdan.

## Lista de trabajo recomendada para Claude Code

1. **P1 consent:** implementar consentimiento Ley 81 antes de Step 6/7 + BD de consentimiento + tests.
2. **P1 notifications RPC:** revocar `authenticated` de `notifications.enqueue` o agregar authZ interno; marcar helper `server-only`.
3. **P1/P2 migrations:** corregir `supabase/migrations` para que `migration list --linked` no muestre drift local/remoto.
4. **P2 types/baseline:** regenerar `src/lib/supabase/database.types.ts` y actualizar/marcar baseline.
5. **P2 sequence:** cerrar `requests.next_sequence` con service-role-only o guard interno.
6. **P2 admin transaction:** convertir create employee + invite en RPC transaccional.
7. **P2 cron update errors:** revisar `{ error }` en todos los updates del worker.
8. **P2 legacy humanos:** confirmar exposed schemas y endurecer/droppear legacy.
9. **P2 env:** validar local/Vercel service role sin imprimir secretos.
10. **P3 proxy:** migrar `middleware.ts` a `proxy.ts`.

## Comandos utiles para revalidar despues de fixes

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm audit --audit-level=high
npx playwright test e2e/auth-flow.spec.ts --reporter=line --output "$env:TEMP\humanos-pw-auth-smoke"
supabase migration list --linked
supabase db advisors --linked --output json
supabase gen types typescript --linked --schema hr,requests,docs,workflows,audit,notifications,files,performance,learning | Select-String -Pattern 'post_leave_ledger_entry|next_sequence|leave_ledger|leave_balances|dedupe_key'
```

Para Vercel:

```powershell
vercel --version
# Primero link correcto:
vercel link
# Luego solo read-only:
vercel ls --format json --yes --cwd .
```

No usar `vercel env pull` sin confirmar, porque escribe archivos env locales.


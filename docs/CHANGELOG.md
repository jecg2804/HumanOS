# HumanOS v2 CHANGELOG

Cambios por feature/grupo. Formato: conventional commits + entries `[bd]` para migrations o `[seed]`.

## [Unreleased]

Group 3 (Profile + KB) en planning. Ver `02-MVP-SCOPE.md` F6-F9.

### Audit 2026-05-29 (full multi-agent audit + adversarial verification)

Auditoria integral (DB, backend, frontend/diseño, docs, lógica/engines, seguridad) + gap de mercado vs Workday/BambooHR/Rippling/Personio/Deel. 38 agentes con verificación adversarial de hallazgos.

#### P1/P2 code + BD fixes (batch 2026-05-29)

- BE-1 (P1): Cron notification worker retry rewritten in `src/app/api/cron/process-notifications/route.ts`. Transient Resend errors now keep `status='pending'` + increment `attempts` + write `last_attempt_at` (retried next tick) until `attempts >= max_attempts` -> terminal `failed`; permanent failures (no recipient/template) -> `failed` immediately. Previously ANY error set terminal `failed` on first try (max_attempts/attempts<3/backoff inert; one transient hiccup dropped an email forever).
- Audit-log + actor-reference cluster (DB-5) in `src/lib/admin/employees-actions.ts`: `invite_codes.generated_by` and `audit.log.actor_id` both FK -> `hr.people(id)`, but the code passed `user.id` (auth.users id) -> latent FK violations. Now use `requireHrAdmin().personId`. `regenerateInviteCodeAction` audit insert also used `action='invite_code_regenerated'` (violates `log_action_check`) with the error unchecked -> silently dropped; now `action='custom'` + semantic name in reason/metadata + error logged. `updateEmployeeAction` keeps `user.id` (correct: `employments.created_by` FK -> auth.users).
- `[bd] 045_fix_scd2_audit_action_and_actor`: `hr.apply_employment_scd2_change` critical-change branch was broken — audit insert used `action='employment_scd2_transition'` (violates CHECK) and `p_actor_id` (auth id) as `audit.log.actor_id` (FK -> hr.people). Fixed: `action='custom'` + reason/metadata; resolve person id via `hr.people.auth_id = p_actor_id` for the audit actor; `created_by` keeps `p_actor_id`. These were never hit in prod (hr schema not API-exposed + 0 onboarded users).
- Gate: tsc/lint/vitest 9 files 65 tests/build OK.

#### [bd] Migration 044 (applied via MCP 2026-05-29)

- `[bd] 044_revoke_security_definer_grants_from_authenticated` — SEC-1/2/3: `hr.apply_employment_scd2_change`, `hr.complete_onboarding_writes`, `hr.find_auth_user_by_identifier` estaban EXECUTE-granted a authenticated/anon/PUBLIC (RLS-bypassing SECURITY DEFINER). REVOKE de PUBLIC/anon/authenticated; ahora service_role-only. `find_auth_user` recuperó el grant PUBLIC por la migración 043 (recreó la función re-granando solo service_role → revirtió al default PUBLIC); 044 re-aplica el revoke de 034. NO se añadió guard interno `is_hr_admin()` porque el caller legítimo es service_role (sin identidad de persona).

#### Hallazgos críticos de CONFIG (no en repo — Supabase Data API dashboard)

- **P1 launch-blocker**: schemas `hr`/`requests`/`notifications`/etc. NO están en exposed-schemas de la Data API (solo `public`, `humanos`, `graphql_public`). La app lee/escribe `hr.*` vía supabase-js `.schema('hr')` (PostgREST), que falla con PGRST106 para TODAS las keys (service_role incluido — la exposición de schema no la bypassa service_role). Confirmado empíricamente (curl → HTTP 406). 0 usuarios onboarded / 0 auth_id / 370 people `created_from='consolidation'` → los flujos hr de la app nunca corrieron en prod. **Acción (James, dashboard)**: exponer `hr` + `notifications` (RLS-gated) DESPUÉS de migración 044, NO antes (exponer hr con los grants viejos habría activado SEC-1 escalada de privilegios).
- **P2**: `humanos` (schema PROHIBIDO R1, legacy v1) está expuesto con RLS permisiva (`WITH CHECK true`). Confirmado reachable (curl → HTTP 200). Quitar de exposed-schemas.
- **P2**: "Automatically expose new tables" está ON — apagar (control manual).

#### Otros P1/P2 verificados (pendientes, no aplicados aún)

- BE-1 (P1 código): retry del Cron notification worker está muerto — un fallo transitorio de Resend marca `failed` permanente; `max_attempts`/`attempts<3`/backoff inertes. `route.ts:50-54,137-148`.
- Audit-log write bug (P2): `regenerateInviteCodeAction` inserta `action:'invite_code_regenerated'` que viola el CHECK `log_action_check` (solo insert/update/delete/restore/custom/login/logout/export/view_sensitive) y el error no se chequea → row descartado en silencio. `employees-actions.ts:177`.
- P2 cluster: audit.log sin triggers (DB-1), requests.audit_log grants UPDATE/DELETE (DB-2), admin pages sin requireHrAdmin a nivel ruta (BE-4/SEC-5), sin idempotencia notif (BE-2), sin observabilidad/Sentry (BE-3), hex hardcodeado x47 (FE-1), sin loading/error/404 + 5 nav links rotos (FE-2), a11y (FE-3), mobile/PWA (FE-4), docs drift (DOC-2/3/4), decisiones pre-engine (BL-2..BL-7).

### Audit 2026-05-28 remediation (post-v0.0.2)

Batches 1-4 del audit consolidado. Commits `3e82240` (harness), `6cbd643` (docs sync), `c97e0c3` (code security), `db4d1f5` (BD plan).

#### Code security (Batch 3, commit `c97e0c3`)

- NEW.A (P1): cross-app enumeration oracle eliminado de `validateInviteCodeAction` (removidos `existing_multi_app_user` + `existing_email_masked`); HMAC token `src/lib/onboarding/token.ts`; rate-limit; typo-poisoning commitment; merge multi-app silencioso en `completeOnboardingAction`; password step ahora visible a todos.
- NEW.A follow-up (Codex review): `completeOnboardingAction` ahora re-valida el commitment (fetch invite + person_id match + no consumido/expirado + `SHA256(normalized_target)` === `validated_delivery_target_hash`). Cierra bypass donde el POST de completion aceptaba un `normalized_target` arbitrario, evadiendo el commitment de validateInviteCodeAction (riesgo: merge humanOS en cuenta de víctima + link de person_id + oracle reintroducido).
- NEW.B (P2): `reportOnboardingErrorAction` valida HMAC token (mata person_id spoofing).
- P1.6: `requireHrAdmin` (`src/lib/auth/require-hr-admin.ts`) aplicado a 3 server actions admin.
- P2.14: allow-list en login next-redirect. P3.43->P2: cron falla closed sin CRON_SECRET.
- Env nueva: `ONBOARDING_TOKEN_SECRET` (>=32 chars, Vercel + .env.local).

#### [bd] Migrations 039-043 (audit BD hardening, applied via MCP 2026-05-28)

- `[bd] 039_create_invite_code_attempts_and_commitment` — NEW.A: tabla `hr.invite_code_attempts` (RLS, SELECT hr_admin, FK ON DELETE CASCADE, compound idx invite+ip) + función `hr.check_invite_code_rate_limit` SECURITY DEFINER search_path='' (5 attempts / 15 min sliding / 15 min block) + columnas `hr.invite_codes.validated_at` + `validated_delivery_target_hash` (typo-poisoning commitment).
- `[bd] 040_drop_backup_schema` — P1.3: `DROP SCHEMA backup CASCADE` (63 snapshot tables del consolidation core.identities 029-032 rolled back). Resuelve advisor `rls_disabled` critical (exponian snapshot auth.users a anon). Pre-flight FK/view/function dep check = 0. Aprobado James.
- `[bd] 041_pin_touch_updated_at_search_path` — P2.22: `ALTER FUNCTION hr.touch_updated_at() SET search_path = pg_catalog, public`. Resuelve advisor `function_search_path_mutable`.
- `[bd] 042_drop_duplicate_people_code_constraint` — P2.26: `DROP CONSTRAINT people_code_unique` (2 UNIQUE constraints redundantes en `hr.people(employee_code)` desde migration 002b; conserva `people_code_key`). Resuelve advisor `duplicate_index`.
- `[bd] 043_find_auth_user_drop_encrypted_password` — NEW.C: redefine `hr.find_auth_user_by_identifier` sin `encrypted_password` en RETURNS TABLE (defense-in-depth; ningun caller lo lee). Grants service_role only.

Post-apply advisors: `rls_disabled` critical resuelto; `hr.touch_updated_at` mutable search_path resuelto; `hr.invite_code_attempts` con policy. Findings restantes son de `public.*` (MovimientOS) / `humanos.*` (legacy v1) — no HumanOS (R1). `requests.sequences` sin policy diferido a Group 3 (sequencer de tickets).

Diferido pre-Group-4: P2.23 FK indexes (63), P2.24 COMMENT ON COLUMN backfill (38 tablas).

Verification gate: tsc/lint/vitest 9 files 65 tests/build OK.

Plans: `docs/superpowers/plans/2026-05-28-batch-3-code-security.md` + `2026-05-28-batch-4-bd-hardening.md`.

---

## v0.0.2 - 2026-05-27 - Group 2 Onboarding

### Verification gate

- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors
- `npx vitest run`: 8 files, 58 tests green
- `npm run build`: production build success, 12 routes generated

### [bd]

- 033_seed_onboarding_sops_m01_d07: seed IC-RH-M-01 + IC-RH-D-07 + VV01 versions (Blocker B2)
- 034_create_find_auth_user_by_identifier: SECURITY DEFINER lookup (ADR-0006)
- 035_create_avatars_bucket_and_policies: storage bucket avatars + RLS subquery
- 036_add_outbox_indexes_and_enqueue_helper: notifications.enqueue() reading preferences->'notifications' (Issue I1)
- 036b_add_outbox_metadata_column: ALTER TABLE add metadata jsonb (gap fix from 036)
- 037_create_complete_onboarding_writes_rpc: idempotent atomic writes with sop_version_id JOIN (B3 + I3)
- 038_create_apply_employment_scd2_change: SCD-2 helper for F5 edit

### [feat]

- F1 onboarding wizard 10 pasos (`/onboarding/[code]`)
- F4 admin empleados creación (`/admin/empleados/nuevo`)
- F5 admin empleados edición (`/admin/empleados/[id]/editar`) + regenerate invite
- F-04-01 integrated: emergency contact + medical info wizard steps 6/7
- F-01-09 integrated: M-01 ética + D-07 trabajo infantil acknowledgments (step 9)
- `/forgot-password` + `/reset-password` flows (email only MVP)
- `/perfil` post-onboarding landing
- NotificationBell + dropdown + Realtime subscription (in-app channel)
- Email worker Vercel Cron route handler `/api/cron/process-notifications` (Resend, schedule */5, Reply-To pattern per ADR-0008 revised)
- Email templates: BaseLayout, OnboardingErrorReported, InviteCodeDelivered, InviteCodeRegenerated, WelcomeEmployee

### [test]

- E2E: onboarding happy (new user)
- E2E: onboarding multi-app merge (encrypted_password invariant R22)
- E2E: onboarding step 5 critical error → needs_review flag
- E2E: admin create + invite + edit + regenerate
- E2E: forgot-password anti-enumeration + phone fallback
- Unit: translateAuthError (9), normalize (9), Zod schemas (11), notifications insert (2), avatars helpers (4), supabase admin (2), allowed_apps (existing)
- **E2E branch temporal**: la suite corrió contra Supabase branch `group-2-e2e` con `count_auth_users` SECURITY DEFINER RPC + `e2e/.auth/hr_admin.json` storage state seeded. Branch borrado por Chat 2026-05-28 post-tag v0.0.2 (cleanup discipline). Patrón branch-temporal-con-cleanup confirmado válido por James; constitution 5.7 wording pendiente clarificación via ADR-0016 para distinguir daily-dev (prohibido) vs E2E-suite-temporal (permitido).

### [chore]

- ESLint custom rule `iconsa/no-admin-client-in-client` (ADR-0006 enforcement)
- `src/lib/supabase/admin.ts` service role admin client
- @vercel/config v0.5.0 devDependency for `vercel.ts` typed config
- @react-email/components 1.0.12 + Resend 6.12.2 already present pre-Group-2

---

## v0.0.1 - 2026-05-27 - Group 1 Foundation

### Added
- Supabase Auth integration via @supabase/ssr (server + browser + middleware clients).
- Multi-app `allowed_apps` enforcement via Next.js middleware (R22, ADR-0001). Public routes bypass: `/login`, `/onboarding/[code]`, `/api/auth/*`, `/error`.
- shadcn/ui New York style + 11 primitives (button, input, label, sonner, dropdown-menu, avatar, separator, skeleton, sidebar, sheet, tooltip) + use-mobile hook.
- Tailwind 4 @theme with ICONSA palette (navy, gold, info, success, warning, danger, special, neutral). Shadcn semantic tokens (background, foreground, primary, secondary, accent, destructive, border, input, ring, sidebar-*) mapped to ICONSA.
- Login page (`/login`) with React 19 form + useTransition + server actions (Zod-validated input, allowed_apps gate, logout). UI en espanol neutro Panama (R15, no voseo).
- AppShell layout for authenticated routes: sidebar (logo, nav, hr_admin-gated Admin link) + topbar (sidebar trigger, user menu) + content area + Sonner toaster.
- Root redirect: unauthed -> /login, authed -> /dashboard. Placeholder dashboard (filled in Group 7).
- Test infrastructure: vitest 4 (jsdom env, coverage v8 70% thresholds), Playwright (chromium, dev server reused, baseURL :3001).
- Generated Supabase database types for 9 HumanOS schemas (hr, requests, docs, workflows, audit, notifications, files, performance, learning) via supabase gen types CLI (3675 lines).
- Inter + JetBrains Mono fonts via next/font.

### Changed
- package.json scripts: add test, test:watch, test:coverage, test:e2e, test:e2e:ui, verify (chained tsc + lint + vitest + playwright + build).
- eslint config: relax react-hooks/purity + react-hooks/set-state-in-effect for shadcn-generated src/components/ui/** + src/hooks/use-mobile.ts.
- .gitignore: ignore coverage/, playwright-report/, test-results/.

### Tests
- 21 unit tests (vitest): 15 allowed-apps + 6 middleware.
- 5 E2E tests (playwright): login UI smoke + protected route redirect + invalid credentials + no_access error + root redirect.
- Coverage: 70%+ thresholds (excluded shadcn ui/, generated types).

### RLS
- Q1 (tables without RLS in HumanOS schemas): 0 rows (all 53 HumanOS tables have RLS enabled).
- Q2 (RLS enabled but 0 policies): only `requests.sequences` (intentional — accessed via SECURITY DEFINER for atomic sequence generation).

### Notes
- Next.js 16.2.6 emits a deprecation warning: `middleware` file convention will be renamed to `proxy` in Next 17. Defer rename to v1.1.
- E2E happy-login path deferred: no humanOS auth.users exist until Group 2 wires up onboarding. Test denied paths are sufficient for v0.0.1.
- Dashboard content is placeholder; filled in Group 7.

### Commits
- 0c132fb chore: commit HumanOS v2 foundation
- f071f92 docs: fix CARTA_TRABAJO + Cat A/B counts
- 006143c docs(plan): Group 1 Foundation implementation plan
- ea22911 chore(deps): add test infra + utils
- ecb5e6c chore(test): vitest config
- b7ab9a1 chore(test): playwright config
- 84681bb feat(ui): shadcn config + cn() + tokens
- 1673a80 feat(ui): shadcn primitives
- ee1563c chore(types): supabase gen types HumanOS schemas
- 72db40a feat(auth): supabase clients + env
- 11bf647 feat(auth): allowed_apps + isPublicRoute (TDD)
- d085e92 feat(auth): middleware (TDD)
- 6f0f8fd feat(auth): login page + actions
- 4676e00 feat(ui): AppShell layout + fonts
- 9532bab test(e2e): auth flow
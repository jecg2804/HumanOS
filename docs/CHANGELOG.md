# HumanOS v2 CHANGELOG

Cambios por feature/grupo. Formato: conventional commits + entries `[bd]` para migrations o `[seed]`.

## [Unreleased] — Group 2 Onboarding (implementación en curso)

### Status

Plan committed (`28e5103`). Implementación arrancó. Inline execution.

### Implementation progress

- [x] Task 1 (`e2d196c`): Group 2 deps (@react-email/components, react-markdown, dompurify) + .env.local.example + ESLint custom rule `iconsa/no-admin-client-in-client` (ADR-0006 enforcement)
- [x] Task 2A: Migration 033 seed SOPs IC-RH-M-01 + IC-RH-D-07 + VV01 versions (B2 fix)
- [x] Task 2: Migration 034 SECURITY DEFINER find_auth_user_by_identifier (ADR-0006)
- [x] Task 3: Migration 035 avatars bucket + RLS policies (Q3 grill)
- [x] Task 4: Migration 036 outbox indexes + enqueue helper + notification_type column (I1)
- [x] Task 5: `src/lib/supabase/admin.ts` service role client (ADR-0006) + ESLint guard smoke test
- [x] Task 6: `src/lib/auth/errors.ts` translateAuthError + `src/lib/onboarding/normalize.ts` normalizeNationalId/normalizePhone (TDD, 18 tests)
- [x] Task 7: `src/lib/onboarding/validation.ts` Zod 4 schemas (Step1-9 + ErrorReport) + inferred types. v4 `{ error }` option (replaces v3 errorMap). 11 TDD tests.
- [x] Task 8: `src/lib/notifications/types.ts` NotificationType enum + TEMPLATE_CODE_MAP + `insert.ts` enqueueNotification helper (wraps schema('notifications').rpc('enqueue')). 2 TDD tests (success path + RPC error).
- [x] Task 9: `src/emails/` BaseLayout + OnboardingErrorReported + InviteCodeDelivered + InviteCodeRegenerated + WelcomeEmployee (@react-email/components 1.0.12 + Tailwind + pixelBasedPreset re-exported via tailwind subpkg) + barrel `index.ts` for cron worker dynamic lookup.
- [x] Task 10: `src/lib/storage/avatars.ts` validateMime + resizeImage canvas 800x800 q0.85 + uploadAvatar + getAvatarSignedUrl (Q3 β-prima, post-resize 1MB hard cap). 4 TDD tests.
- [x] Task 11: `src/lib/notifications/realtime.ts` useNotificationsRealtime hook (initial load + Supabase Realtime postgres_changes filter on recipient_id) + markAsRead + markAllAsRead.
- [x] Task 12: `src/lib/onboarding/actions.ts` server actions: validateInviteCodeAction (R14 triple validation + multi-app detection ADR-0006) + reportOnboardingErrorAction (Q5 needs_review + outbox to all hr_admins) + completeOnboardingAction (capture-restore I3 rollback + RPC 037) + uploadOnboardingAvatarAction (B1 fix admin-client gated by invite validity). Migration 037 applied (idempotent + sop_version_id JOIN B3 fix). database.types.ts manually augmented with hr.complete_onboarding_writes + hr.find_auth_user_by_identifier + notifications.enqueue function signatures.
- [x] Task 13: `src/components/onboarding/WizardReducer.ts` (useReducer state + actions VALIDATED/NEXT/PREV/GO_TO/SET_PHOTO/ACK/PAUSE_CRITICAL_ERROR/RESET, step 4 skip when multi-app) + `WizardLayout.tsx` (navy header + gold progress bar + beforeunload guard + cancel confirm modal).
- [x] Task 14: Step1Code (8-char invite, mono-font centered uppercase) + Step2Identity (cedula + employee_code opcional) + Step3Identifier (delivery_target email-or-phone) entry gate. Step 3 useActionState calls validateInviteCodeAction, dispatch VALIDATED on success with multi-app routing.
- [x] Task 15: Step4Password (10-char min + HIBP) + Step5Confirm (profile preview from validateInviteCodeAction JOIN positions/org_units/locations/employment_types/supervisor + multi-app banner if existing_email_masked) + HayErrorModal (Q5 severity leve/critica). WizardReducer ValidatedContext extended with ProfilePreview.
- [x] Task 16: Step6Emergency (contacto emergencia required name+relationship+phone) + Step7Medical (R13 SENSITIVE, all optional, blood_type enum) + Step8Address (13 provincias Panama including comarcas) + Step9Acknowledgments (M-01 + D-07 checkboxes pointing /sops/IC-RH-*-*.pdf).
- [x] Task 17: Step10PhotoConfirm (Q3 β-prima upload via uploadOnboardingAvatarAction admin-client gated, fallback continuar sin foto si fail). Final submit calls completeOnboardingAction with all wizard state, redirects to /perfil on success. Next.js Image (unoptimized) for object URL preview.
- [x] Task 18: `/onboarding/[code]/{page,wizard}.tsx` (Next.js 16 async params + useReducer wizard host + critical-error redirect) + `/onboarding/error-reported/page.tsx` + `/forgot-password/{page,actions}.tsx` (anti-enumeration generic response + phone bypass message) + `/reset-password/{page,actions}.tsx` + `/perfil/page.tsx` (post-onboarding landing with employments JOIN + signed URL avatar). Widened uploadAvatar/getAvatarSignedUrl to AnySchemaClient type.
- [x] Task 19: Migration 038 `apply_employment_scd2_change` (R12 SCD-2 helper, critical-change detection, audit.log entry). `src/lib/admin/employees-actions.ts` (createEmployeeAction with invite code generation + hr.people + hr.employments + hr.user_settings insert; regenerateInviteCodeAction; updateEmployeeAction calls SCD-2 RPC). `EmployeeForm` + `EmployeeList` + `CatalogComboboxField` (No veo el mio fallback) + `RegenerateInviteButton`. Admin pages `/admin/empleados/{,nuevo/,[id]/editar/}`. database.types.ts manually augmented with hr.employment_types table + hr.employments.employment_type_id column + hr.apply_employment_scd2_change function.
- [x] Task 20: NotificationBell (lucide Bell + unread badge) + NotificationDropdown (top 10 + markAllAsRead + ver todas link) + NotificationItem (deep_link from metadata + es-PA locale). Topbar updated to accept personId prop + render NotificationBell. Layout wires personId. Patch migration 036b adds missing `notifications.outbox.metadata` jsonb column (referenced by enqueue RPC).
- [x] Task 21: `vercel.ts` (knowledge update 2026 — @vercel/config v1 typed config) declares cron `*/5 * * * *` for `/api/cron/process-notifications` + `src/app/api/cron/process-notifications/route.ts` GET handler (x-vercel-cron + Bearer ${CRON_SECRET} auth, batch 50, attempts<3, Resend send with Reply-To pattern, dynamic template lookup from `* as Templates from '@/emails'`, mark sent/failed with attempts increment).
- [x] Task 22: E2E tests `e2e/{onboarding-happy,onboarding-multi-app,onboarding-error-report,admin-empleados,forgot-password}.spec.ts` + `e2e/lib/sql-helpers.ts` (adminClient, getAuthUserSnapshot, countAuthUsers, cleanupTestEmployee). Multi-app test verifies encrypted_password IMMUTABLE invariant (R22 critical). Run against `group-2-e2e` Supabase dev branch; requires `count_auth_users` SECURITY DEFINER RPC + `e2e/.auth/hr_admin.json` storage state seeded in branch.

### [bd]

- `033_seed_onboarding_sops_m01_d07`: Manual de Etica IC-RH-M-01 (category=manual) + Politica Trabajo Infantil IC-RH-D-07 (category=documento) + VV01 versions con is_current=true + current_version_id linked (Blocker B2 fix prereq para Task 12 RPC)
- `034_create_find_auth_user_by_identifier`: SECURITY DEFINER function returning id/email/phone/raw_app_meta_data/encrypted_password matching email OR phone. GRANT EXECUTE solo service_role (ADR-0006 multi-app gating).
- `035_create_avatars_bucket_and_policies`: Supabase Storage bucket `avatars` (5MB file_size_limit, jpeg/png/webp) + 2 RLS policies sobre `storage.objects`: SELECT authenticated all + ALL gated por subquery `hr.people.auth_id = auth.uid()` OR `hr.is_hr_admin()` (Q3 grill).
- `036_add_outbox_indexes_and_enqueue_helper`: 2 partial indexes (idx_outbox_worker_pending + idx_outbox_recipient_unread) + ADD COLUMN notifications.outbox.notification_type + SECURITY DEFINER function `notifications.enqueue` que siempre inserta in_app y conditionally email leyendo `preferences->'notifications'->'email'->>$type` con default TRUE (Issue I1 resolved: reusa `preferences` jsonb namespace, NO columna nueva).

### Decisiones absorbidas grill cross-cutting Q1-Q5

- **Q1 F4 campos**: 11 campos críticos. Catalog fallback link "No veo el mío" para position/department/office. NO fallback para employment_type (dominio cerrado SOP).
- **Q2 Wizard navigation**: useReducer client state, atomic step 10, lock invite_code post-validation, cero localStorage por R13 medical SENSITIVE, redirect `/perfil`, beforeunload guard.
- **Q3 Photo upload**: optional, single source `hr.people.photo_url`, bucket `avatars` RLS via subquery `auth_id`, resize 800x800 q0.85, pattern β-prima (pre-submit non-blocking).
- **Q4 Password policy**: 10 chars min, HIBP activo (Pro), copy-paste OK, no rotación, no forced complexity, switch sobre error.code (no i18n framework). 2FA defer v1.1.
- **Q5 Step 5 error escalation**: hr.people.needs_review=true + review_notes markdown structured + notifications.outbox con severidad híbrida (leve continúa / crítica pausa wizard).

### ADRs commiteados Code-level

- **ADR-0006** (`2593f39`): Service role admin client onboarding exception. Email/phone lookup SECURITY DEFINER, NO national_id, NO public.people cross-schema. Capture-then-restore rollback pattern para RPC failure (Issue I3 absorbed).
- **ADR-0007** (`2593f39`): Employment type reference table con metadata operacional IC-RH-D-05.
- **ADR-0008 initial** (`2593f39`): Notifications in-app + email PRIMARY MVP, pattern INSERT same-tx. *Superseded by revision below*.
- **ADR-0008 revised** (`49a978a`): Worker pattern cambiado a **Vercel Cron + Next.js route handler** (no Edge Function). Templates single-source `src/emails/`. Domain `rein-eisenwerk.com` corregido. `RESEND_FROM_EMAIL` standardized. Reply-To pattern añadido. Reusar `preferences` jsonb namespace `notifications` (Issue I1 absorbed).

### Audit findings — RESUELTOS

**🔴 Blockers resueltos**:

- **B1 — Avatar upload step 10 RLS rejection**: nuevo server action `uploadOnboardingAvatarAction` en `src/lib/onboarding/actions.ts` (Task 12). Admin client gated por validez de invite_code (no consumed, no expirado) como auth proxy. Step 17.1 (`Step10PhotoConfirm.tsx`) llama el server action en lugar de `createSupabaseBrowserClient + uploadAvatar`. Helper `uploadAvatar` en `src/lib/storage/avatars.ts` preservado con comment indicando "use for F5 admin edit + F33 self-service, not wizard step 10". Path canonical `avatars/{person_id}/current.{ext}` consistente. β-prima preservado (pre-submit non-blocking + UX "continuar sin foto o reintentar").

- **B2 — `docs.sops` vacío FK violation**: nueva Task 2A + migration 033 `seed_onboarding_sops_m01_d07`. Inserta `IC-RH-M-01` (Manual de Ética, category=manual) + `IC-RH-D-07` (Política Trabajo Infantil, category=documento). Inserta `docs.sop_versions` con `version_number='VV01'`, `is_current=true`, `file_url='/sops/{code}.pdf'`. Backfill `docs.sops.current_version_id`. PDF serving via existing `copy-sops-to-public.ts` prebuild script.

- **B3 — RPC schema mismatch `docs.acknowledgments`**: migration 037 `complete_onboarding_writes` RPC actualizado. Resuelve `sop_version_id` via JOIN `docs.sops → docs.sop_versions WHERE is_current=true` (NO `document_code` que no existe). `signature_method='click'` (matches CHECK constraint). `ip_address` + `user_agent` añadidos como params del server action. Guard: raises exception si SOPs no seedeados ("Aplicar migration 033 primero").

**🟡 Issues resueltos**:

- **I1 — `notification_preferences` dual source**: grep `src/` confirmó 0 usos de los 4 booleanos legacy (excepto types.ts auto-gen). NO migration nueva. Reutilizamos `hr.user_settings.preferences` jsonb existente con namespace `notifications`. Shape: `{ notifications: { email: { <type>: bool }, sms: {}, whatsapp: {} } }`. Helper `notifications.enqueue` lee `preferences->'notifications'->'email'->>$type`, fallback TRUE si namespace absent (opt-in implícito hasta F33 settings UI). Los 4 booleanos legacy quedan como master switch futuro F33.

- **I2 — Email worker strategy**: Task 21 reescrito completamente. Vercel Cron + Next.js route handler `/api/cron/process-notifications` reemplaza Supabase Edge Function. `vercel.ts` (knowledge update 2026) con `crons: [{ path, schedule: '*/5 * * * *' }]`. Templates single-source en `src/emails/` (barrel export `src/emails/index.ts` para lookup dinámico por `template_code`). Auth: `x-vercel-cron` header + `Authorization: Bearer ${CRON_SECRET}`. Reply-To pattern: `RESEND_REPLY_TO=samantha.kosmas@iconsanet.com`, skip si `template_code === 'password_reset'`.

- **I3 — Rollback gap**: `completeOnboardingAction` (Task 12.1) captura `originalAppMetadata` antes del merge `updateUserById`. Si RPC `complete_onboarding_writes` falla: NEW user → `deleteUser`, EXISTING user → `updateUserById` restaurando `originalAppMetadata` (preserva provider/providers/etc). RPC 037 es idempotente: UPDATE `auth_id` solo si NULL or matches; child inserts usan `WHERE NOT EXISTS` clauses; `medical_info` usa `ON CONFLICT DO UPDATE`.

**🔵 Correcciones globales aplicadas**:

| Cambio | Estado |
|---|---|
| `iconsa.com.pa` → `rein-eisenwerk.com` (replace_all en plan + ADR-0008 rewrite) | ✅ |
| `RESEND_FROM_ADDRESS` → `RESEND_FROM_EMAIL` (replace_all en plan + ADR-0008) | ✅ |
| `RESEND_FROM_EMAIL=HumanOS <notificaciones@rein-eisenwerk.com>` confirmado | ✅ |
| `RESEND_REPLY_TO=samantha.kosmas@iconsanet.com` añadido | ✅ |
| `NEXT_PUBLIC_APP_URL=https://humanos.rein-eisenwerk.com` añadido | ✅ |
| `CRON_SECRET=` añadido | ✅ |
| Migrations renumeradas 029-034 → **033-038** + nueva 033 SOPs seed | ✅ |
| Reply-To header pattern documentado en ADR + Task 21 | ✅ |

### Migration numbering final Group 2

| # | Name | Purpose |
|---|---|---|
| 033 | `seed_onboarding_sops_m01_d07` | B2 fix (seed IC-RH-M-01 + IC-RH-D-07) |
| 034 | `create_find_auth_user_by_identifier` | ADR-0006 (SECURITY DEFINER multi-app lookup) |
| 035 | `create_avatars_bucket_and_policies` | Q3 grill (RLS subquery auth_id) |
| 036 | `add_outbox_indexes_and_enqueue_helper` | I1 resolved (preferences jsonb namespace, sin column nueva) |
| 037 | `create_complete_onboarding_writes_rpc` | B3 + I3 (idempotent, JOIN docs.sops→sop_versions) |
| 038 | `create_apply_employment_scd2_change` | F5 SCD-2 helper |

### Infraestructura confirmada

- **Hosting HumanOS**: `humanos.rein-eisenwerk.com` (subdomain domain personal James). DNS+HTTPS validados via probe HTTP.
- **Sender Resend**: `HumanOS <notificaciones@rein-eisenwerk.com>` (env var `RESEND_FROM_EMAIL`).
- **Reply-To Resend**: `samantha.kosmas@iconsanet.com` (env var `RESEND_REPLY_TO`).
- **Domain Resend verificado**: `rein-eisenwerk.com`.
- **Cron secret**: `CRON_SECRET` env var (Vercel + .env.local), `openssl rand -base64 32`.
- **NOTIFICATION_TEST_EMAIL pattern**: dev override, NO setear producción.

### Lo que NO cambió desde primer audit (sigue válido)

- 23 tasks structure
- Pattern A/B/C/D cross-cutting (server action signature, ADR-0006 header, wizard step shape, enqueueNotification)
- ESLint rule `no-admin-client-in-client`
- Wizard reducer + beforeunload + atomic step 10
- E2E SQL-only encrypted_password invariant pattern
- F4 11 campos críticos
- Step 5 needs_review híbrido + HayErrorModal
- Pre-execution checklist (expandido a 10 items con detalles)

### Git state pre-Task-1

```
2593f39 docs(adr): add 0006 + 0007 + 0008 (initial)
49a978a docs(adr): revise 0008 — Vercel Cron + rein-eisenwerk + Reply-To
```

Working tree:
```
M  docs/CONTEXT.md                                                          (untracked changes, no committeado)
?? docs/superpowers/plans/2026-05-27-group-2-onboarding.md                  (untracked, espera audit final Chat)
```

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
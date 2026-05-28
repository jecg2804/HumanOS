# HumanOS v2 CHANGELOG

Cambios por feature/grupo. Formato: conventional commits + entries `[bd]` para migrations o `[seed]`.

## [Unreleased]

Sin trabajo en curso. Group 3 (Profile + KB) en planning. Ver `02-MVP-SCOPE.md` F6-F9.

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
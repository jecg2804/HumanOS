# HumanOS v2 CHANGELOG

Cambios por feature/grupo. Formato: conventional commits + entries `[bd]` para migrations o `[seed]`.

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

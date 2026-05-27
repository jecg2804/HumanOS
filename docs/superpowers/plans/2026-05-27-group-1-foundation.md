# Group 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Working Supabase Auth with multi-app `allowed_apps` enforcement, login page, AppShell layout (sidebar + topbar), shadcn/ui primitives on Tailwind 4 @theme with ICONSA tokens, and test infrastructure (vitest + playwright). Foundation that all subsequent groups consume.

**Architecture:** Next.js 16 App Router. Auth via @supabase/ssr (cookies-based). Middleware at `src/middleware.ts` enforces `app_metadata.allowed_apps` contains `humanOS` for protected routes; public routes bypass (`/login`, `/onboarding/[code]`, `/api/auth/*`). RLS policies (already on BD per ADR-0001) form second defense layer. UI primitives from shadcn/ui CLI New York style, customized with ICONSA palette in `globals.css` @theme block. Tests: vitest for pure logic (auth helpers, middleware); Playwright for user flows.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.6 strict, Tailwind 4, @supabase/ssr 0.10, @supabase/supabase-js 2.105, shadcn/ui (New York), Lucide icons, Zod 4.3 (already), React Hook Form 7.74 (already), Vitest, @testing-library/react, Playwright, Resend 6.12 (transactional only, not used in Group 1).

**Cross-cutting decisions absorbed** (see `docs/adr/`):
- ADR-0001 RLS-driven DB access (client uses user JWT; no service role outside cron)
- ADR-0002 Codegen snake_case types + Zod at boundaries
- ADR-0003 Snapshot profile fields at submit (not relevant Group 1, applies later)
- ADR-0004 Parallel modify reset (not relevant Group 1)
- ADR-0005 Manual entry bypass chain (not relevant Group 1)

**Group 1 mini-grill decisions:**
- G1-1: shadcn CLI init New York + ICONSA tokens
- G1-2: Middleware + RLS double defense (public routes: /login, /onboarding/[code], /api/auth/*)
- G1-3: Skip unit tests for UI primitives; vitest for middleware/auth helpers; Playwright for E2E flows

---

## File Structure

### Files to create

| Path | Responsibility |
|---|---|
| `vitest.config.ts` | Vitest config (jsdom env, alias `@`, coverage v8) |
| `vitest.setup.ts` | Jest-dom matchers |
| `tsconfig.test.json` | TS overlay for test files |
| `playwright.config.ts` | Playwright config (base URL, browsers, retries) |
| `components.json` | shadcn config (created by CLI) |
| `src/lib/utils.ts` | shadcn `cn()` helper (clsx + tailwind-merge) |
| `src/lib/supabase/database.types.ts` | Generated DB types (via Supabase MCP) |
| `src/lib/supabase/server.ts` | Server Supabase client (Next cookies()) |
| `src/lib/supabase/browser.ts` | Browser Supabase client |
| `src/lib/supabase/middleware.ts` | Middleware helper (updateSession + getUser) |
| `src/lib/auth/allowed-apps.ts` | Pure check: jwt contains humanOS |
| `src/lib/auth/allowed-apps.test.ts` | Unit tests |
| `src/lib/auth/constants.ts` | `APP_NAME = 'humanOS'`, route arrays |
| `src/middleware.ts` | Next.js middleware (allowed_apps enforcement) |
| `src/middleware.test.ts` | Middleware unit tests (route matching, redirect) |
| `src/components/ui/*` | shadcn primitives (button, input, label, sonner, dropdown-menu, avatar, separator, skeleton, sidebar) |
| `src/components/app-shell/sidebar.tsx` | HumanOS sidebar (logo, nav, user menu) |
| `src/components/app-shell/topbar.tsx` | HumanOS topbar (breadcrumbs, search slot, notifications icon) |
| `src/components/app-shell/user-menu.tsx` | Avatar dropdown (perfil, settings, logout) |
| `src/components/app-shell/nav-items.tsx` | Nav links array + Sidebar item rendering |
| `src/app/(public)/layout.tsx` | Public group layout (login background, no shell) |
| `src/app/(public)/login/page.tsx` | Login page UI |
| `src/app/(public)/login/login-form.tsx` | Login form client component |
| `src/app/(public)/login/actions.ts` | Login + logout server actions |
| `src/app/(authenticated)/layout.tsx` | Auth-required AppShell layout |
| `src/app/(authenticated)/dashboard/page.tsx` | Placeholder dashboard (Group 7 fills) |
| `e2e/auth-flow.spec.ts` | E2E: happy + denied + logout |
| `e2e/.gitkeep` | Reserve folder |

### Files to modify

| Path | Why |
|---|---|
| `package.json` | Add deps + scripts (test, test:e2e, test:coverage, verify) |
| `tsconfig.json` | Verify strict + path alias `@/*` |
| `next.config.ts` (or `.mjs`) | Verify nothing breaks |
| `src/app/layout.tsx` | Root metadata + body class |
| `src/app/page.tsx` | Redirect: not auth -> /login; auth -> /dashboard |
| `src/app/globals.css` | Tailwind 4 @theme with ICONSA palette + @import shadcn base |
| `.gitignore` | Add `coverage/`, `playwright-report/`, `test-results/` |
| `.env.local.example` | Document `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

---

## Tasks

### Task 1: Install dependencies + update package.json scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

Run:
```bash
npm install lucide-react date-fns clsx tailwind-merge class-variance-authority
```

Expected: 5 packages added. No peer warnings expected (Tailwind 4 already there).

- [ ] **Step 2: Install dev deps for testing**

Run:
```bash
npm install -D vitest@^2.1.0 @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @playwright/test
```

- [ ] **Step 3: Update package.json scripts**

Replace the `scripts` block in `package.json` with:
```json
{
  "dev": "next dev -p 3001",
  "build": "next build",
  "start": "next start -p 3001",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "db:types": "echo 'Run via Supabase MCP: generate_typescript_types -> src/lib/supabase/database.types.ts'",
  "verify": "npm run typecheck && npm run lint && npm run test && npm run test:e2e && npm run build"
}
```

- [ ] **Step 4: Install Playwright browser**

Run: `npx playwright install --with-deps chromium`

Expected: chromium installed (~250MB). msedge/firefox skipped.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add test infra (vitest, playwright, testing-library) + runtime utils"
```

---

### Task 2: Configure Vitest

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`, `tsconfig.test.json`

- [ ] **Step 1: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: ['**/node_modules/**', '**/e2e/**', '**/.next/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/lib/supabase/database.types.ts',
        'src/components/ui/**',
        'src/app/**/page.tsx',
        'src/app/**/layout.tsx',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 2: Create vitest.setup.ts**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Create tsconfig.test.json**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src/**/*.test.ts", "src/**/*.test.tsx", "vitest.setup.ts"]
}
```

- [ ] **Step 4: Smoke test - create sanity test**

Create `src/sanity.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('vitest setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Verify**

Run: `npm test`
Expected: 1 passed, 0 failed.

- [ ] **Step 6: Delete sanity test + commit**

```bash
rm src/sanity.test.ts
git add vitest.config.ts vitest.setup.ts tsconfig.test.json
git commit -m "chore(test): configure vitest with jsdom + v8 coverage"
```

---

### Task 3: Configure Playwright

**Files:**
- Create: `playwright.config.ts`, `e2e/.gitkeep`

- [ ] **Step 1: Create playwright.config.ts**

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 3001;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 2: Create e2e/.gitkeep**

Create empty file `e2e/.gitkeep`.

- [ ] **Step 3: Update .gitignore**

Append to `.gitignore`:
```
# Test artifacts
coverage/
playwright-report/
test-results/
.last-run.json
```

- [ ] **Step 4: Smoke test config**

Run: `npx playwright test --list`
Expected: "0 tests in 0 files" (no tests yet). Config valid.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e/.gitkeep .gitignore
git commit -m "chore(test): configure playwright + ignore test artifacts"
```

---

### Task 4: shadcn/ui init + ICONSA tokens

**Files:**
- Create: `components.json`, `src/lib/utils.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Run shadcn CLI init**

Run: `npx shadcn@latest init`

Interactive answers:
- Style: **New York**
- Base color: **Slate**
- CSS variables: **Yes**
- Tailwind config: (Tailwind 4 mode - reads from globals.css)
- Components alias: `@/components`
- Utilities alias: `@/lib/utils`
- React Server Components: **Yes**
- Write `components.json`: **Yes**

Expected: `components.json` created, `src/lib/utils.ts` created with `cn()` helper, `src/app/globals.css` updated with shadcn base layers.

- [ ] **Step 2: Replace globals.css with ICONSA palette**

Open `src/app/globals.css`, locate the `:root` block (or `@theme` if Tailwind 4), and replace it with:

```css
@import "tailwindcss";

@theme {
  /* ICONSA brand palette per CLAUDE.md design tokens */
  --color-navy-50:  oklch(0.95 0.02 250);
  --color-navy-100: oklch(0.90 0.03 250);
  --color-navy-500: oklch(0.45 0.07 250);
  --color-navy-700: oklch(0.30 0.08 250); /* primary action #1B3A5C */
  --color-navy-900: oklch(0.20 0.06 250);

  --color-gold-500: oklch(0.78 0.16 75);  /* accent #F0A500 */
  --color-blue-500: oklch(0.55 0.18 240); /* link #0A6EBD */
  --color-success: oklch(0.55 0.13 155);  /* #1A7F5A */
  --color-warning: oklch(0.65 0.18 55);   /* #B45309 */
  --color-danger:  oklch(0.55 0.20 25);   /* #C0392B */
  --color-purple-500: oklch(0.45 0.18 290); /* #553C9A */
  --color-gray-500: oklch(0.50 0.02 250);  /* #5A6272 */

  /* shadcn semantic tokens mapped to ICONSA */
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.20 0.06 250);
  --color-primary: oklch(0.30 0.08 250);          /* navy-700 */
  --color-primary-foreground: oklch(0.98 0 0);
  --color-secondary: oklch(0.95 0.02 250);
  --color-secondary-foreground: oklch(0.30 0.08 250);
  --color-accent: oklch(0.78 0.16 75);             /* gold-500 */
  --color-accent-foreground: oklch(0.20 0.06 250);
  --color-destructive: oklch(0.55 0.20 25);
  --color-destructive-foreground: oklch(0.98 0 0);
  --color-muted: oklch(0.96 0.01 250);
  --color-muted-foreground: oklch(0.50 0.02 250);
  --color-border: oklch(0.90 0.01 250);
  --color-input: oklch(0.92 0.01 250);
  --color-ring: oklch(0.55 0.10 250);
  --color-card: oklch(1 0 0);
  --color-card-foreground: oklch(0.20 0.06 250);

  --radius: 0.5rem;

  /* Status badges (used by tickets) */
  --color-status-borrador: var(--color-muted);
  --color-status-enviada: var(--color-blue-500);
  --color-status-revision: var(--color-warning);
  --color-status-devuelta: var(--color-warning);
  --color-status-aprobada: var(--color-success);
  --color-status-rechazada: var(--color-danger);
  --color-status-completada: var(--color-success);
  --color-status-cancelada: var(--color-muted-foreground);
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

- [ ] **Step 3: Verify dev server boots**

Run: `npm run dev` (background ok). Open `http://localhost:3001`.
Expected: page renders without console errors.
Kill server.

- [ ] **Step 4: Commit**

```bash
git add components.json src/lib/utils.ts src/app/globals.css
git commit -m "feat(ui): initialize shadcn/ui New York + ICONSA palette tokens"
```

---

### Task 5: Add shadcn primitives needed for Group 1

**Files:**
- Create: `src/components/ui/button.tsx`, `input.tsx`, `label.tsx`, `sonner.tsx`, `dropdown-menu.tsx`, `avatar.tsx`, `separator.tsx`, `skeleton.tsx`, `sidebar.tsx`, `sheet.tsx`, `tooltip.tsx`

- [ ] **Step 1: Add primitives via CLI**

Run:
```bash
npx shadcn@latest add button input label sonner dropdown-menu avatar separator skeleton sidebar sheet tooltip
```

Expected: 11 files created in `src/components/ui/`. New deps auto-installed (`@radix-ui/react-*`, `sonner`, `cmdk`).

- [ ] **Step 2: Verify typecheck clean**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ package.json package-lock.json
git commit -m "feat(ui): add shadcn primitives (button, input, label, sonner, dropdown-menu, avatar, sidebar, etc.)"
```

---

### Task 6: Generate Supabase database types

**Files:**
- Create: `src/lib/supabase/database.types.ts`

- [ ] **Step 1: Generate types via Supabase MCP**

Use Supabase MCP tool `generate_typescript_types` with `project_id: bzeoszympkkicwlfdtcn` and schemas `['hr','requests','docs','workflows','audit','notifications','files','performance','learning']`.

Write output to `src/lib/supabase/database.types.ts`.

- [ ] **Step 2: Verify import works**

Create temp `src/sanity-types.ts`:
```ts
import type { Database } from '@/lib/supabase/database.types';

type Person = Database['hr']['Tables']['people']['Row'];
const _check: Person['id'] extends string ? true : false = true;
```

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Delete sanity-types + commit**

```bash
rm src/sanity-types.ts
git add src/lib/supabase/database.types.ts
git commit -m "chore(types): generate Supabase database types for HumanOS schemas"
```

---

### Task 7: Supabase server + browser + middleware clients

**Files:**
- Create: `src/lib/supabase/server.ts`, `browser.ts`, `middleware.ts`, `env.ts`

- [ ] **Step 1: Create env validator**

```ts
// src/lib/supabase/env.ts
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
if (!anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');

export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = anonKey;
```

- [ ] **Step 2: Create server.ts**

```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server components cannot set cookies; ignore.
        }
      },
    },
  });
}
```

- [ ] **Step 3: Create browser.ts**

```ts
// src/lib/supabase/browser.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
```

- [ ] **Step 4: Create middleware.ts helper**

```ts
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './database.types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, response, user };
}
```

- [ ] **Step 5: Create .env.local.example**

```
NEXT_PUBLIC_SUPABASE_URL=https://bzeoszympkkicwlfdtcn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase dashboard>
RESEND_API_KEY=<for transactional email, used in Group 4>
```

- [ ] **Step 6: Verify typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase/ .env.local.example
git commit -m "feat(auth): supabase server + browser + middleware clients with typed Database"
```

---

### Task 8: Allowed_apps check helper + unit tests (TDD)

**Files:**
- Create: `src/lib/auth/allowed-apps.ts`, `allowed-apps.test.ts`, `constants.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/auth/allowed-apps.test.ts
import { describe, it, expect } from 'vitest';
import { userHasHumanOSAccess } from './allowed-apps';

describe('userHasHumanOSAccess', () => {
  it('returns false when user is null', () => {
    expect(userHasHumanOSAccess(null)).toBe(false);
  });

  it('returns false when app_metadata is missing', () => {
    expect(userHasHumanOSAccess({ id: 'u1' } as never)).toBe(false);
  });

  it('returns false when allowed_apps is missing', () => {
    expect(userHasHumanOSAccess({ app_metadata: {} } as never)).toBe(false);
  });

  it('returns false when allowed_apps does not include humanOS', () => {
    expect(userHasHumanOSAccess({ app_metadata: { allowed_apps: ['movimientOS'] } } as never)).toBe(false);
  });

  it('returns true when allowed_apps includes humanOS', () => {
    expect(userHasHumanOSAccess({ app_metadata: { allowed_apps: ['humanOS', 'movimientOS'] } } as never)).toBe(true);
  });

  it('is case-sensitive (rejects HUMANOS)', () => {
    expect(userHasHumanOSAccess({ app_metadata: { allowed_apps: ['HUMANOS'] } } as never)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- allowed-apps`
Expected: FAIL (function not defined).

- [ ] **Step 3: Create constants.ts**

```ts
// src/lib/auth/constants.ts
export const APP_NAME = 'humanOS' as const;

export const PUBLIC_ROUTES = [
  '/login',
  '/onboarding',   // /onboarding/[code]
  '/api/auth',     // /api/auth/callback, etc.
  '/error',
] as const;

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((prefix) => pathname.startsWith(prefix));
}
```

- [ ] **Step 4: Create allowed-apps.ts**

```ts
// src/lib/auth/allowed-apps.ts
import type { User } from '@supabase/supabase-js';
import { APP_NAME } from './constants';

export function userHasHumanOSAccess(user: User | null): boolean {
  if (!user) return false;
  const allowedApps = user.app_metadata?.allowed_apps;
  if (!Array.isArray(allowedApps)) return false;
  return allowedApps.includes(APP_NAME);
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -- allowed-apps`
Expected: 6 passed.

- [ ] **Step 6: Test isPublicRoute**

Append to `src/lib/auth/allowed-apps.test.ts`:
```ts
import { isPublicRoute } from './constants';

describe('isPublicRoute', () => {
  it.each([
    ['/login', true],
    ['/login/whatever', true],
    ['/onboarding/ABC123', true],
    ['/api/auth/callback', true],
    ['/error', true],
    ['/', false],
    ['/dashboard', false],
    ['/perfil', false],
    ['/solicitudes', false],
  ])('isPublicRoute(%s) === %s', (path, expected) => {
    expect(isPublicRoute(path)).toBe(expected);
  });
});
```

Run: `npm test -- allowed-apps`
Expected: 15 passed (9 new + 6 existing).

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth/
git commit -m "feat(auth): allowed_apps check + public routes helper (R22)"
```

---

### Task 9: Middleware (allowed_apps enforcement) + unit tests

**Files:**
- Create: `src/middleware.ts`, `src/middleware.test.ts`

- [ ] **Step 1: Write middleware tests**

```ts
// src/middleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock supabase middleware helper
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(),
}));

import { middleware } from './middleware';
import { updateSession } from '@/lib/supabase/middleware';

function makeReq(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, 'http://localhost:3001'));
}

describe('middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes through public routes without auth check', async () => {
    const req = makeReq('/login');
    const res = await middleware(req);
    expect(updateSession).not.toHaveBeenCalled();
    expect(res.headers.get('x-middleware-rewrite') ?? res.status).toBeTruthy();
  });

  it('passes through /onboarding/[code]', async () => {
    const req = makeReq('/onboarding/ABC123');
    await middleware(req);
    expect(updateSession).not.toHaveBeenCalled();
  });

  it('redirects to /login when user is not authenticated', async () => {
    vi.mocked(updateSession).mockResolvedValue({
      response: new Response() as never,
      user: null,
      supabase: {} as never,
    });
    const req = makeReq('/dashboard');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('redirects to /login?error=no_access when user lacks humanOS', async () => {
    vi.mocked(updateSession).mockResolvedValue({
      response: new Response() as never,
      user: { id: 'u1', app_metadata: { allowed_apps: ['movimientOS'] } } as never,
      supabase: {} as never,
    });
    const req = makeReq('/dashboard');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=no_access');
  });

  it('allows authenticated user with humanOS through', async () => {
    const mockResponse = new Response();
    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse as never,
      user: { id: 'u1', app_metadata: { allowed_apps: ['humanOS'] } } as never,
      supabase: {} as never,
    });
    const req = makeReq('/dashboard');
    const res = await middleware(req);
    expect(res).toBe(mockResponse);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- middleware`
Expected: FAIL (middleware not defined).

- [ ] **Step 3: Create src/middleware.ts**

```ts
// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { isPublicRoute } from '@/lib/auth/constants';
import { userHasHumanOSAccess } from '@/lib/auth/allowed-apps';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next({ request });
  }

  const { response, user } = await updateSession(request);

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!userHasHumanOSAccess(user)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'no_access');
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all routes except _next/static, _next/image, favicon
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- middleware`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/middleware.test.ts
git commit -m "feat(auth): middleware enforces allowed_apps=humanOS + public route bypass (R22 ADR-0001)"
```

---

### Task 10: Login page UI + server actions

**Files:**
- Create: `src/app/(public)/layout.tsx`, `src/app/(public)/login/page.tsx`, `src/app/(public)/login/login-form.tsx`, `src/app/(public)/login/actions.ts`

- [ ] **Step 1: Create public group layout**

```tsx
// src/app/(public)/layout.tsx
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 via-background to-navy-100/40 px-4">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create server actions**

```ts
// src/app/(public)/login/actions.ts
'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { userHasHumanOSAccess } from '@/lib/auth/allowed-apps';

const LoginInput = z.object({
  email: z.string().email('Correo invalido'),
  password: z.string().min(1, 'Contrasena requerida'),
  next: z.string().optional(),
});

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const parsed = LoginInput.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos invalidos' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { ok: false, error: 'Correo o contrasena incorrectos' };
  }

  if (!userHasHumanOSAccess(data.user)) {
    await supabase.auth.signOut();
    return { ok: false, error: 'Tu cuenta no tiene acceso a HumanOS. Solicita un invite code a RRHH.' };
  }

  redirect(parsed.data.next ?? '/dashboard');
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

- [ ] **Step 3: Create login form client component**

```tsx
// src/app/(public)/login/login-form.tsx
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction } from './actions';

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (next) formData.set('next', next);
    setError(null);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="tu@iconsanet.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contrasena</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-3">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Ingresando...' : 'Ingresar'}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Si no tienes cuenta, contacta a RRHH para que te genere un codigo de invitacion.
      </p>
    </form>
  );
}
```

- [ ] **Step 4: Create login page**

```tsx
// src/app/(public)/login/page.tsx
import { LoginForm } from './login-form';

const ERROR_MESSAGES: Record<string, string> = {
  no_access: 'Tu cuenta no tiene acceso a HumanOS. Solicita acceso a RRHH.',
  session_expired: 'Tu sesion expiro. Ingresa nuevamente.',
};

type LoginSearchParams = { next?: string; error?: string };

export default async function LoginPage({ searchParams }: { searchParams: Promise<LoginSearchParams> }) {
  const params = await searchParams;
  const errorKey = params.error;
  const initialError = errorKey ? ERROR_MESSAGES[errorKey] : undefined;

  return (
    <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-primary">HumanOS</h1>
        <p className="text-sm text-muted-foreground">Bienvenido al portal de RRHH ICONSA</p>
      </div>
      <LoginForm next={params.next} initialError={initialError} />
    </div>
  );
}
```

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(public\)
git commit -m "feat(auth): login page + server actions with allowed_apps gate"
```

---

### Task 11: AppShell layout (sidebar + topbar)

**Files:**
- Create: `src/components/app-shell/nav-items.tsx`, `sidebar.tsx`, `topbar.tsx`, `user-menu.tsx`
- Create: `src/app/(authenticated)/layout.tsx`, `dashboard/page.tsx`

- [ ] **Step 1: Define nav items**

```tsx
// src/components/app-shell/nav-items.tsx
import { Home, FileText, Users, Bell, Settings, Shield, BookOpen } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  requiresHrAdmin?: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/solicitudes', label: 'Solicitudes', icon: FileText },
  { href: '/directorio', label: 'Directorio', icon: Users },
  { href: '/notificaciones', label: 'Notificaciones', icon: Bell },
  { href: '/ayuda', label: 'Ayuda', icon: BookOpen },
  { href: '/perfil', label: 'Mi perfil', icon: Settings },
  { href: '/admin', label: 'Admin', icon: Shield, requiresHrAdmin: true },
] as const;
```

- [ ] **Step 2: Create sidebar component**

```tsx
// src/components/app-shell/sidebar.tsx
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { NAV_ITEMS } from './nav-items';

export function AppSidebar({ isHrAdmin }: { isHrAdmin: boolean }) {
  const items = NAV_ITEMS.filter((item) => !item.requiresHrAdmin || isHrAdmin);
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border px-4 py-4">
        <Link href="/dashboard" className="font-bold text-lg text-primary">
          HumanOS
        </Link>
        <p className="text-xs text-muted-foreground">ICONSA</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
```

- [ ] **Step 3: Create user menu**

```tsx
// src/components/app-shell/user-menu.tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { logoutAction } from '@/app/(public)/login/actions';

export function UserMenu({ fullName, email, initials }: { fullName: string; email: string; initials: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="rounded-full focus-visible:ring-2 focus-visible:ring-ring outline-none">
          <Avatar className="size-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="text-sm font-medium">{fullName}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/perfil">Mi perfil</a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/settings">Configuracion</a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full text-left">Cerrar sesion</button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Create topbar**

```tsx
// src/components/app-shell/topbar.tsx
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserMenu } from './user-menu';

export function AppTopbar({ user }: { user: { full_name: string; email: string; initials: string } }) {
  return (
    <header className="h-14 border-b border-border bg-background flex items-center gap-3 px-4 sticky top-0 z-10">
      <SidebarTrigger />
      <div className="flex-1" />
      <UserMenu fullName={user.full_name} email={user.email} initials={user.initials} />
    </header>
  );
}
```

- [ ] **Step 5: Create authenticated layout**

```tsx
// src/app/(authenticated)/layout.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { AppSidebar } from '@/components/app-shell/sidebar';
import { AppTopbar } from '@/components/app-shell/topbar';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: person } = await supabase
    .from('people')
    .select('full_name, email, id')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (!person) {
    // Auth user exists but no hr.people link — onboarding incomplete
    redirect('/login?error=no_profile');
  }

  const { data: currentEmployment } = await supabase
    .from('employments')
    .select('app_role')
    .eq('person_id', person.id)
    .eq('is_current', true)
    .maybeSingle();

  const isHrAdmin = currentEmployment?.app_role === 'hr_admin';

  const displayUser = {
    full_name: person.full_name,
    email: person.email ?? user.email ?? '',
    initials: initialsOf(person.full_name),
  };

  return (
    <SidebarProvider>
      <AppSidebar isHrAdmin={isHrAdmin} />
      <div className="flex-1 flex flex-col min-h-screen">
        <AppTopbar user={displayUser} />
        <main className="flex-1 p-6">{children}</main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
```

- [ ] **Step 6: Create placeholder dashboard**

```tsx
// src/app/(authenticated)/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Inicio</h1>
      <p className="text-muted-foreground">
        Bienvenido a HumanOS. Selecciona una opcion en el menu lateral para comenzar.
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Update root page redirect**

Replace `src/app/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function RootPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? '/dashboard' : '/login');
}
```

- [ ] **Step 8: Update root layout metadata**

Replace `src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HumanOS - ICONSA',
  description: 'Portal interno de Recursos Humanos ICONSA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Verify typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 10: Commit**

```bash
git add src/components/app-shell src/app/\(authenticated\) src/app/layout.tsx src/app/page.tsx
git commit -m "feat(ui): AppShell layout (sidebar + topbar + user menu) + root redirects"
```

---

### Task 12: E2E test (auth flow)

**Files:**
- Create: `e2e/auth-flow.spec.ts`, `e2e/fixtures/test-users.ts`

**Prerequisites:**
- `.env.local` exists with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (production values; tests hit real BD)
- One bootstrap invite code consumed (e.g., Samantha via F1F3D92A) OR test creates ephemeral user via service role (skip for MVP - use real bootstrap user after Group 2 completes onboarding)

**Note:** Until Group 2 onboarding is complete, NO HumanOS auth.users exist. E2E for Task 12 will assert the DENIED paths (no user, MovimientOS-only user) which CAN be tested with existing 48 auth.users (all MovimientOS-only). Happy path E2E (auth login success) becomes meaningful after Group 2.

- [ ] **Step 1: Create test fixtures**

```ts
// e2e/fixtures/test-users.ts
// Placeholder for users created during Group 2 onboarding tests.
// For Group 1: test denied paths only.
export const NON_HUMANOS_USER = {
  email: 'placeholder-no-humanos@iconsanet.com',
  password: 'placeholder', // not used in Group 1 happy path
};
```

- [ ] **Step 2: Write E2E - login form renders**

```ts
// e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Auth flow', () => {
  test('login page renders with form fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'HumanOS' })).toBeVisible();
    await expect(page.getByLabel('Correo')).toBeVisible();
    await expect(page.getByLabel('Contrasena')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  });

  test('unauthenticated user hitting protected route is redirected to /login with next', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login\?next=%2Fdashboard/);
    await expect(page.getByRole('heading', { name: 'HumanOS' })).toBeVisible();
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo').fill('nope@example.com');
    await page.getByLabel('Contrasena').fill('wrongpassword');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('alert')).toContainText(/incorrectos|invalido/i);
  });

  test('?error=no_access shows the access denied message', async ({ page }) => {
    await page.goto('/login?error=no_access');
    await expect(page.getByRole('alert')).toContainText(/no tiene acceso/i);
  });

  test('root path redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login');
  });
});
```

- [ ] **Step 3: Run E2E**

Run: `npm run test:e2e`
Expected: 5 passed.

- [ ] **Step 4: Commit**

```bash
git add e2e/
git commit -m "test(e2e): auth flow denied paths + login form smoke test"
```

---

### Task 13: Verification gate + tag v0.0.1

**Files:**
- None (validation only)

- [ ] **Step 1: Run full verify**

Run: `npm run verify`
Expected: typecheck, lint, vitest, playwright, build all green.

- [ ] **Step 2: Run RLS validation (skill iconsa-rls-validation Q1/Q2)**

Via Supabase MCP execute_sql, run Q1 and Q2 from `.claude/skills/iconsa-rls-validation/SKILL.md`. Confirm 0 rows for both (no tables without RLS, no tables with RLS but zero policies).

- [ ] **Step 3: Update CHANGELOG**

Append to `docs/CHANGELOG.md` (create if missing):
```md
## v0.0.1 - 2026-05-27 - Group 1 Foundation

### Added
- Supabase Auth integration via @supabase/ssr (server + browser + middleware clients)
- Multi-app `allowed_apps` enforcement via middleware (R22, ADR-0001)
- shadcn/ui New York style + ICONSA palette tokens in Tailwind 4 @theme
- Login page (es-PA neutral, no voseo) with server action + error states
- AppShell layout: Sidebar + Topbar + UserMenu
- Test infrastructure: vitest (jsdom) + Playwright + coverage v8
- Generated Supabase database types for hr/requests/docs/workflows/audit/notifications/files/performance/learning

### Changed
- package.json: added scripts (test, test:watch, test:coverage, test:e2e, test:e2e:ui, verify)

### Notes
- E2E happy login path deferred to Group 2 (no humanOS auth.users yet)
- Dashboard page is placeholder; filled in Group 7
```

- [ ] **Step 4: Tag v0.0.1**

```bash
git add docs/CHANGELOG.md
git commit -m "docs(changelog): v0.0.1 Group 1 Foundation complete"
git tag -a v0.0.1 -m "Group 1 Foundation: auth + middleware + AppShell + test infra"
```

- [ ] **Step 5: Report**

Confirm with James:
- 0c132fb chore: commit HumanOS v2 foundation
- f071f92 docs: fix CARTA_TRABAJO
- + Group 1 commits + v0.0.1 tag

Ready to proceed to Group 2 (Onboarding F1 wizard + F4 admin empleados + F5 edit + F-04-01 medical/emergency).

---

## Self-Review

### Spec coverage
- F2 (login) ← Task 10
- F3 (AppShell) ← Task 11
- Cross-cutting decisions (ADRs 0001-0005) ← absorbed in Tasks 7, 9, headers
- Group 1 mini-grill (shadcn, middleware+RLS, test strategy) ← absorbed in Tasks 4-5, 9, 12

Not covered (deferred):
- F1 (sign-up wizard) → Group 2
- F4, F5 (admin empleados) → Group 2
- Dashboard content → Group 7

### Placeholder scan
None — all steps contain runnable commands or complete code blocks. Task 12 explicitly notes happy-path E2E is deferred; this is a documented decision, not a placeholder.

### Type consistency
- `userHasHumanOSAccess(user: User | null): boolean` used identically in middleware and login actions.
- `LoginResult` discriminated union shared between action and form component.
- `NavItem.requiresHrAdmin` filter on sidebar matches `hr.employments.app_role === 'hr_admin'` check in authenticated layout.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-27-group-1-foundation.md`.**

Two execution options:

1. **Subagent-Driven** - dispatch fresh subagent per task, review between tasks, fast iteration (per `superpowers:subagent-driven-development`)
2. **Inline Execution** - execute tasks in this session (per `superpowers:executing-plans`), batch with checkpoints

Recommended for this overnight: **Inline Execution** — context is heavily shared (cross-cutting decisions, ICONSA conventions, BD state), subagent dispatch would re-load all that per task and balloon costs. Subagent dispatch is more valuable in Groups 5-6 where each form variant is more self-contained.

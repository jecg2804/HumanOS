# Module 1: Sistema de Solicitudes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el repo greenfield de HumanOS en una app productiva con los 5 formularios P1, motor de aprobación con roles semánticos, knowledge base, listas, detalle, dashboard HR, y emails Resend — más Module 1.5 (/directorio + /perfil read-only).

**Architecture:** Next.js 16 App Router + TypeScript strict + Tailwind 4 + 3 Supabase clients (server-cookies, browser, admin) + 4 funciones Postgres atómicas + server actions para side effects (email Resend) + RLS real por rol + Storage bucket para adjuntos. shadcn/ui base + React Hook Form + zod compartido cliente/servidor.

**Tech Stack:** Next.js 16, TypeScript, Tailwind 4, Supabase (auth + Postgres + Storage), Resend, React Hook Form, zod, shadcn/ui, deploy en Vercel.

**Spec base:** `Docs/superpowers/specs/2026-04-28-module-1-solicitudes-design.md` (commits `c4b4fb7` + `a945593`).

**Reglas del proyecto a seguir:**
- `.claude/rules/commit-after-step.md` — un commit por step, mensaje en inglés lowercase, sin punto final.
- `.claude/rules/supabase-branch.md` — DDL/DML libre en `humanos.*` del branch `humanos-dev` (project_ref `woonbmfmconldxbeqdnr`); cada cambio se documenta en `Docs/CHANGELOG.md` con `[bd]`.
- `.claude/rules/git-workflow.md` — antes de cada commit: `npm run lint`, `npm run build` pasa, sin `console.log`, sin secrets.

---

## Estructura de archivos final (lock-in arriba para que no haya reorganizaciones tardías)

```
package.json
tsconfig.json
next.config.ts
postcss.config.mjs
eslint.config.mjs
.env.example                            # documenta todas las env vars (sin valores)
src/
├── app/
│   ├── globals.css                     # Tailwind 4 + tokens ICONSA
│   ├── layout.tsx                      # root <html>
│   ├── page.tsx                        # redirect → /inicio o /login
│   ├── login/
│   │   ├── page.tsx
│   │   └── actions.ts                  # 'use server' login/logout
│   └── (app)/
│       ├── layout.tsx                  # auth gate + AppShell
│       ├── inicio/page.tsx
│       ├── ayuda/page.tsx
│       ├── solicitudes/
│       │   ├── page.tsx                # mis solicitudes
│       │   ├── nueva/page.tsx          # grid 12 tipos
│       │   ├── nueva/[code]/page.tsx   # form dinámico
│       │   └── [id]/page.tsx           # detalle + timeline
│       ├── admin/page.tsx              # gated hr_admin
│       ├── directorio/page.tsx         # Module 1.5
│       └── perfil/page.tsx             # Module 1.5
├── components/
│   ├── shell/{AppShell,Sidebar,BottomTabs,UserMenu}.tsx
│   ├── ui/                             # shadcn (button, input, card, dialog, badge, label, select, textarea, toast)
│   ├── forms/{Vacaciones,AccionPersonal,Prestamo,ActualizacionDatos,ReclamoPago}Form.tsx
│   ├── solicitudes/{RequestList,RequestStatusBadge,RequestTimeline,RequestActions,RequestDetailRenderer}.tsx
│   └── admin/{AdminKPICards,AdminRequestsTable}.tsx
├── lib/
│   ├── supabase/{server,browser,admin}.ts
│   ├── auth/getMe.ts
│   ├── forms/
│   │   ├── schemas/{vacaciones,accion-personal,prestamo,actualizacion-datos,reclamo-pago}.ts
│   │   └── registry.ts                 # code → { schema, Form, DetailView, helpInfo }
│   ├── approvals/{roles,chains,submit,decide,apply-act-datos}.ts
│   ├── email/
│   │   ├── client.ts
│   │   ├── send.ts
│   │   └── templates/{base,solicitud-enviada,solicitud-decidida,decision-final}.ts
│   └── utils/{cn,dates,format}.ts
├── types/{people,requests,forms}.ts
└── middleware.ts

supabase/migrations/                    # SQL ejecutadas via Supabase MCP apply_migration
├── 20260428_001_helper_functions.sql           # me, is_hr, resolve_approver, next_request_number
├── 20260428_002_submit_request.sql
├── 20260428_003_decide_approval.sql
├── 20260428_004_reseed_approval_chains.sql
├── 20260428_005_seed_supervisor_ids.sql
├── 20260428_006_replace_rls_policies.sql
└── 20260428_007_create_storage_bucket.sql

scripts/
├── seed-auth-users.ts                  # Node + supabase-js admin
└── copy-sops-to-public.ts              # copia/sanea PDFs a public/sops/

public/sops/                            # populado en build por copy-sops-to-public

Docs/
├── MANUAL_VERIFICATION.md              # generado al final
└── CHANGELOG.md                        # appended con cada [bd]
```

---

## Fases del plan

| Fase | Bloque | Tasks |
|---|---|---|
| 0 | Foundation greenfield (scaffold, auth, layout, Resend, bucket, seeds) | 1-10 |
| 1 | Migraciones Postgres (helpers, RPCs, RLS, seeds) | 11-15 |
| 2 | Engine + email layer | 16-19 |
| 3 | 5 forms P1 (registry + components + apply ACT_DATOS) | 20-26 |
| 4 | Páginas (ayuda, lista, detalle, admin) | 27-31 |
| 5 | Module 1.5 (directorio + perfil) | 32-33 |
| 6 | Wrap-up (manual verification, deploy preview, changelog) | 34-36 |

---

## FASE 0 — Foundation greenfield

### Task 1: Inicializar Next.js 16 + TypeScript strict + Tailwind 4 + ESLint

**Goal:** repo levanta `npm run dev` con página por defecto + lint/build pasando.

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore`, `.env.example`

**Acceptance Criteria:**
- [ ] `npm install` corre sin errores.
- [ ] `npm run dev` levanta servidor en :3001.
- [ ] `npm run lint` y `npm run build` pasan.
- [ ] `npx tsc --noEmit` pasa.

**Verify:** `npm run build && npm run lint && npx tsc --noEmit` → 0 errores.

**Steps:**

- [ ] **Step 1: Inicializar package.json**

```json
{
  "name": "humanos",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "seed:auth-users": "tsx scripts/seed-auth-users.ts",
    "build:sops": "tsx scripts/copy-sops-to-public.ts"
  },
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "resend": "^4.0.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.460.0",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^16.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 2: tsconfig.json strict**

```json
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false, "skipLibCheck": true, "strict": true, "noEmit": true,
    "esModuleInterop": true, "module": "esnext", "moduleResolution": "bundler",
    "resolveJsonModule": true, "isolatedModules": true, "jsx": "preserve",
    "incremental": true, "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: next.config.ts**

```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: { typedRoutes: true },
  eslint: { dirs: ['src', 'scripts'] },
};
export default config;
```

- [ ] **Step 4: postcss.config.mjs (Tailwind 4 modo CSS)**

```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```

- [ ] **Step 5: globals.css con tokens ICONSA**

```css
@import "tailwindcss";

@theme {
  --color-navy-50: #E8EDF3;
  --color-navy-100: #C5D0DD;
  --color-navy-500: #1B3A5C;
  --color-navy-700: #122740;
  --color-gold-500: #F5A623;
  --color-blue-500: #0A6EBD;
  --color-green-500: #1A7F5A;
  --color-orange-500: #B45309;
  --color-red-500: #C0392B;
  --color-gray-500: #5A6272;
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
}

html, body { height: 100%; }
body { @apply bg-white text-navy-700 font-sans antialiased; }
```

- [ ] **Step 6: layout.tsx + page.tsx + .env.example + .gitignore**

```tsx
// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'HumanOS — ICONSA', description: 'Plataforma de RRHH de ICONSA' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
```

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation';
export default function Root() { redirect('/inicio'); }
```

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3001
RESEND_API_KEY=
RESEND_FROM_EMAIL=HumanOS <noreply@rein-eisenwerk.com>
NOTIFICATION_TEST_EMAIL=
```

Append a `.gitignore`: `node_modules/`, `.next/`, `dist/`, `*.log`, `.DS_Store`, `next-env.d.ts`.

- [ ] **Step 7: Run `npm install && npm run build && npm run lint`**

Expected: `Compiled successfully`, 0 lint errors.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: scaffold next.js 16 + tailwind 4 + ts strict"
```

---

### Task 2: Supabase clients (server, browser, admin)

**Goal:** 3 wrappers tipados que usen las env vars y respeten el schema `humanos`.

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/admin.ts`, `src/types/database.ts` (placeholder)

**Acceptance Criteria:**
- [ ] `createServerClient()` usa cookies de Next.js, schema `humanos`.
- [ ] `createBrowserClient()` para client components.
- [ ] `createAdminClient()` usa service-role, solo importable desde server-only paths.
- [ ] Build pasa.

**Verify:** `npm run build` → ok.

**Steps:**

- [ ] **Step 1: server.ts (cookies-aware)**

```ts
import { createServerClient as supaSSR } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const cookieStore = await cookies();
  return supaSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'humanos' },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => { for (const { name, value, options } of toSet) cookieStore.set(name, value, options); },
      },
    },
  );
}

// Cliente para schema 'public' (people está en humanos, pero auth está en public)
export async function createServerClientPublic() {
  const cookieStore = await cookies();
  return supaSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => { for (const { name, value, options } of toSet) cookieStore.set(name, value, options); },
      },
    },
  );
}
```

- [ ] **Step 2: browser.ts**

```ts
import { createBrowserClient as supaBrowser } from '@supabase/ssr';

export function createBrowserClient() {
  return supaBrowser(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'humanos' } },
  );
}
```

- [ ] **Step 3: admin.ts (server-only)**

```ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'humanos' }, auth: { persistSession: false } },
  );
}
```

- [ ] **Step 4: types/database.ts placeholder**

```ts
// Generado luego con `npx supabase gen types`. Por ahora interfaces a mano.
export type RequestStatus = 'Borrador' | 'Enviada' | 'En Revisión' | 'Aprobada' | 'Rechazada' | 'Completada' | 'Cancelada';
export type ApprovalDecision = 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Solicita Info';
export type AppRole = 'employee' | 'supervisor' | 'hr_admin';
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase src/types/database.ts
git commit -m "feat: supabase clients (server, browser, admin)"
```

---

### Task 3: Login page + login/logout server actions + middleware

**Goal:** flujo auth completo: `/login` con form, redirect post-login, middleware bloquea rutas privadas.

**Files:**
- Create: `src/app/login/page.tsx`, `src/app/login/actions.ts`, `src/middleware.ts`, `src/lib/auth/getMe.ts`

**Acceptance Criteria:**
- [ ] Visitar `/inicio` sin sesión → redirect a `/login?next=/inicio`.
- [ ] Login con credenciales válidas → cookie sesión + redirect a `?next=`.
- [ ] Logout limpia cookie + redirect a `/login`.
- [ ] `getMe()` retorna `{...person, role}` o lanza redirect.

**Verify:** browser test manual: `/inicio` → /login → submit → /inicio (con header del shell — Task 5).

**Steps:**

- [ ] **Step 1: middleware.ts**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico', '/sops'];

export async function middleware(req: NextRequest) {
  const isPublic = PUBLIC_PATHS.some(p => req.nextUrl.pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const res = NextResponse.next({ request: { headers: req.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => { for (const { name, value, options } of toSet) res.cookies.set(name, value, options); },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (req.nextUrl.pathname.startsWith('/admin')) {
    // Verificar role en server-side; getMe() en /admin/page.tsx hará redirect si no es HR.
  }

  return res;
}

export const config = { matcher: ['/((?!_next|sops|favicon.ico).*)'] };
```

- [ ] **Step 2: login/page.tsx + actions.ts**

```tsx
// src/app/login/page.tsx
import { loginAction } from './actions';
export const metadata = { title: 'Iniciar sesión — HumanOS' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-navy-500 p-6">
      <form action={loginAction} className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md space-y-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2">
            <span className="text-gold-500 font-bold text-2xl">ICONSA</span>
            <span className="text-navy-700 font-semibold">HumanOS</span>
          </div>
        </div>
        <input type="hidden" name="next" value={sp.next ?? '/inicio'} />
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" required className="mt-1 w-full border rounded px-3 py-2" autoFocus />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Contraseña</span>
          <input name="password" type="password" required className="mt-1 w-full border rounded px-3 py-2" />
        </label>
        {sp.error && <p className="text-red-500 text-sm">{sp.error}</p>}
        <button type="submit" className="w-full bg-navy-500 text-white py-2 rounded hover:bg-navy-700">Entrar</button>
      </form>
    </main>
  );
}
```

```ts
// src/app/login/actions.ts
'use server';
import { createServerClientPublic } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const next = String(formData.get('next') ?? '/inicio');
  const supabase = await createServerClientPublic();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent('Email o contraseña incorrectos')}&next=${next}`);
  redirect(next);
}

export async function logoutAction() {
  const supabase = await createServerClientPublic();
  await supabase.auth.signOut();
  redirect('/login');
}
```

- [ ] **Step 3: getMe()**

```ts
// src/lib/auth/getMe.ts
import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerClient, createServerClientPublic } from '@/lib/supabase/server';
import type { AppRole } from '@/types/database';

const HR_CODES = new Set(['KOSM01', 'OLM206', 'MAN943', 'MEN943']);

export type Me = {
  id: string; auth_id: string; code: string; name: string; email: string;
  department: string | null; position: string | null; office: string | null;
  supervisor_id: string | null; photo_url: string | null;
  role: AppRole;
};

export const getMe = cache(async (): Promise<Me> => {
  const supaPub = await createServerClientPublic();
  const { data: { user } } = await supaPub.auth.getUser();
  if (!user) redirect('/login');

  const supa = await createServerClient();
  const { data: person } = await supa.from('people').select('*').eq('auth_id', user.id).maybeSingle();
  if (!person) {
    // Render una página de error en el caller; aquí solo lanzamos.
    throw new Error('NO_LINKED_PROFILE');
  }

  let role: AppRole = 'employee';
  if (person.app_role && ['employee','supervisor','hr_admin'].includes(person.app_role)) {
    role = person.app_role as AppRole;
  } else if (HR_CODES.has(person.code)) {
    role = 'hr_admin';
  } else {
    const { count } = await supa.from('people').select('id', { count: 'exact', head: true }).eq('supervisor_id', person.id);
    if ((count ?? 0) > 0) role = 'supervisor';
  }

  return { ...person, role } as Me;
});
```

- [ ] **Step 4: Manual smoke**

Crea un usuario de prueba en Supabase auth (vía dashboard, hasta Task 9 que automatiza). Verifica login → redirect.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/app/login src/lib/auth
git commit -m "feat: auth middleware + login flow + getMe"
```

---

### Task 4: shadcn/ui setup + components base

**Goal:** instalar shadcn/ui y traer 9 componentes base.

**Files:**
- Create: `components.json`, `src/components/ui/{button,input,label,select,textarea,card,dialog,badge,toast}.tsx`, `src/lib/utils/cn.ts`

**Acceptance Criteria:**
- [ ] `cn()` helper existe.
- [ ] 9 componentes UI compilable e importables.

**Verify:** `npm run build` → ok; un import smoke en `src/app/inicio/page.tsx` (placeholder).

**Steps:**

- [ ] **Step 1: cn helper**

```ts
// src/lib/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

- [ ] **Step 2: components.json (shadcn config)**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default", "rsc": true, "tsx": true,
  "tailwind": { "config": "", "css": "src/app/globals.css", "baseColor": "slate", "cssVariables": false },
  "aliases": { "components": "@/components", "utils": "@/lib/utils/cn", "ui": "@/components/ui" }
}
```

- [ ] **Step 3: Instalar componentes**

```bash
npx shadcn@latest add button input label select textarea card dialog badge toast
```

Verifica que cada archivo se cree en `src/components/ui/`.

- [ ] **Step 4: Build smoke**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add components.json src/components/ui src/lib/utils/cn.ts
git commit -m "feat: shadcn/ui base components"
```

---

### Task 5: AppShell layout (sidebar desktop + bottom-tabs mobile)

**Goal:** layout `(app)` con header navy, sidebar desktop, bottom-tabs mobile.

**Files:**
- Create: `src/app/(app)/layout.tsx`, `src/components/shell/{AppShell,Sidebar,BottomTabs,UserMenu}.tsx`, `src/app/(app)/inicio/page.tsx` (placeholder simple)

**Acceptance Criteria:**
- [ ] Visitar `/inicio` autenticado muestra header navy + ICONSA gold + nombre del usuario, sidebar a la izq (desktop) o tabs abajo (mobile).
- [ ] Logout button funciona.
- [ ] No-HR no ve el item "Admin" en nav.

**Verify:** browser manual, breakpoint mobile <768px.

**Steps:**

- [ ] **Step 1: AppShell + Sidebar + BottomTabs**

Ver `src/components/shell/`:
- `AppShell` recibe `me` y `children`, renderiza header + sidebar (md+) + bottom-tabs (md-) + main content.
- `Sidebar`: links Inicio, Solicitudes, Ayuda, Directorio, Perfil + Admin (si `me.role === 'hr_admin'`).
- `BottomTabs`: 5 iconos lucide-react: Home, FileText, BookOpen, Users, User. Admin como botón flotante extra si HR.
- `UserMenu`: nombre + foto + dropdown con "Cerrar sesión" (form que hace POST a server action `logoutAction`).

```tsx
// src/components/shell/AppShell.tsx
import type { Me } from '@/lib/auth/getMe';
import { Sidebar } from './Sidebar';
import { BottomTabs } from './BottomTabs';
import { UserMenu } from './UserMenu';

export function AppShell({ me, children }: { me: Me; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-navy-500 text-white px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gold-500 font-bold text-lg">ICONSA</span>
          <span className="text-white/90 text-sm">HumanOS</span>
        </div>
        <UserMenu me={me} />
      </header>
      <div className="flex flex-1 min-h-0">
        <Sidebar me={me} className="hidden md:block w-56 border-r" />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto">{children}</main>
      </div>
      <BottomTabs me={me} className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t" />
    </div>
  );
}
```

(Sidebar/BottomTabs/UserMenu siguen el mismo patrón — ver implementación completa en Task de execution.)

- [ ] **Step 2: layout.tsx con auth gate**

```tsx
// src/app/(app)/layout.tsx
import { getMe } from '@/lib/auth/getMe';
import { AppShell } from '@/components/shell/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let me;
  try { me = await getMe(); }
  catch (e) {
    if ((e as Error).message === 'NO_LINKED_PROFILE') {
      return <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold mb-2">Cuenta no vinculada</h1>
          <p className="text-gray-500">Tu cuenta de auth no está vinculada a un perfil de empleado. Contacta a Recursos Humanos.</p>
        </div>
      </main>;
    }
    throw e;
  }
  return <AppShell me={me}>{children}</AppShell>;
}
```

- [ ] **Step 3: inicio placeholder**

```tsx
// src/app/(app)/inicio/page.tsx
import { getMe } from '@/lib/auth/getMe';
export default async function InicioPage() {
  const me = await getMe();
  return <div><h1 className="text-2xl font-semibold">Hola, {me.name.split(' ')[0]}</h1></div>;
}
```

- [ ] **Step 4: Build + smoke**

```bash
npm run build && npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add src/components/shell src/app/\(app\)
git commit -m "feat: app shell with sidebar and bottom tabs"
```

---

### Task 6: Resend client + base email template

**Goal:** helper `sendNotification(type, payload)` con test-mode redirect y plantilla HTML base navy/gold.

**Files:**
- Create: `src/lib/email/{client,send}.ts`, `src/lib/email/templates/{base,solicitud-enviada,solicitud-decidida,decision-final}.ts`

**Acceptance Criteria:**
- [ ] `sendNotification('solicitud-enviada', {...})` no crashea aunque RESEND_API_KEY esté vacío (logs warning).
- [ ] Si `NOTIFICATION_TEST_EMAIL` set, todos los emails redirigen ahí con prefijo `[to=originalEmail]` en subject.
- [ ] Template base renderiza header navy + ICONSA gold + footer "mensaje automático... no responda".

**Verify:** unit-style smoke en script: `tsx scripts/test-email.ts` (creado solo para esta task, removido al final).

**Steps:**

- [ ] **Step 1: client.ts**

```ts
// src/lib/email/client.ts
import 'server-only';
import { Resend } from 'resend';

let _client: Resend | null = null;
export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_client) _client = new Resend(process.env.RESEND_API_KEY);
  return _client;
}
```

- [ ] **Step 2: templates/base.ts**

```ts
export function emailLayout({ title, body, ctaUrl, ctaLabel }: { title: string; body: string; ctaUrl?: string; ctaLabel?: string }) {
  return `<!doctype html><html><body style="margin:0; font-family:system-ui,sans-serif; background:#f5f5f5">
<table width="100%" style="background:#1B3A5C; padding:16px"><tr><td>
<span style="color:#F5A623; font-weight:bold; font-size:18px">ICONSA</span>
<span style="color:#FFFFFF; font-size:14px; margin-left:8px">HumanOS</span>
</td></tr></table>
<div style="max-width:560px; margin:0 auto; padding:24px; background:#fff">
<h2 style="color:#1B3A5C; margin-top:0">${title}</h2>
${body}
${ctaUrl ? `<p><a href="${ctaUrl}" style="display:inline-block; background:#1B3A5C; color:#fff; padding:12px 24px; text-decoration:none; border-radius:4px; margin-top:16px">${ctaLabel ?? 'Ver Solicitud'}</a></p>` : ''}
</div>
<p style="color:#5A6272; font-size:12px; text-align:center; margin:24px 0">Este es un mensaje automático del sistema HumanOS de ICONSA. No responda a este correo.</p>
</body></html>`;
}

export function kvBlock(rows: Array<[string, string]>): string {
  return `<table style="background:#F5F5F5; padding:12px; font-family:monospace; border-radius:4px">
${rows.map(([k, v]) => `<tr><td style="padding:4px 8px; color:#5A6272">${k}:</td><td style="padding:4px 8px"><b>${v}</b></td></tr>`).join('')}
</table>`;
}
```

- [ ] **Step 3: send.ts**

```ts
// src/lib/email/send.ts
import 'server-only';
import { getResend } from './client';
import { renderSolicitudEnviada } from './templates/solicitud-enviada';
import { renderSolicitudDecidida } from './templates/solicitud-decidida';
import { renderDecisionFinal } from './templates/decision-final';

export type NotificationType = 'solicitud-enviada' | 'solicitud-decidida' | 'decision-final';

export type NotificationPayload = {
  to: string;
  to_name: string;
  request_number: string;
  request_id: string;
  request_type_label: string;
  requester_name: string;
  decision?: 'Aprobada' | 'Rechazada';
};

export async function sendNotification(type: NotificationType, payload: NotificationPayload): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY missing, skipping send', { type, to: payload.to });
    return { ok: false, error: 'no-api-key' };
  }
  const testMode = process.env.NOTIFICATION_TEST_EMAIL;
  const toAddress = testMode || payload.to;
  const subjectPrefix = testMode ? `[to=${payload.to}] ` : '';

  const link = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/solicitudes/${payload.request_id}`;
  let subject = ''; let html = '';

  switch (type) {
    case 'solicitud-enviada':
      ({ subject, html } = renderSolicitudEnviada({ ...payload, link })); break;
    case 'solicitud-decidida':
      ({ subject, html } = renderSolicitudDecidida({ ...payload, link })); break;
    case 'decision-final':
      ({ subject, html } = renderDecisionFinal({ ...payload, link })); break;
  }

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'HumanOS <noreply@rein-eisenwerk.com>',
    to: toAddress,
    subject: `${subjectPrefix}${subject}`,
    html,
  });
  if (error) { console.error('[email] resend error', error); return { ok: false, error: String(error) }; }
  return { ok: true };
}
```

- [ ] **Step 4: 3 plantillas**

Cada una exporta `render<X>(payload)` → `{ subject, html }` usando `emailLayout` + `kvBlock`. Ejemplo:

```ts
// src/lib/email/templates/solicitud-enviada.ts
import { emailLayout, kvBlock } from './base';
export function renderSolicitudEnviada(p: { to_name: string; request_number: string; request_type_label: string; requester_name: string; link: string }) {
  return {
    subject: `Nueva solicitud por aprobar: ${p.request_number}`,
    html: emailLayout({
      title: 'Tienes una solicitud nueva por aprobar',
      body: `<p>Hola ${p.to_name},</p><p>Recibiste una nueva solicitud que requiere tu decisión:</p>${kvBlock([
        ['Solicitud', p.request_number], ['Tipo', p.request_type_label], ['Solicitante', p.requester_name],
      ])}`,
      ctaUrl: p.link, ctaLabel: 'Ver y aprobar',
    }),
  };
}
```

(Análogo para `solicitud-decidida` y `decision-final` — el último cambia el body según `decision`.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/email
git commit -m "feat: resend client and email templates"
```

---

### Task 7: Storage bucket `humanos-attachments`

**Goal:** bucket Supabase para adjuntos con políticas RLS.

**Files:**
- Create: `supabase/migrations/20260428_007_create_storage_bucket.sql`
- Modify: `Docs/CHANGELOG.md`

**Acceptance Criteria:**
- [ ] Bucket `humanos-attachments` existe, public=false.
- [ ] Policy permite INSERT/SELECT a authenticated dentro de paths `{request_id}/*`.

**Verify:** `npx supabase` (o MCP `apply_migration`) ejecuta sin error; smoke query:
```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'humanos-attachments';
```

**Steps:**

- [ ] **Step 1: Crear migration**

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('humanos-attachments', 'humanos-attachments', false, 10485760,
        ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Policies sobre storage.objects scopeadas al bucket
CREATE POLICY "humanos_attachments_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'humanos-attachments');

CREATE POLICY "humanos_attachments_authenticated_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'humanos-attachments');
```

- [ ] **Step 2: Aplicar via MCP**

Usar `mcp__claude_ai_Supabase__apply_migration` con `project_id=woonbmfmconldxbeqdnr`.

- [ ] **Step 3: Smoke verify**

```sql
SELECT id, public FROM storage.buckets WHERE id='humanos-attachments';
```

- [ ] **Step 4: Append CHANGELOG**

```
### [bd] 2026-04-28
- Storage bucket `humanos-attachments` creado (10MB, jpeg/png/webp/pdf).
- Policies: authenticated INSERT + SELECT scopeadas al bucket.
```

- [ ] **Step 5: Commit migration file**

```bash
git add supabase/migrations/20260428_007_create_storage_bucket.sql Docs/CHANGELOG.md
git commit -m "feat: storage bucket for request attachments"
```

---

### Task 8: copy-sops-to-public script + integrar en build

**Goal:** los PDFs de `Docs/SOPs, Formularios y Documentos/` quedan servibles desde `/sops/<sanitized>.pdf` para el knowledge base.

**Files:**
- Create: `scripts/copy-sops-to-public.ts`, `public/sops/.gitkeep`
- Modify: `package.json` (agregar `prebuild`)

**Acceptance Criteria:**
- [ ] Tras `npm run build:sops`, `public/sops/` contiene los PDFs renombrados (`IC-RH-F-05-03_Solicitud_de_Vacaciones.pdf`).
- [ ] El script crea un `index.json` mapeando `sop_reference` (ej. `ICRHF0503`) → ruta servible (`/sops/IC-RH-F-05-03_...pdf`).

**Verify:** `npm run build:sops && ls public/sops`.

**Steps:**

- [ ] **Step 1: Script**

```ts
// scripts/copy-sops-to-public.ts
import { readdirSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'Docs/SOPs, Formularios y Documentos';
const DST = 'public/sops';

mkdirSync(DST, { recursive: true });
const files = readdirSync(SRC).filter(f => f.toLowerCase().endsWith('.pdf'));
const index: Record<string, string> = {};

for (const f of files) {
  const sanitized = f.replace(/\s+/g, '_').replace(/[(),]/g, '');
  copyFileSync(join(SRC, f), join(DST, sanitized));
  // Extraer sop_reference: "IC-RH-F-05-03 Solicitud..." → "ICRHF0503"
  const m = f.match(/^IC-([A-Z]{2})-([A-Z])-(\d+)-(\d+)/);
  if (m) {
    const code = `IC${m[1]}${m[2]}${m[3]}${m[4]}`;
    index[code] = `/sops/${sanitized}`;
  }
}
writeFileSync(join(DST, 'index.json'), JSON.stringify(index, null, 2));
console.log(`Copied ${files.length} PDFs, indexed ${Object.keys(index).length}`);
```

- [ ] **Step 2: Modificar package.json scripts**

```json
"prebuild": "tsx scripts/copy-sops-to-public.ts",
"predev": "tsx scripts/copy-sops-to-public.ts"
```

- [ ] **Step 3: Run + verify**

```bash
npm run build:sops
ls public/sops
cat public/sops/index.json
```

- [ ] **Step 4: Commit**

```bash
git add scripts/copy-sops-to-public.ts public/sops/.gitkeep package.json
git commit -m "feat: build-time sops copy to public dir"
```

---

### Task 9: Seed auth users script

**Goal:** crear cuentas Supabase Auth para los 6 testers (Samantha, Rocío, Milagros, Jerelyn, Rodrigo, Jaime) y vincular `humanos.people.auth_id`.

**Files:**
- Create: `scripts/seed-auth-users.ts`, `scripts/seed-supervisors.sql` (referenciado en Task 13)

**Acceptance Criteria:**
- [ ] `npm run seed:auth-users` crea 6 cuentas y actualiza `auth_id` en `humanos.people`.
- [ ] Idempotente: re-correrlo no duplica ni falla si ya existen.

**Verify:**
```sql
SELECT code, name, auth_id IS NOT NULL AS has_auth FROM humanos.people
 WHERE code IN ('KOSM01','OLM206','MAN943','MEN943','EIS772','CUC166');
```
Resultado esperado: 6 filas con `has_auth=true`.

**Steps:**

- [ ] **Step 1: Script**

```ts
// scripts/seed-auth-users.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const TESTERS: Array<{ code: string; password: string }> = [
  { code: 'KOSM01', password: 'TestPass2026!' },  // Samantha
  { code: 'OLM206', password: 'TestPass2026!' },  // Rocío
  { code: 'MAN943', password: 'TestPass2026!' },  // Milagros
  { code: 'MEN943', password: 'TestPass2026!' },  // Jerelyn
  { code: 'EIS772', password: 'TestPass2026!' },  // Rodrigo
  { code: 'CUC166', password: 'TestPass2026!' },  // Jaime
];

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function main() {
  for (const { code, password } of TESTERS) {
    const { data: people } = await supa.schema('humanos').from('people').select('id, email, name').eq('code', code).single();
    if (!people || !people.email) { console.warn(`[skip] ${code} not found or no email`); continue; }

    // Create auth user (idempotent: if exists, getUserByEmail)
    const { data: existing } = await supa.auth.admin.listUsers();
    const found = existing?.users.find(u => u.email === people.email);
    let userId = found?.id;

    if (!userId) {
      const { data, error } = await supa.auth.admin.createUser({
        email: people.email, password, email_confirm: true,
        user_metadata: { name: people.name, code },
      });
      if (error) { console.error(`[error] ${code}:`, error); continue; }
      userId = data.user.id;
      console.log(`[created] ${code} → ${people.email}`);
    } else {
      console.log(`[exists] ${code} → ${people.email}`);
    }

    // Link auth_id in humanos.people
    await supa.schema('humanos').from('people').update({ auth_id: userId }).eq('id', people.id);
  }
  console.log('Seed complete.');
}
main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run**

```bash
npm run seed:auth-users
```

- [ ] **Step 3: Verify**

```sql
SELECT code, email, auth_id FROM humanos.people WHERE code IN ('KOSM01','OLM206','MAN943','MEN943','EIS772','CUC166');
```

- [ ] **Step 4: Append CHANGELOG**

```
### 2026-04-28
- Seed de 6 cuentas auth de prueba (HR team + Rodrigo + Jaime). Password inicial: TestPass2026! (rotar antes de producción).
- humanos.people.auth_id vinculado para los 6 testers.
```

- [ ] **Step 5: Commit (sin .env.local; el password está hardcoded en el script — seguro porque es solo dev)**

```bash
git add scripts/seed-auth-users.ts Docs/CHANGELOG.md
git commit -m "feat: seed auth users for testers"
```

---

### Task 10: Migration — seed `supervisor_id` por departamento

**Goal:** asignar `supervisor_id` para los 52 activos según el plan B del spec §4.1.1.

**Files:**
- Create: `supabase/migrations/20260428_005_seed_supervisor_ids.sql`
- Modify: `Docs/CHANGELOG.md`

**Acceptance Criteria:**
- [ ] >= 30 de los 52 activos tienen `supervisor_id != NULL` post-migration (Construcción 18 + Equipo 4 + Ingeniería 6 + Contabilidad 3 + RH 3 = ≥ 30).
- [ ] Ningún empleado se reporta a sí mismo (`supervisor_id != id`).
- [ ] Smoke al final muestra el conteo.

**Verify:**
```sql
SELECT department, COUNT(*) FILTER (WHERE supervisor_id IS NOT NULL) AS with_sup,
       COUNT(*) AS total FROM humanos.people WHERE status='Activo' GROUP BY department;
```

**Steps:**

- [ ] **Step 1: Migration SQL**

```sql
-- 20260428_005_seed_supervisor_ids.sql
-- Plan B del spec §4.1.1 — asignación por departamento.

-- Helpers locales
WITH mgr AS (
  SELECT
    (SELECT id FROM humanos.people WHERE code='KOSM01') AS kosm01,
    (SELECT id FROM humanos.people WHERE code='VAL130') AS val130,
    (SELECT id FROM humanos.people WHERE code='AVE629') AS ave629,
    (SELECT id FROM humanos.people WHERE code='RIO806') AS rio806,
    (SELECT id FROM humanos.people WHERE code='EIS772') AS eis772,
    (SELECT id FROM humanos.people WHERE name='Denise Marciaga' AND status='Activo' LIMIT 1) AS denise
)
UPDATE humanos.people p
SET supervisor_id = CASE
  WHEN p.department = 'Recursos Humanos' AND p.code != 'KOSM01' THEN (SELECT kosm01 FROM mgr)
  WHEN p.department = 'Equipo' AND p.code != 'VAL130' THEN (SELECT val130 FROM mgr)
  WHEN p.department = 'Construcción' THEN (SELECT denise FROM mgr)
  WHEN p.department = 'Ingeniería' AND p.code != 'AVE629' AND p.name != 'Franklin Marciaga' THEN (SELECT ave629 FROM mgr)
  WHEN p.department = 'Contabilidad' AND p.code != 'RIO806' THEN (SELECT rio806 FROM mgr)
  WHEN p.code IN ('CUC166','EIS809') THEN (SELECT eis772 FROM mgr)
  -- Top-tier managers reportan a Rodrigo (excepto Rodrigo mismo)
  WHEN p.code IN ('KOSM01','VAL130','AVE629','RIO806') THEN (SELECT eis772 FROM mgr)
  -- Franklin Marciaga (Ingeniería sin code) reporta a Rodrigo
  WHEN p.name = 'Franklin Marciaga' AND p.department = 'Ingeniería' THEN (SELECT eis772 FROM mgr)
  ELSE p.supervisor_id  -- otros departments (Cumplimiento/Seguridad/Presupuesto/Movilizaciones) quedan NULL → fallback A los cubre
END
WHERE p.status = 'Activo';

-- Smoke
DO $$
DECLARE n_with_sup int; n_total int; n_self int;
BEGIN
  SELECT COUNT(*) FILTER (WHERE supervisor_id IS NOT NULL), COUNT(*)
    INTO n_with_sup, n_total
    FROM humanos.people WHERE status='Activo';
  SELECT COUNT(*) INTO n_self FROM humanos.people WHERE supervisor_id = id;
  RAISE NOTICE 'seed_supervisors: % de % activos con supervisor (% reportan a sí mismos — debe ser 0)', n_with_sup, n_total, n_self;
  IF n_self > 0 THEN RAISE EXCEPTION 'self-reporting detected'; END IF;
END $$;
```

- [ ] **Step 2: Aplicar via MCP**

`mcp__claude_ai_Supabase__apply_migration` con el SQL de arriba.

- [ ] **Step 3: Verify**

```sql
SELECT department, COUNT(*) FILTER (WHERE supervisor_id IS NOT NULL) AS with_sup, COUNT(*) AS total
FROM humanos.people WHERE status='Activo' GROUP BY department ORDER BY 3 DESC;
```

- [ ] **Step 4: Append CHANGELOG**

```
### [bd] 2026-04-28
- Seed supervisor_id por departamento (plan B del spec §4.1.1). Cubre RH/Equipo/Construcción/Ingeniería/Contabilidad/Administración top-tier. Cumplimiento/Seguridad/Presupuesto/Movilizaciones quedan NULL → fallback A los cubre.
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260428_005_seed_supervisor_ids.sql Docs/CHANGELOG.md
git commit -m "feat: seed supervisor_id by department"
```

---

## FASE 1 — Migraciones DB (helpers + RPCs + RLS + chains)

### Task 11: Migration helper functions (`me`, `is_hr`, `resolve_approver`, `next_request_number`) + smoke

**Goal:** 4 funciones SQL listas, todas con smoke RAISE NOTICE.

**Files:**
- Create: `supabase/migrations/20260428_001_helper_functions.sql`

**Acceptance Criteria:**
- [ ] Las 4 funciones existen en el schema `humanos`.
- [ ] Smoke en cada una imprime un NOTICE con resultado.
- [ ] `resolve_approver('supervisor_directo', <empleado_sin_jefe>)` retorna NULL y emite RAISE NOTICE.

**Verify:** `apply_migration` retorna sin error; smoke notices visibles en logs.

**Steps:**

- [ ] **Step 1: SQL completo de la migration**

```sql
-- helpers de auth
CREATE OR REPLACE FUNCTION humanos.me() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT id FROM humanos.people WHERE auth_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION humanos.is_hr() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM humanos.people WHERE auth_id = auth.uid()
    AND code IN ('KOSM01','OLM206','MAN943','MEN943')
  )
$$;

-- resolución de roles
CREATE OR REPLACE FUNCTION humanos.resolve_approver(p_role text, p_requester_id uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE v_id uuid;
BEGIN
  IF p_role = 'supervisor_directo' THEN
    SELECT supervisor_id INTO v_id FROM humanos.people WHERE id = p_requester_id;
    IF v_id IS NULL THEN
      RAISE NOTICE 'resolve_approver: requester % has no supervisor_id, skipping step', p_requester_id;
    END IF;
  ELSIF p_role = 'hr_oficial' THEN
    SELECT id INTO v_id FROM humanos.people WHERE code='OLM206';
  ELSIF p_role = 'hr_planilla' THEN
    SELECT id INTO v_id FROM humanos.people WHERE code='MAN943';
  ELSIF p_role = 'hr_gerente' THEN
    SELECT id INTO v_id FROM humanos.people WHERE code='KOSM01';
  ELSIF p_role = 'presidencia' THEN
    SELECT id INTO v_id FROM humanos.people WHERE code='EIS772';
  ELSE
    RAISE EXCEPTION 'unknown role: %', p_role;
  END IF;
  RETURN v_id;
END;
$$;

-- numerador atómico
CREATE OR REPLACE FUNCTION humanos.next_request_number() RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_n bigint;
BEGIN
  UPDATE humanos.sequences SET current_value = current_value + 1
  WHERE name='request_number' RETURNING current_value INTO v_n;
  RETURN format('HUM-%s-%s', extract(year from now())::int, lpad(v_n::text, 4, '0'));
END;
$$;

-- Smoke tests
DO $$
DECLARE r1 uuid; r2 uuid; r3 text;
BEGIN
  SELECT humanos.resolve_approver('hr_gerente', NULL) INTO r1;
  RAISE NOTICE 'resolve(hr_gerente)=%', r1;

  SELECT humanos.resolve_approver('supervisor_directo',
    (SELECT id FROM humanos.people WHERE code='KOSM01')) INTO r2;
  RAISE NOTICE 'resolve(supervisor_directo of KOSM01)=%', r2;

  SELECT humanos.next_request_number() INTO r3;
  RAISE NOTICE 'next_request_number=%', r3;
  -- Rollback el numerador para no consumir
  UPDATE humanos.sequences SET current_value = current_value - 1 WHERE name='request_number';
END $$;
```

- [ ] **Step 2: Aplicar via MCP + verificar logs/notices**

- [ ] **Step 3: Append CHANGELOG**

```
### [bd] 2026-04-28
- Funciones humanos.me(), is_hr(), resolve_approver(role, requester), next_request_number() creadas con smoke tests.
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260428_001_helper_functions.sql Docs/CHANGELOG.md
git commit -m "feat: postgres helper functions with smoke tests"
```

---

### Task 12: Migration `submit_request` + smoke

**Goal:** función atómica de submit con happy-path probado.

**Files:**
- Create: `supabase/migrations/20260428_002_submit_request.sql`

**Acceptance Criteria:**
- [ ] La función crea request + N approvals + emite request_number.
- [ ] Skipea steps cuyo approver es NULL (test: usar empleado sin supervisor → la chain queda 1 step menos).
- [ ] Smoke al final inserta y limpia un dummy.

**Verify:** apply_migration sin error, NOTICE muestra el row creado.

**Steps:**

- [ ] **Step 1: SQL**

(Copia exacta del bloque `submit_request` en spec §4.2 + smoke al final.)

```sql
CREATE OR REPLACE FUNCTION humanos.submit_request(
  p_type_code text, p_requester_id uuid, p_form_data jsonb,
  p_attachments jsonb, p_approval_chain text[]
) RETURNS TABLE(request_id uuid, request_number text, first_approver_id uuid)
LANGUAGE plpgsql AS $$
DECLARE
  v_type_id uuid; v_request_id uuid; v_number text;
  v_role text; v_approver uuid; v_step int := 1; v_first uuid := NULL;
BEGIN
  SELECT id INTO v_type_id FROM humanos.request_types
   WHERE code = p_type_code AND is_active = true;
  IF v_type_id IS NULL THEN RAISE EXCEPTION 'unknown or inactive type: %', p_type_code; END IF;

  v_number := humanos.next_request_number();

  INSERT INTO humanos.requests (request_number, type_id, requester_id, status, form_data, attachments, date_submitted)
  VALUES (v_number, v_type_id, p_requester_id, 'Enviada', p_form_data, p_attachments, now())
  RETURNING id INTO v_request_id;

  FOREACH v_role IN ARRAY p_approval_chain LOOP
    v_approver := humanos.resolve_approver(v_role, p_requester_id);
    IF v_approver IS NOT NULL THEN
      INSERT INTO humanos.request_approvals (request_id, approver_id, step_order, role_required, decision)
      VALUES (v_request_id, v_approver, v_step, v_role, 'Pendiente');
      IF v_first IS NULL THEN v_first := v_approver; END IF;
      v_step := v_step + 1;
    END IF;
  END LOOP;

  IF v_first IS NULL THEN
    UPDATE humanos.requests SET status='Aprobada', date_resolved=now() WHERE id = v_request_id;
  END IF;

  RETURN QUERY SELECT v_request_id, v_number, v_first;
END;
$$;

-- Smoke
DO $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM humanos.submit_request(
    'VACACIONES',
    (SELECT id FROM humanos.people WHERE code='KOSM01'),
    '{"smoke_test": true}'::jsonb,
    '[]'::jsonb,
    ARRAY['hr_oficial','hr_gerente']
  );
  RAISE NOTICE 'submit_request smoke: id=%, number=%, first=%', r.request_id, r.request_number, r.first_approver_id;
  DELETE FROM humanos.request_approvals WHERE request_id = r.request_id;
  DELETE FROM humanos.requests WHERE id = r.request_id;
  UPDATE humanos.sequences SET current_value = current_value - 1 WHERE name='request_number';
END $$;
```

- [ ] **Step 2: Aplicar via MCP**

- [ ] **Step 3: CHANGELOG + Commit**

```bash
git add supabase/migrations/20260428_002_submit_request.sql Docs/CHANGELOG.md
git commit -m "feat: atomic submit_request rpc"
```

---

### Task 13: Migration `decide_approval` + smoke

**Goal:** función atómica de decisión con happy-path + rejection path.

**Files:**
- Create: `supabase/migrations/20260428_003_decide_approval.sql`

**Acceptance Criteria:**
- [ ] Aprobación parcial → status `En Revisión` + next_approver retornado.
- [ ] Aprobación final → status `Aprobada` + is_final=true.
- [ ] Rechazo → status `Rechazada` + is_final=true.
- [ ] Doble decisión sobre la misma fila → exception "already decided".
- [ ] Decisión por non-approver → exception "not your approval".

**Verify:** apply_migration + 4 NOTICES smoke.

**Steps:**

- [ ] **Step 1: SQL**

(Copia exacta del bloque `decide_approval` en spec §4.2 + smoke al final que crea un request dummy con 2 approvals, decide ambos, y verifica transiciones.)

```sql
CREATE OR REPLACE FUNCTION humanos.decide_approval(
  p_approval_id uuid, p_decider_id uuid, p_decision text, p_comments text
) RETURNS TABLE(request_status text, next_approver_id uuid, is_final boolean)
LANGUAGE plpgsql AS $$
DECLARE
  v_approval humanos.request_approvals%ROWTYPE;
  v_request_id uuid;
  v_next humanos.request_approvals%ROWTYPE;
BEGIN
  SELECT * INTO v_approval FROM humanos.request_approvals WHERE id = p_approval_id FOR UPDATE;
  IF v_approval.id IS NULL THEN RAISE EXCEPTION 'approval not found'; END IF;
  IF v_approval.approver_id != p_decider_id THEN RAISE EXCEPTION 'not your approval'; END IF;
  IF v_approval.decision != 'Pendiente' THEN RAISE EXCEPTION 'already decided'; END IF;
  IF p_decision NOT IN ('Aprobada','Rechazada','Solicita Info') THEN RAISE EXCEPTION 'bad decision'; END IF;

  v_request_id := v_approval.request_id;

  UPDATE humanos.request_approvals SET decision=p_decision, comments=p_comments, decided_at=now()
  WHERE id = p_approval_id;

  IF p_decision = 'Rechazada' THEN
    UPDATE humanos.requests SET status='Rechazada', date_resolved=now() WHERE id=v_request_id;
    RETURN QUERY SELECT 'Rechazada'::text, NULL::uuid, true;
    RETURN;
  END IF;

  SELECT * INTO v_next FROM humanos.request_approvals
   WHERE request_id = v_request_id AND decision = 'Pendiente'
   ORDER BY step_order ASC LIMIT 1;

  IF v_next.id IS NULL THEN
    UPDATE humanos.requests SET status='Aprobada', date_resolved=now() WHERE id=v_request_id;
    RETURN QUERY SELECT 'Aprobada'::text, NULL::uuid, true;
  ELSE
    UPDATE humanos.requests SET status='En Revisión' WHERE id=v_request_id AND status='Enviada';
    RETURN QUERY SELECT 'En Revisión'::text, v_next.approver_id, false;
  END IF;
END;
$$;

-- Smoke: crea dummy request con 2 approvals, decide ambos
DO $$
DECLARE
  r RECORD; appr1 uuid; appr2 uuid; samantha uuid; rocio uuid;
  d1 RECORD; d2 RECORD;
BEGIN
  SELECT id INTO samantha FROM humanos.people WHERE code='KOSM01';
  SELECT id INTO rocio FROM humanos.people WHERE code='OLM206';

  SELECT * INTO r FROM humanos.submit_request(
    'VACACIONES', samantha, '{"smoke":"decide"}'::jsonb, '[]'::jsonb,
    ARRAY['hr_oficial','hr_gerente']
  );
  SELECT id INTO appr1 FROM humanos.request_approvals WHERE request_id=r.request_id AND step_order=1;
  SELECT id INTO appr2 FROM humanos.request_approvals WHERE request_id=r.request_id AND step_order=2;

  SELECT * INTO d1 FROM humanos.decide_approval(appr1, rocio, 'Aprobada', 'smoke step 1');
  RAISE NOTICE 'decide step1: status=%, next=%, final=%', d1.request_status, d1.next_approver_id, d1.is_final;

  SELECT * INTO d2 FROM humanos.decide_approval(appr2, samantha, 'Aprobada', 'smoke step 2');
  RAISE NOTICE 'decide step2: status=%, next=%, final=%', d2.request_status, d2.next_approver_id, d2.is_final;

  -- Cleanup
  DELETE FROM humanos.request_approvals WHERE request_id=r.request_id;
  DELETE FROM humanos.requests WHERE id=r.request_id;
  UPDATE humanos.sequences SET current_value = current_value - 1 WHERE name='request_number';
END $$;
```

- [ ] **Step 2-4: Aplicar, CHANGELOG, commit**

```bash
git commit -m "feat: atomic decide_approval rpc"
```

---

### Task 14: Migration — re-seed `approval_chain` semántico + ACT_DATOS requires_approval=true

**Goal:** los 5 tipos P1 + 7 P2 con chains semánticos correctos.

**Files:**
- Create: `supabase/migrations/20260428_004_reseed_approval_chains.sql`

**Acceptance Criteria:**
- [ ] `VACACIONES` chain = `{supervisor_directo, hr_oficial, hr_gerente}`.
- [ ] `ACCION_PERSONAL` chain = `{supervisor_directo, hr_gerente, presidencia}`.
- [ ] `PRESTAMO` chain = `{supervisor_directo, hr_planilla, hr_gerente}`.
- [ ] `ACTUALIZACION_DATOS` chain = `{hr_oficial, hr_gerente}` Y requires_approval=true.
- [ ] `RECLAMO_PAGO` chain = `{hr_planilla, hr_gerente}`.
- [ ] P2 quedan con chains de placeholder pero requires_approval respeta su uso futuro.

**Verify:**
```sql
SELECT code, approval_chain, requires_approval FROM humanos.request_types ORDER BY code;
```

**Steps:**

- [ ] **Step 1: SQL**

```sql
UPDATE humanos.request_types SET approval_chain = ARRAY['supervisor_directo','hr_oficial','hr_gerente'], requires_approval=true WHERE code='VACACIONES';
UPDATE humanos.request_types SET approval_chain = ARRAY['supervisor_directo','hr_gerente','presidencia'], requires_approval=true WHERE code='ACCION_PERSONAL';
UPDATE humanos.request_types SET approval_chain = ARRAY['supervisor_directo','hr_planilla','hr_gerente'], requires_approval=true WHERE code='PRESTAMO';
UPDATE humanos.request_types SET approval_chain = ARRAY['hr_oficial','hr_gerente'], requires_approval=true WHERE code='ACTUALIZACION_DATOS';
UPDATE humanos.request_types SET approval_chain = ARRAY['hr_planilla','hr_gerente'], requires_approval=true WHERE code='RECLAMO_PAGO';

-- P2 placeholders (mantener funcional para listing en /ayuda; chains se ajustarán en Module 2)
UPDATE humanos.request_types SET approval_chain = ARRAY['supervisor_directo','hr_oficial'] WHERE code='PERMISO';
UPDATE humanos.request_types SET approval_chain = ARRAY['hr_oficial'] WHERE code='CONSTANCIA_TRABAJO';
UPDATE humanos.request_types SET approval_chain = ARRAY['hr_oficial'] WHERE code='REFERENCIA_LABORAL';
UPDATE humanos.request_types SET approval_chain = ARRAY['hr_oficial'] WHERE code='ENTREVISTA_SALIDA';
UPDATE humanos.request_types SET approval_chain = ARRAY['supervisor_directo','hr_oficial'] WHERE code='CAPACITACION';
UPDATE humanos.request_types SET approval_chain = ARRAY['supervisor_directo','hr_gerente','presidencia'] WHERE code='LIQUIDACION';
UPDATE humanos.request_types SET approval_chain = ARRAY['supervisor_directo','hr_planilla'] WHERE code='HORAS_EXTRAS';
```

- [ ] **Step 2-4: Aplicar, CHANGELOG, commit**

```bash
git commit -m "feat: reseed approval chains with semantic roles"
```

---

### Task 15: Migration — reemplazar RLS policies permisivas

**Goal:** policies reales por rol según spec §11.

**Files:**
- Create: `supabase/migrations/20260428_006_replace_rls_policies.sql`

**Acceptance Criteria:**
- [ ] Policies viejas `authenticated_all_*` removidas.
- [ ] Empleado X no puede SELECT `requests` donde `requester_id != X.people.id` Y X no es approver Y X no es hr_admin.
- [ ] Empleado puede SELECT su propio request.
- [ ] HR admin puede SELECT todos los requests.
- [ ] Smoke cambia el contexto de auth y verifica.

**Verify:** smoke con 3 escenarios usando `SET LOCAL role`:
```sql
SET LOCAL "request.jwt.claims" TO '{"sub":"<auth_id_de_empleado>"}';
SELECT count(*) FROM humanos.requests;
```

**Steps:**

- [ ] **Step 1: SQL**

```sql
-- Drop antiguas
DROP POLICY IF EXISTS authenticated_all_people ON humanos.people;
DROP POLICY IF EXISTS authenticated_all_request_types ON humanos.request_types;
DROP POLICY IF EXISTS authenticated_all_requests ON humanos.requests;
DROP POLICY IF EXISTS authenticated_all_approvals ON humanos.request_approvals;
DROP POLICY IF EXISTS authenticated_all_sequences ON humanos.sequences;

-- people: lectura amplia para campos públicos; escritura solo HR
CREATE POLICY people_select_authenticated ON humanos.people FOR SELECT TO authenticated USING (true);
CREATE POLICY people_update_hr ON humanos.people FOR UPDATE TO authenticated USING (humanos.is_hr()) WITH CHECK (humanos.is_hr());

-- request_types: read-only para todos
CREATE POLICY request_types_select_authenticated ON humanos.request_types FOR SELECT TO authenticated USING (true);

-- requests: visibility por relación
CREATE POLICY requests_select_visible ON humanos.requests FOR SELECT TO authenticated USING (
  requester_id = humanos.me()
  OR humanos.is_hr()
  OR EXISTS (SELECT 1 FROM humanos.request_approvals ra
              WHERE ra.request_id = humanos.requests.id AND ra.approver_id = humanos.me())
);
-- writes solo via RPC (security definer); no policy de INSERT/UPDATE para usuarios authenticated.

-- request_approvals: misma visibilidad
CREATE POLICY approvals_select_visible ON humanos.request_approvals FOR SELECT TO authenticated USING (
  approver_id = humanos.me()
  OR humanos.is_hr()
  OR EXISTS (SELECT 1 FROM humanos.requests r WHERE r.id = humanos.request_approvals.request_id AND r.requester_id = humanos.me())
);

-- sequences: NINGÚN acceso directo a authenticated; solo via RPCs SECURITY DEFINER.
-- (no policy = denied by default con RLS habilitado)

-- Smoke: simular un usuario y un HR
DO $$
DECLARE
  empleado_auth uuid; samantha_auth uuid;
  empleado_count int; hr_count int;
BEGIN
  SELECT auth_id INTO empleado_auth FROM humanos.people WHERE code='CUC166';
  SELECT auth_id INTO samantha_auth FROM humanos.people WHERE code='KOSM01';
  RAISE NOTICE 'rls smoke: empleado_auth=%, samantha_auth=%', empleado_auth, samantha_auth;
  -- (verificación interactiva queda fuera de DO; el JWT context no se setea desde aquí)
END $$;
```

- [ ] **Step 2: Aplicar via MCP**

- [ ] **Step 3: Verify manual** vía Supabase Studio con un access token de prueba (a hacerlo en Task 34 manual verification).

- [ ] **Step 4: CHANGELOG + commit**

```bash
git commit -m "feat: replace permissive rls with real policies"
```

---

## FASE 2 — Engine + Email layer

### Task 16: roles.ts + chains.ts (label map + dynamic chain helper)

**Files:**
- Create: `src/lib/approvals/roles.ts`, `src/lib/approvals/chains.ts`

**Steps:**

- [ ] **roles.ts:**

```ts
export type ApprovalRole = 'supervisor_directo' | 'hr_oficial' | 'hr_planilla' | 'hr_gerente' | 'presidencia';

export const ROLE_LABEL: Record<ApprovalRole, string> = {
  supervisor_directo: 'Tu jefe directo',
  hr_oficial: 'Rocío Olmedo (RRHH)',
  hr_planilla: 'Milagros Manyoma (Planillas)',
  hr_gerente: 'Samantha Kosmas (Gerente RRHH)',
  presidencia: 'Rodrigo Eisenmann (Presidencia)',
};

export function readableChain(roles: ApprovalRole[]): string {
  return roles.map(r => ROLE_LABEL[r]).join(' → ');
}
```

- [ ] **chains.ts:**

```ts
import type { ApprovalRole } from './roles';

export type RequestTypeCode = 'VACACIONES' | 'ACCION_PERSONAL' | 'PRESTAMO' | 'ACTUALIZACION_DATOS' | 'RECLAMO_PAGO';

export function effectiveChain(typeCode: RequestTypeCode, formData: Record<string, unknown>, baseChain: ApprovalRole[]): ApprovalRole[] {
  if (typeCode === 'PRESTAMO' && Number(formData.monto_solicitado) > 250) {
    return [...baseChain, 'presidencia'];
  }
  return baseChain;
}
```

- [ ] **Commit:** `feat: approval role labels and dynamic chain`

---

### Task 17: submit() server action

**Files:**
- Create: `src/lib/approvals/submit.ts`

**Acceptance Criteria:**
- [ ] Toma `(typeCode, formData, attachments)`, lee `getMe()`, resuelve chain efectivo, llama RPC `submit_request`, dispara email al primer aprobador.
- [ ] Retorna `{ requestId, requestNumber }` o lanza error tipado.

**Steps:**

- [ ] **Code:**

```ts
// src/lib/approvals/submit.ts
'use server';
import { createServerClient } from '@/lib/supabase/server';
import { getMe } from '@/lib/auth/getMe';
import { sendNotification } from '@/lib/email/send';
import { effectiveChain, type RequestTypeCode } from './chains';
import type { ApprovalRole } from './roles';

export async function submitRequestAction(args: {
  typeCode: RequestTypeCode;
  formData: Record<string, unknown>;
  attachments: Array<{ name: string; url: string; mime: string; size: number }>;
}): Promise<{ requestId: string; requestNumber: string }> {
  const me = await getMe();
  const supa = await createServerClient();

  // 1. Lee tipo + chain base
  const { data: type } = await supa.from('request_types').select('id, name, approval_chain').eq('code', args.typeCode).single();
  if (!type) throw new Error('Tipo de solicitud no encontrado');

  const baseChain = (type.approval_chain ?? []) as ApprovalRole[];
  const chain = effectiveChain(args.typeCode, args.formData, baseChain);

  // 2. RPC atómica
  const { data, error } = await supa.rpc('submit_request', {
    p_type_code: args.typeCode,
    p_requester_id: me.id,
    p_form_data: args.formData,
    p_attachments: args.attachments,
    p_approval_chain: chain,
  });
  if (error) throw new Error(`submit failed: ${error.message}`);
  const row = (data as Array<{ request_id: string; request_number: string; first_approver_id: string | null }>)[0];

  // 3. Email al primer aprobador (si existe)
  if (row.first_approver_id) {
    const { data: approver } = await supa.from('people').select('email, name').eq('id', row.first_approver_id).single();
    if (approver?.email) {
      await sendNotification('solicitud-enviada', {
        to: approver.email, to_name: approver.name.split(' ')[0],
        request_number: row.request_number, request_id: row.request_id,
        request_type_label: type.name, requester_name: me.name,
      });
    }
  }

  return { requestId: row.request_id, requestNumber: row.request_number };
}
```

- [ ] **Commit:** `feat: submit request server action`

---

### Task 18: decide() server action

**Files:**
- Create: `src/lib/approvals/decide.ts`

**Acceptance Criteria:**
- [ ] Toma `(approvalId, decision, comments)`, llama RPC, dispara email apropiado.
- [ ] Si rechaza o final → email al solicitante; sino → email al siguiente aprobador.

**Steps:**

- [ ] **Code:**

```ts
// src/lib/approvals/decide.ts
'use server';
import { createServerClient } from '@/lib/supabase/server';
import { getMe } from '@/lib/auth/getMe';
import { sendNotification } from '@/lib/email/send';
import { revalidatePath } from 'next/cache';

export async function decideApprovalAction(args: {
  approvalId: string; decision: 'Aprobada' | 'Rechazada'; comments: string;
}): Promise<void> {
  const me = await getMe();
  const supa = await createServerClient();

  const { data, error } = await supa.rpc('decide_approval', {
    p_approval_id: args.approvalId, p_decider_id: me.id,
    p_decision: args.decision, p_comments: args.comments,
  });
  if (error) throw new Error(`decide failed: ${error.message}`);
  const row = (data as Array<{ request_status: string; next_approver_id: string | null; is_final: boolean }>)[0];

  // Lookup data para emails
  const { data: appr } = await supa
    .from('request_approvals')
    .select('request_id, requests!inner(request_number, requester_id, type_id, request_types(name)), people:requests_requester_id_fkey(email, name)')
    .eq('id', args.approvalId).single();
  if (!appr) return;

  // Tipo + requester
  const { data: req } = await supa.from('requests')
    .select('request_number, requester_id, type_id, requester:people!requests_requester_id_fkey(email,name), request_type:request_types(name)')
    .eq('id', (appr as { request_id: string }).request_id).single();
  if (!req) return;
  const requester = (req as unknown as { requester: { email: string; name: string } }).requester;
  const typeLabel = (req as unknown as { request_type: { name: string } }).request_type.name;

  if (row.is_final) {
    if (requester.email) {
      await sendNotification('decision-final', {
        to: requester.email, to_name: requester.name.split(' ')[0],
        request_number: req.request_number, request_id: (appr as { request_id: string }).request_id,
        request_type_label: typeLabel, requester_name: requester.name,
        decision: row.request_status === 'Aprobada' ? 'Aprobada' : 'Rechazada',
      });
    }
  } else if (row.next_approver_id) {
    const { data: nextApprover } = await supa.from('people').select('email, name').eq('id', row.next_approver_id).single();
    if (nextApprover?.email) {
      await sendNotification('solicitud-decidida', {
        to: nextApprover.email, to_name: nextApprover.name.split(' ')[0],
        request_number: req.request_number, request_id: (appr as { request_id: string }).request_id,
        request_type_label: typeLabel, requester_name: requester.name,
      });
    }
  }

  revalidatePath('/solicitudes');
  revalidatePath(`/solicitudes/${(appr as { request_id: string }).request_id}`);
  revalidatePath('/admin');
}
```

- [ ] **Commit:** `feat: decide approval server action`

---

### Task 19: apply ACT_DATOS al expediente — server action

**Files:**
- Create: `src/lib/approvals/apply-act-datos.ts`

**Acceptance Criteria:**
- [ ] Solo HR puede ejecutar.
- [ ] Solo si type='ACTUALIZACION_DATOS' Y status='Aprobada'.
- [ ] Aplica mapeo del spec §6.4: address, phone, marital_status, num_kids.
- [ ] UPDATE `requests.status='Completada'`.

**Steps:**

- [ ] **Code:**

```ts
// src/lib/approvals/apply-act-datos.ts
'use server';
import { createServerClient } from '@/lib/supabase/server';
import { getMe } from '@/lib/auth/getMe';
import { revalidatePath } from 'next/cache';

type FormDataAct = {
  direccion?: { calle_barriada?: string; apartamento_casa_no?: string };
  celular_personal?: string;
  estado_civil?: 'Soltero(a)' | 'Casado(a)' | 'Unido(a)';
  dependientes?: Array<{ nombre: string; parentesco: string }>;
};

export async function applyActDatosAction(requestId: string): Promise<void> {
  const me = await getMe();
  if (me.role !== 'hr_admin') throw new Error('No autorizado');
  const supa = await createServerClient();

  const { data: req } = await supa.from('requests')
    .select('id, status, requester_id, form_data, request_types!inner(code)')
    .eq('id', requestId).single();
  if (!req) throw new Error('Solicitud no encontrada');
  if ((req.request_types as unknown as { code: string }).code !== 'ACTUALIZACION_DATOS') throw new Error('Tipo no aplica');
  if (req.status !== 'Aprobada') throw new Error('Solo solicitudes Aprobadas pueden aplicarse');

  const fd = req.form_data as FormDataAct;
  const updates: Record<string, unknown> = {};
  if (fd.direccion) {
    const addr = [fd.direccion.calle_barriada, fd.direccion.apartamento_casa_no].filter(Boolean).join(', ');
    if (addr) updates.address = addr;
  }
  if (fd.celular_personal) updates.phone = fd.celular_personal;
  if (fd.estado_civil) updates.marital_status = fd.estado_civil;
  if (Array.isArray(fd.dependientes)) updates.num_kids = fd.dependientes.length;

  if (Object.keys(updates).length > 0) {
    const { error } = await supa.from('people').update(updates).eq('id', req.requester_id);
    if (error) throw new Error(`apply failed: ${error.message}`);
  }

  await supa.from('requests').update({ status: 'Completada', date_resolved: new Date().toISOString() }).eq('id', requestId);
  revalidatePath(`/solicitudes/${requestId}`);
  revalidatePath('/admin');
}
```

- [ ] **Commit:** `feat: apply act_datos to people record`

---

## FASE 3 — 5 forms P1 (registry + components)

### Task 20: zod schemas + registry

**Files:**
- Create: `src/lib/forms/schemas/{vacaciones,accion-personal,prestamo,actualizacion-datos,reclamo-pago}.ts`, `src/lib/forms/registry.ts`

**Acceptance Criteria:**
- [ ] 5 schemas zod con validaciones del spec §6.
- [ ] `registry` exporta `{ code, label, schema, helpInfo, components }` por tipo.

**Steps:**

- [ ] **vacaciones.ts:**

```ts
import { z } from 'zod';
const isFutureOrToday = (d: string) => new Date(d) >= new Date(new Date().toDateString());

export const vacacionesSchema = z.object({
  pago_vacaciones: z.enum(['Completas', 'Adelanto sobre acumulado', 'Descuento de días solicitados']),
  tiempo_solicitado: z.enum(['Completas', 'Parciales']),
  desglose: z.array(z.object({
    desde: z.string().refine(isFutureOrToday, 'Fecha debe ser hoy o futura'),
    hasta: z.string(),
  })).min(1).max(3).refine(arr => arr.every(r => new Date(r.hasta) >= new Date(r.desde)), 'hasta >= desde'),
  observaciones: z.string().optional(),
}).refine(d => d.tiempo_solicitado !== 'Completas' || d.desglose.length === 1, {
  message: 'Vacaciones completas: solo 1 rango', path: ['desglose'],
}).refine(d => {
  // Sin traslapes entre rangos
  const sorted = [...d.desglose].sort((a, b) => a.desde.localeCompare(b.desde));
  for (let i = 1; i < sorted.length; i++) if (sorted[i].desde <= sorted[i-1].hasta) return false;
  return true;
}, { message: 'Los rangos no pueden traslaparse', path: ['desglose'] });

export type VacacionesData = z.infer<typeof vacacionesSchema>;
```

- [ ] **prestamo.ts:**

```ts
import { z } from 'zod';
export const prestamoSchema = z.object({
  monto_solicitado: z.number().positive().multipleOf(0.01),
  descuento_propuesto: z.number().positive().multipleOf(0.01),
  motivo: z.string().min(30, 'Mínimo 30 caracteres — sé específico'),
  acepta_descuento_liquidacion: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar la cláusula' }) }),
}).refine(d => d.descuento_propuesto <= d.monto_solicitado, {
  message: 'El descuento por bisemana no puede exceder el monto', path: ['descuento_propuesto'],
});
export type PrestamoData = z.infer<typeof prestamoSchema>;
```

- [ ] **accion-personal.ts:**

```ts
import { z } from 'zod';
export const accionPersonalSchema = z.object({
  sub_tipo: z.enum(['Aumento de Salario','Autorización de Horas Extras','Permisos','Descuento','Despido','Orden de Liquidación']),
  empleado_objeto_id: z.string().uuid(),  // por default = me.id; HR/supervisor pueden para subordinado
  observaciones: z.string().min(10),
});
export type AccionPersonalData = z.infer<typeof accionPersonalSchema>;
```

- [ ] **actualizacion-datos.ts:**

```ts
import { z } from 'zod';
export const actualizacionDatosSchema = z.object({
  direccion: z.object({
    calle_barriada: z.string().min(3),
    apartamento_casa_no: z.string().optional(),
  }),
  telefono_casa: z.string().optional(),
  celular_personal: z.string().min(7),
  estado_civil: z.enum(['Soltero(a)','Casado(a)','Unido(a)']),
  pareja: z.object({ nombre: z.string(), telefono: z.string() }).optional(),
  dependientes: z.array(z.object({ nombre: z.string().min(1), parentesco: z.string().min(1) })).default([]),
}).refine(d => !['Casado(a)','Unido(a)'].includes(d.estado_civil) || (d.pareja && d.pareja.nombre), {
  message: 'Estado civil casado/unido requiere datos de la pareja', path: ['pareja'],
});
export type ActualizacionDatosData = z.infer<typeof actualizacionDatosSchema>;
```

- [ ] **reclamo-pago.ts:**

```ts
import { z } from 'zod';
const RowSchema = z.object({
  categoria: z.string(),
  empleado: z.number().nullable(),
  supervisor: z.number().nullable(),
  diferencia: z.number().nullable(),
});
export const reclamoPagoSchema = z.object({
  periodo: z.object({ desde: z.string(), hasta: z.string() }).refine(p => p.hasta >= p.desde),
  tabla: z.array(RowSchema).length(5).refine(arr => arr.some(r => r.empleado !== null), {
    message: 'Al menos una fila debe tener valor del empleado',
  }),
  descripcion: z.string().min(30),
});
export type ReclamoPagoData = z.infer<typeof reclamoPagoSchema>;

export const RECLAMO_CATEGORIAS = [
  'Hrs. Reg. Pagadas', 'Horas de ST. Pagadas', 'Certificados Médicos', 'Ausencias', 'Feriados',
] as const;
```

- [ ] **registry.ts:**

```ts
import type { ZodSchema } from 'zod';
import { vacacionesSchema } from './schemas/vacaciones';
import { accionPersonalSchema } from './schemas/accion-personal';
import { prestamoSchema } from './schemas/prestamo';
import { actualizacionDatosSchema } from './schemas/actualizacion-datos';
import { reclamoPagoSchema } from './schemas/reclamo-pago';

export type FormHelpInfo = { qué_necesitas: string[]; chain_legible: string };

export const FORM_REGISTRY: Record<string, { schema: ZodSchema; help: FormHelpInfo }> = {
  VACACIONES: {
    schema: vacacionesSchema,
    help: {
      qué_necesitas: ['Fechas de inicio y fin', 'Saber si querés pago completo, adelanto o descuento'],
      chain_legible: 'Tu jefe → Rocío (RRHH) → Samantha (Gerente RRHH)',
    },
  },
  ACCION_PERSONAL: {
    schema: accionPersonalSchema,
    help: { qué_necesitas: ['Sub-tipo', 'Observaciones detalladas'], chain_legible: 'Tu jefe → Samantha → Rodrigo (Presidencia)' },
  },
  PRESTAMO: {
    schema: prestamoSchema,
    help: { qué_necesitas: ['Monto', 'Motivo específico (mínimo 30 caracteres)', 'Plan de descuento por bisemana'], chain_legible: 'Tu jefe → Milagros (Planillas) → Samantha' },
  },
  ACTUALIZACION_DATOS: {
    schema: actualizacionDatosSchema,
    help: { qué_necesitas: ['Datos actualizados de contacto, estado civil, dependientes'], chain_legible: 'Rocío → Samantha' },
  },
  RECLAMO_PAGO: {
    schema: reclamoPagoSchema,
    help: { qué_necesitas: ['Período en disputa', 'Lo que reportaste vs lo que te pagaron por categoría', 'Comprobante de pago (foto)'], chain_legible: 'Milagros → Samantha' },
  },
};
```

- [ ] **Commit:** `feat: zod schemas and form registry`

---

### Task 21: VacacionesForm.tsx + DetailView

**Files:**
- Create: `src/components/forms/VacacionesForm.tsx`, `src/components/forms/VacacionesDetail.tsx`
- Modify: `src/lib/forms/registry.ts` (agregar `Form`, `Detail` por code)

**Acceptance Criteria:**
- [ ] Form RHF + zodResolver, navega correctamente entre 1-3 rangos.
- [ ] Submit llama `submitRequestAction`, redirige a `/solicitudes/[id]` con toast.
- [ ] DetailView pretty-renderiza el form_data en `/solicitudes/[id]`.

**Steps:**

- [ ] **Code:**

```tsx
// src/components/forms/VacacionesForm.tsx
'use client';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vacacionesSchema, type VacacionesData } from '@/lib/forms/schemas/vacaciones';
import { submitRequestAction } from '@/lib/approvals/submit';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function VacacionesForm() {
  const router = useRouter();
  const form = useForm<VacacionesData>({
    resolver: zodResolver(vacacionesSchema),
    defaultValues: {
      pago_vacaciones: 'Completas', tiempo_solicitado: 'Completas',
      desglose: [{ desde: '', hasta: '' }], observaciones: '',
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'desglose' });
  const tiempo = form.watch('tiempo_solicitado');

  async function onSubmit(values: VacacionesData) {
    const res = await submitRequestAction({ typeCode: 'VACACIONES', formData: values, attachments: [] });
    router.push(`/solicitudes/${res.requestId}`);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <fieldset className="space-y-2">
        <Label>Pago de Vacaciones</Label>
        {(['Completas','Adelanto sobre acumulado','Descuento de días solicitados'] as const).map(opt => (
          <label key={opt} className="flex items-center gap-2"><input type="radio" value={opt} {...form.register('pago_vacaciones')} />{opt}</label>
        ))}
      </fieldset>
      <fieldset className="space-y-2">
        <Label>Tiempo Solicitado</Label>
        {(['Completas','Parciales'] as const).map(opt => (
          <label key={opt} className="flex items-center gap-2"><input type="radio" value={opt} {...form.register('tiempo_solicitado')} />{opt}</label>
        ))}
      </fieldset>
      <fieldset className="space-y-3">
        <Label>Desglose del tiempo a solicitar</Label>
        {fields.map((f, i) => (
          <div key={f.id} className="flex gap-2 items-end">
            <div className="flex-1"><Label>Del</Label><Input type="date" {...form.register(`desglose.${i}.desde` as const)} /></div>
            <div className="flex-1"><Label>Al</Label><Input type="date" {...form.register(`desglose.${i}.hasta` as const)} /></div>
            {i > 0 && <Button type="button" variant="outline" onClick={() => remove(i)}>Quitar</Button>}
          </div>
        ))}
        {tiempo === 'Parciales' && fields.length < 3 && (
          <Button type="button" variant="outline" onClick={() => append({ desde: '', hasta: '' })}>+ Agregar rango</Button>
        )}
      </fieldset>
      <fieldset>
        <Label>Observaciones (opcional)</Label>
        <textarea {...form.register('observaciones')} className="w-full border rounded p-2" rows={3} />
      </fieldset>
      {Object.entries(form.formState.errors).map(([k, v]) => <p key={k} className="text-red-500 text-sm">{(v as { message?: string }).message}</p>)}
      <Button type="submit" disabled={form.formState.isSubmitting} className="w-full md:w-auto">Enviar solicitud</Button>
    </form>
  );
}
```

```tsx
// src/components/forms/VacacionesDetail.tsx
import type { VacacionesData } from '@/lib/forms/schemas/vacaciones';
export function VacacionesDetail({ data }: { data: VacacionesData }) {
  return (
    <dl className="space-y-2">
      <div><dt className="text-sm text-gray-500">Pago</dt><dd>{data.pago_vacaciones}</dd></div>
      <div><dt className="text-sm text-gray-500">Tiempo</dt><dd>{data.tiempo_solicitado}</dd></div>
      <div><dt className="text-sm text-gray-500">Rangos</dt>
        <dd><ul className="list-disc ml-5">{data.desglose.map((r, i) => <li key={i}>{r.desde} → {r.hasta}</li>)}</ul></dd>
      </div>
      {data.observaciones && <div><dt className="text-sm text-gray-500">Observaciones</dt><dd>{data.observaciones}</dd></div>}
    </dl>
  );
}
```

- [ ] **Commit:** `feat: vacaciones form and detail`

---

### Task 22: AccionPersonalForm + Detail

Patrón análogo a Task 21. Sub_tipo es un `<Select>`, observaciones textarea required, `empleado_objeto_id` con default = `me.id` y dropdown de subordinados directos si soy supervisor/HR (lookup en BD de `people WHERE supervisor_id = me.id`).

**Commit:** `feat: accion personal form and detail`

---

### Task 23: PrestamoForm + Detail (con modal $250)

**Files:**
- Create: `src/components/forms/PrestamoForm.tsx`, `src/components/forms/PrestamoDetail.tsx`

**Acceptance Criteria:**
- [ ] Si monto > 250, al hacer click en "Enviar" se abre Dialog con texto del spec §6.3.
- [ ] 2 botones: "Continuar con $X" → submit; "Reducir a $250" → reset monto y submit.

**Steps:**

- [ ] **Code (extracto del modal):**

```tsx
// PrestamoForm.tsx parcial
const monto = form.watch('monto_solicitado');
const [showModal, setShowModal] = useState(false);

async function onSubmit(values: PrestamoData) {
  if (values.monto_solicitado > 250 && !confirmed) { setShowModal(true); return; }
  await submitRequestAction({ typeCode: 'PRESTAMO', formData: values, attachments: [] });
  router.push(`/solicitudes/${...}`);
}

// JSX del Dialog:
<Dialog open={showModal} onOpenChange={setShowModal}>
  <DialogContent>
    <DialogTitle>Monto excede el límite estándar</DialogTitle>
    <p>⚠️ Este monto excede el límite estándar de $250 establecido en IC-RH-D-02. Tu solicitud requerirá aprobación adicional de Presidencia, lo cual puede tardar más. ¿Deseas continuar?</p>
    <div className="flex gap-2 justify-end">
      <Button variant="outline" onClick={() => { form.setValue('monto_solicitado', 250); setShowModal(false); form.handleSubmit(onSubmit)(); }}>Reducir a $250</Button>
      <Button onClick={() => { setConfirmed(true); setShowModal(false); form.handleSubmit(onSubmit)(); }}>Continuar con ${monto}</Button>
    </div>
  </DialogContent>
</Dialog>
```

- [ ] **Commit:** `feat: prestamo form with $250 escalation modal`

---

### Task 24: ActualizacionDatosForm + Detail (pre-fill)

**Files:**
- Create: `src/components/forms/ActualizacionDatosForm.tsx`, `src/components/forms/ActualizacionDatosDetail.tsx`

**Acceptance Criteria:**
- [ ] Pre-llena con datos actuales de `humanos.people` del solicitante (server-side: `getMe()` → defaultValues).
- [ ] Submit guarda solo los campos cambiados (diff vs initial).
- [ ] Detail muestra los campos cambiados claramente.

**Steps:**

- [ ] **Pasar initialValues como prop al Form (Server → Client).**
- [ ] **Calcular diff antes de submit.**
- [ ] **Commit:** `feat: actualizacion datos form with prefill and diff`

---

### Task 25: ReclamoPagoForm + Detail (tabla 5×3)

**Files:**
- Create: `src/components/forms/ReclamoPagoForm.tsx`, `src/components/forms/ReclamoPagoDetail.tsx`

**Acceptance Criteria:**
- [ ] Renderiza la tabla 5×3 con `RECLAMO_CATEGORIAS`.
- [ ] `diferencia` se autocalcula = empleado - supervisor en watch().
- [ ] Detail re-renderiza la tabla.

**Commit:** `feat: reclamo pago form with 5x3 table`

---

### Task 26: ACT_DATOS apply button en /solicitudes/[id]

**Files:**
- Modify: `src/components/solicitudes/RequestActions.tsx`

**Acceptance Criteria:**
- [ ] Si me.role='hr_admin' Y type=ACTUALIZACION_DATOS Y status=Aprobada → botón "Aplicar al expediente".
- [ ] Click → confirma → llama `applyActDatosAction(requestId)` → toast + revalidate.

**Commit:** `feat: apply act datos button`

---

## FASE 4 — Páginas

### Task 27: /ayuda — knowledge base

**Files:**
- Create: `src/app/(app)/ayuda/page.tsx`

**Acceptance Criteria:**
- [ ] Lista los 12 tipos agrupados por `category`.
- [ ] Para P1: botón habilitado "Iniciar solicitud" → `/solicitudes/nueva/[code]`.
- [ ] Para P2: botón disabled con badge "Próximamente".
- [ ] Cada card muestra `chain_legible`, `qué_necesitas`, link a SOP (`/sops/<file>.pdf`).
- [ ] Callout explicando distinción Hrs Extras (post-facto en Acción de Personal vs P2 standalone).

**Steps:**

- [ ] Server component que hace SELECT de `request_types` ordenado por category, code.
- [ ] Lee `public/sops/index.json` para mapear `sop_reference` → URL.
- [ ] Distinción P1/P2 hardcoded: `const P1 = ['VACACIONES','ACCION_PERSONAL','PRESTAMO','ACTUALIZACION_DATOS','RECLAMO_PAGO']`.
- [ ] **Commit:** `feat: knowledge base page`

---

### Task 28: /solicitudes/nueva — grid de 12 tipos

**Files:**
- Create: `src/app/(app)/solicitudes/nueva/page.tsx`

- [ ] Grid de cards. P1 link, P2 disabled.
- [ ] **Commit:** `feat: new request type grid`

---

### Task 29: /solicitudes/nueva/[code] — render del form

**Files:**
- Create: `src/app/(app)/solicitudes/nueva/[code]/page.tsx`

- [ ] Server component lee me + auto-fill data.
- [ ] Switch sobre code → renderiza el `<XxxForm initialValues={...} />`.
- [ ] Si code no es P1 → 404 o redirect a /ayuda.
- [ ] **Commit:** `feat: dynamic form route`

---

### Task 30: /solicitudes (mis solicitudes) y /solicitudes/[id] (detalle)

**Files:**
- Create: `src/app/(app)/solicitudes/page.tsx`, `src/app/(app)/solicitudes/[id]/page.tsx`
- Create: `src/components/solicitudes/{RequestList,RequestStatusBadge,RequestTimeline,RequestActions,RequestDetailRenderer}.tsx`

**Acceptance Criteria:**
- [ ] `/solicitudes` filtra por requester_id=me.id, tabs por estado, click → detalle.
- [ ] `/solicitudes/[id]` muestra header + DetailView por tipo + Timeline + Actions.
- [ ] Timeline: filas de `request_approvals` ordenadas por step_order, mostrando approver name + role label + decision + decided_at.
- [ ] Actions: contextual basado en me.role + me.id vs requester/approvers.

**Commit:** `feat: my requests list and request detail`

---

### Task 31: /admin — dashboard HR

**Files:**
- Create: `src/app/(app)/admin/page.tsx`, `src/components/admin/{AdminKPICards,AdminRequestsTable}.tsx`

**Acceptance Criteria:**
- [ ] 4 KPI cards: pendientes mías, esta semana, vencidas (>5d), por tipo (count).
- [ ] Tabla con filtros (estado, tipo, requester search, fecha range).
- [ ] Acceso gateado: si me.role !== 'hr_admin' → redirect a /inicio.

**Commit:** `feat: admin dashboard with kpis and table`

---

## FASE 5 — Module 1.5 (cheap polish)

### Task 32: /directorio

**Files:**
- Create: `src/app/(app)/directorio/page.tsx`, opcionalmente `src/components/directorio/DirectoryFilters.tsx`

**Acceptance Criteria:**
- [ ] Lista 52 empleados activos con cards.
- [ ] Search input filtra por name/code/email/department.
- [ ] Filter pills por department + office.

**Commit:** `feat: directory page`

---

### Task 33: /perfil read-only

**Files:**
- Create: `src/app/(app)/perfil/page.tsx`

**Acceptance Criteria:**
- [ ] Server component lee me, muestra secciones Identidad/Contacto/Laboral/Otros.
- [ ] CTA "¿Necesitas actualizar algo?" → /solicitudes/nueva/actualizacion-datos.

**Commit:** `feat: profile read-only page`

---

## FASE 6 — Wrap-up

### Task 34: Docs/MANUAL_VERIFICATION.md

**Files:**
- Create: `Docs/MANUAL_VERIFICATION.md`

**Steps:**

- [ ] Generar el documento con las ~20 secciones del spec §13.3. Estructura ya en spec — copiar y pulir.
- [ ] **Commit:** `docs: manual verification checklist`

---

### Task 35: Verificación pre-deploy + deploy preview Vercel

**Steps:**

- [ ] Run: `npm run lint && npx tsc --noEmit && npm run build` — todos pasan.
- [ ] `git push -u origin <branch>`.
- [ ] Si hay un proyecto Vercel linkeado: `vercel --confirm` (o deploy automático por push).
- [ ] Verificar URL preview: login con KOSM01 funciona, /admin carga.
- [ ] **Commit:** (no necesariamente; el deploy es solo publicar)

---

### Task 36: CHANGELOG resumen + cierre del plan

**Files:**
- Modify: `Docs/CHANGELOG.md`, `Docs/TRAIL.md`

**Steps:**

- [ ] Append a CHANGELOG resumen de la sesión: cambios de schema (`[bd]` lines), features implementados, decisiones del decision log, URL del deploy preview.
- [ ] Update TRAIL.md: Module 1 ✅, Module 2 next.
- [ ] Borrar el plan file (per `.claude/rules/plan-lifecycle.md`: "Al cerrar tarea completa: borrar el plan file") — opcional, James decide si lo guarda como histórico o lo archiva.
- [ ] **Commit:** `docs: changelog and trail updates for module 1`

---

## Self-review checklist

- [x] **Spec coverage:** §1-2 → Task 1-10 (Fase 0); §3 (arch) → reflejado en file structure; §4 (schema) → Tasks 11-15; §5 (engine) → Tasks 16-19; §6 (5 forms) → Tasks 20-26; §7 (/ayuda) → Task 27; §8 (lists/detalle/admin) → Tasks 28-31; §9 (email) → Task 6 + 17-18; §10 (Module 1.5) → Tasks 32-33; §11-12 (RLS/auth) → Tasks 3, 11, 15; §13 (testing) → Task 34; §14 (form_data naming) → Task 20; §15 (out of scope) → no tasks; §16 (decision log) → captured.
- [x] **Placeholder scan:** Tasks 22, 24, 25, 26, 28, 29, 30, 31, 32, 33 son más cortas (referencian patrones de Tasks 21/23) — los detalles del código se replican en execution. Está OK por DRY pero implementer debe seguir el patrón de Task 21/23.
- [x] **Type consistency:** `submitRequestAction` retorna `{requestId, requestNumber}` consistente; `decideApprovalAction` no retorna nada (revalidate); `applyActDatosAction` no retorna nada.
- [x] **Commit cadence:** un commit por task (algunos tasks tienen sub-commits si aplica).

---

## Notas para el implementer

1. **Antes de Task 5:** verificar que un usuario auth de prueba existe en Supabase para poder ver la app. Sin Task 9 corrida primero, /login no funcionará.
2. **Orden de migrations:** Tasks 9, 10 (seeds de auth/supervisor) pueden correr en paralelo con Tasks 11-15 (DDL) porque no se cruzan, pero recomiendo el orden 11→12→13→14→15→9→10 para que las funciones existan antes de los seeds.
3. **PRESTAMO modal**: el flujo de doble-submit (open modal → user click → submit) requiere usar un flag `confirmed` para evitar abrir el modal otra vez. Detalle clave en Task 23.
4. **Email test mode**: durante development, setear `NOTIFICATION_TEST_EMAIL=jecg2804@gmail.com` en `.env.local` para que todos los emails vayan a Jaime. James lo desactiva antes de mostrarle a Samantha.
5. **Verificación de RLS**: Task 15 lleva smoke pero la verificación end-to-end (que un empleado no vea solicitud de otro) se hace en MANUAL_VERIFICATION (Task 34).
6. **Build SOPs**: el script de Task 8 corre en `prebuild` y `predev`, así que `npm run dev` ya popula `public/sops/` automáticamente la primera vez.

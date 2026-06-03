# Integraciones LIVE ICONSA

**Role:** inventario de la infraestructura operacional LIVE (email, monitoring, hosting, MCPs) + apps internas en producción. · **Read-when:** al tocar email/cron/hosting/monitoring o configurar un client-side integration. · **Maintain-when:** cambia config de Resend/Sentry/Vercel/MCPs o el status de una app interna.

**⚠️ Foundational ICONSA, no específico de HumanOS.** Migra a `iconsa-knowledge` wiki cuando se cree.

**Última actualización**: 2026-06-01 (D8 split — planned/ETL movido a `../future/13-INTEGRATIONS-PLANNED.md`)

**Propósito**: Inventario de la infraestructura crítica **LIVE** que sirve a las apps ICONSA + las apps internas en producción. Las integraciones ETL/master data **planned** (PayDay, Trimble Spectrum/B2W/ProjectSight, Skydata, Google Workspace SSO) + las apps futuras viven en `../future/13-INTEGRATIONS-PLANNED.md`.

---

## Infraestructura operacional (no ETL, no master data) — LIVE

### Resend (transactional email)

| Item | Valor |
|---|---|
| **Status** | Live para MovimientOS (shared-infra). HumanOS email templates shipped (v0.0.2, repo-state); app NOT deployed (no live recipients yet) |
| **Tipo** | Transactional email service |
| **API** | REST + SDK Node (resend v6.12) |
| **Auth** | API key `RESEND_API_KEY` en .env.local + Vercel env vars |
| **Domain verificado** | `rein-eisenwerk.com` (domain personal de Jaime, NOT `iconsanet.com` — ICONSA TI controla ese DNS y no se pudo verificar Resend ahí) |
| **Sender HumanOS** | `RESEND_FROM_EMAIL=HumanOS <notificaciones@rein-eisenwerk.com>` |
| **Sender MovimientOS** | Configurado en Vercel env override (llegan como `MovimientOS <noreply@resend.dev>` actualmente, pendiente migración a `*@rein-eisenwerk.com` post-MVP HumanOS) |
| **Reply-To HumanOS** | `RESEND_REPLY_TO=samantha.kosmas@iconsanet.com`. Aplica todos los emails EXCEPTO `password_reset` (self-service) |
| **Test override** | `NOTIFICATION_TEST_EMAIL` env var redirige todos los emails a esa dirección (uso dev only, NO setear en producción) |
| **Worker pattern HumanOS** | **Vercel Cron + Next.js route handler** (`/api/cron/process-notifications`) declarado en `vercel.ts` con schedule `*/5 * * * *`. ADR-0008 commit 49a978a. Auth: `x-vercel-cron` header + `Authorization: Bearer ${CRON_SECRET}` |
| **Templates** | Single source `src/emails/*.tsx` con `@react-email/components` + Tailwind `pixelBasedPreset`. Barrel export `src/emails/index.ts` para lookup dinámico por `template_code`. Sin sync script (mismo Node runtime) |
| **Per-user opt-in** | Reuso `hr.user_settings.preferences` jsonb con namespace `notifications`. Shape: `{ notifications: { email: { <type>: bool } } }`. Helper `notifications.enqueue` con fallback TRUE si namespace absent |
| **Owner ICONSA** | Jaime (Resend account holder) |
| **Implicación arquitectónica** | Sender domain ≠ recipient domain estándar transactional email. Empleados `@iconsanet.com` reciben del `*@rein-eisenwerk.com`. Display name "HumanOS" + branding visual aseguran identidad ICONSA pese al sender domain externo |

### Sentry (error tracking + APM)

| Item | Valor |
|---|---|
| **Status** | Live (MovimientOS configurado, HumanOS ya activo per Jaime) |
| **Tipo** | Error tracking + performance monitoring |
| **API** | REST + SDK Next.js (@sentry/nextjs) |
| **Auth** | `SENTRY_DSN` + auth token para sourcemaps en build |
| **Direction** | Outbound only (apps → Sentry SaaS) |
| **Frecuencia** | Realtime (errors), sampled (performance) |
| **Owner ICONSA** | Jaime |
| **Notas** | MCP disponible para Chat. Queries via `Sentry:find_issues`, `Sentry:search_events`, etc. |

### Vercel (hosting + cron)

| Item | Valor |
|---|---|
| **Status** | Live |
| **Team principal** | `team_eF8Xr3TDs6yd5Q6nAhics6s3` (great-mann's projects) |
| **Team secundario** | `team_yGAYhYjLvxBn2Ar4LjDkKxtJ` (jecg2804's projects) — legacy `movilizaciones-iconsa` candidato a archivar |
| **MovimientOS** | `prj_o28h5tYDskqF3AjBg1w5W3F3fYu4` → `rein-eisenwerk.com` + `www.rein-eisenwerk.com` |
| **HumanOS (app activa)** | **NO desplegada aún** (repo-state v0.0.2). El proyecto `prj_DqJQEL9LJ5qcwkw8Et6WYUpUxiLQ` (`human-os`, team great-mann) deploya el **demo viejo de `ICONSA-Solutions/HumanOS`** — builds ERROR (prebuild copy-sops), `live:false`, sin dominio custom. Ver fila "HumanOS" en Sistemas internos abajo |
| **Node** | 24.x |
| **Framework** | Next.js 16 |
| **Cron jobs (HumanOS Group 2+)** | Declarados en `vercel.ts` (knowledge update 2026 reemplaza `vercel.json`). Schedule `*/5 * * * *` para `/api/cron/process-notifications` email worker |
| **Cron auth** | `CRON_SECRET` env var (openssl rand -base64 32). Route handlers validan `x-vercel-cron` header (Vercel-signed) + `Authorization: Bearer ${CRON_SECRET}` |
| **Env vars** | Gestionados en Vercel Dashboard (override .env.local). MCP Chat NO lee env vars — solo lista projects, deployments, logs |
| **Owner ICONSA** | Jaime |

### Supabase (config crítica de deploy)

| Item | Valor |
|---|---|
| **Proyecto** | `bzeoszympkkicwlfdtcn` (compartido con MovimientOS) |
| **Exposed Schemas** ⚠️ | Dashboard → Settings → API → Exposed schemas **DEBE** incluir los schemas HumanOS (`hr, requests, docs, workflows, audit, notifications, files, performance, learning, mdm`) + `public`. **NO es legible por SQL.** Si falta uno, `supabase.schema('x')` falla con "Invalid schema" y la app no funciona (2026-06-02: solo `public` expuesto → ningún login HumanOS funcionaba). Antes de un `DROP SCHEMA` expuesto, quitarlo de aquí PRIMERO (incidente 066: rompió PostgREST → 503 cross-app). Grant-layer + detalle: `schemas-permisos.md`. |
| **API keys** | Legacy JWT (`anon`/`service_role`) + nuevas (`sb_publishable_`/`sb_secret_`) coexisten; legacy muere fines 2026. `SUPABASE_SERVICE_ROLE_KEY` (server-only) en .env.local + Vercel env. |
| **Owner ICONSA** | Jaime |

### MCPs activos

**Chat (Anthropic API directo)**:
- Supabase ✓ (29 tools — execute_sql, apply_migration, list_branches, etc.)
- Vercel ✓ (list_projects, get_project, list_deployments, build_logs)
- Sentry ✓
- Google Drive ✓
- Resend — configurado disabled status (no crítico MVP)

**Code (Claude Code en VS Code)** — fuente real: `.mcp.json` + plugins habilitados (verificar con `/mcp`):
- Supabase ✓ (`.mcp.json`, http read-only) · Context7 ✓ · next-devtools ✓
- Playwright ✓ · chrome-devtools-mcp ✓ (plugins)
- *(Filesystem / Notion: NO activos — fantasma del doc viejo; usar Read/Grep/Glob nativos)*
- **Conectores claude.ai (ADEMÁS del `.mcp.json`, vía ToolSearch):** Code TAMBIÉN alcanza los conectores de la cuenta claude.ai — **Google Drive** (`read_file_content`/`search_files`, OCR; **SOR de los SOPs** — corrige el claim viejo "GDrive no habilitado para Code"), `claude_ai_Supabase` (writable: `apply_migration`/`execute_sql`), Vercel, Sentry. ⚠️ pueden faltar en runs headless/cron — los agentes en background confirman acceso (reportan si no).

---

## Sistemas externos (ETL / master data) — planned

Las 6 integraciones ETL/master data planned (PayDay, Trimble B2W, Trimble Spectrum, Trimble ProjectSight, Skydata GPS, Google Workspace SSO) viven en **`../future/13-INTEGRATIONS-PLANNED.md`** con su detalle completo (status, API, auth, SOR matrix, orden de implementación). Ninguna es Live aún; al pasar a Live, su entry se mueve aquí.

---

## Sistemas internos (otras apps ICONSA usando la BD)

### MovimientOS

| Item | Valor |
|---|---|
| **Status** | Live (producción en `rein-eisenwerk.com`) |
| **Tipo** | App interna Next.js — logística movilizaciones |
| **Repo** | ICONSA-Solutions/movimientOS (owner/slug a confirmar) |
| **Vercel project** | `prj_o28h5tYDskqF3AjBg1w5W3F3fYu4` |
| **Domains** | `rein-eisenwerk.com`, `www.rein-eisenwerk.com` |
| **Schemas usados** | `public.*` (38 tablas) — datos transaccionales propios + golden records temporales (people, equipment, projects) |
| **Auth** | Supabase auth — `auth.users` con `app_metadata.allowed_apps` incluyendo `'movimientOS'` |
| **Daily users** | 17 |
| **Owner** | Jaime Cucalón (architect/dev) |

### HumanOS

| Item | Valor |
|---|---|
| **Status** | **NO desplegado a prod (repo-state v0.0.2, NO live).** "shipped" = tag v0.0.2 commit `32ef28b` en el repo, no un deploy. Dev en `jecg2804/HumanOS`; el deploy real + dominio se hacen al migrar a `ICONSA-Solutions/HumanOS` cuando el MVP esté listo. Group 3 (Profile + KB) en preparación |
| **Tipo** | App interna Next.js — RRHH self-service |
| **Repo** | **Dev (activo):** `jecg2804/HumanOS` — repo personal de Jaime usado como mirror para dar acceso a Claude Code/Codex (`ICONSA-Solutions` es privado). **Destino MVP:** `ICONSA-Solutions/HumanOS` (repo de la compañía, hoy con el demo inicial como backup) — se reemplaza al estar listo el MVP |
| **Vercel project** | `prj_DqJQEL9LJ5qcwkw8Et6WYUpUxiLQ` existe pero apunta al **demo viejo** (`ICONSA-Solutions/HumanOS`), builds ERROR — NO sirve la app activa. Falta un proyecto Vercel para `jecg2804/HumanOS` (o reconectar al migrar) |
| **Domain** | `humanos.rein-eisenwerk.com` planeado; **aún NO wired a un deploy live** |
| **Schemas usados** | `hr.*`, `requests.*`, `docs.*`, `workflows.*`, `audit.*`, `notifications.*`, `files.*`, `performance.*`, `learning.*` (52+ tablas total) |
| **Auth** | Supabase auth — `auth.users` con `allowed_apps` incluyendo `'humanOS'` |
| **Email sender** | `HumanOS <notificaciones@rein-eisenwerk.com>` (verificado en Resend) |
| **Email worker** | Vercel Cron `/api/cron/process-notifications` schedule `*/5 * * * *` (ADR-0008 revisado 49a978a) |
| **Owner** | Jaime Cucalón |
| **Stakeholder** | Samantha Kosmas (Gerente RRHH) |
| **Tag actual** | v0.0.2 (Group 2 onboarding shipped, commit `32ef28b`) |

### Apps futuras

Las mini-apps futuras ICONSA + el orden de implementación de integraciones + las herramientas evaluadas NO-MVP viven en `../future/13-INTEGRATIONS-PLANNED.md`.

---

## Cuándo este doc se actualiza

- Status change de una integration planned a **Live** (mover su entry desde `../future/13-INTEGRATIONS-PLANNED.md` a este doc)
- Issue operacional documentable (rate limit hit, schema change, etc.)
- Cambio en infraestructura operacional LIVE (Resend domain, Sentry config, hosting domain, MCP additions, Cron schedules)

## Cuándo migrar a `iconsa-knowledge` wiki

Inmediatamente al crearse ese repo. Este doc es **foundational ICONSA**.
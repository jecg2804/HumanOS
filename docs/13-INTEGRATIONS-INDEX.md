# 13-INTEGRATIONS-INDEX.md — Catálogo de integraciones ICONSA

**⚠️ Foundational ICONSA, no específico de HumanOS.** Migra a `iconsa-knowledge` wiki cuando se cree.

**Última actualización**: sesión 2026-05-27 nocturna post-audit-2 (Vercel Cron decisión absorbida ADR-0008, CRON_SECRET, sender confirmed)

**Propósito**: Inventario de cada sistema externo que sincroniza con la BD ICONSA o sirve infraestructura crítica. Por cada uno: status integration, API capabilities, auth, frecuencia ETL, entidades cubiertas. Sirve como source-of-truth operacional.

---

## Convenciones de status

- **Not Started** — no se ha tocado, sin investigación
- **Investigating** — research en curso (API docs, contratos, etc.)
- **Designing** — diseño ETL en progreso
- **Implementing** — código en construcción
- **Live** — en producción, sincronizando
- **Deprecated** — fue Live, se desconectó

---

## Infraestructura operacional (no ETL, no master data)

### Resend (transactional email)

| Item | Valor |
|---|---|
| **Status** | Live para MovimientOS, Implementing para HumanOS (Group 2 in-progress) |
| **Tipo** | Transactional email service |
| **API** | REST + SDK Node (resend v6.12) |
| **Auth** | API key `RESEND_API_KEY` en .env.local + Vercel env vars |
| **Domain verificado** | `rein-eisenwerk.com` (domain personal de James, NOT `iconsanet.com` — ICONSA TI controla ese DNS y no se pudo verificar Resend ahí) |
| **Sender HumanOS** | `RESEND_FROM_EMAIL=HumanOS <notificaciones@rein-eisenwerk.com>` |
| **Sender MovimientOS** | Configurado en Vercel env override (llegan como `MovimientOS <noreply@resend.dev>` actualmente, pendiente migración a `*@rein-eisenwerk.com` post-MVP HumanOS) |
| **Reply-To HumanOS** | `RESEND_REPLY_TO=samantha.kosmas@iconsanet.com`. Aplica todos los emails EXCEPTO `password_reset` (self-service) |
| **Test override** | `NOTIFICATION_TEST_EMAIL` env var redirige todos los emails a esa dirección (uso dev only, NO setear en producción) |
| **Worker pattern HumanOS** | **Vercel Cron + Next.js route handler** (`/api/cron/process-notifications`) declarado en `vercel.ts` con schedule `*/5 * * * *`. ADR-0008 commit 49a978a. Auth: `x-vercel-cron` header + `Authorization: Bearer ${CRON_SECRET}` |
| **Templates** | Single source `src/emails/*.tsx` con `@react-email/components` + Tailwind `pixelBasedPreset`. Barrel export `src/emails/index.ts` para lookup dinámico por `template_code`. Sin sync script (mismo Node runtime) |
| **Per-user opt-in** | Reuso `hr.user_settings.preferences` jsonb con namespace `notifications`. Shape: `{ notifications: { email: { <type>: bool } } }`. Helper `notifications.enqueue` con fallback TRUE si namespace absent |
| **Owner ICONSA** | James (Resend account holder) |
| **Implicación arquitectónica** | Sender domain ≠ recipient domain estándar transactional email. Empleados `@iconsanet.com` reciben del `*@rein-eisenwerk.com`. Display name "HumanOS" + branding visual aseguran identidad ICONSA pese al sender domain externo |

### Sentry (error tracking + APM)

| Item | Valor |
|---|---|
| **Status** | Live (MovimientOS configurado, HumanOS ya activo per James) |
| **Tipo** | Error tracking + performance monitoring |
| **API** | REST + SDK Next.js (@sentry/nextjs) |
| **Auth** | `SENTRY_DSN` + auth token para sourcemaps en build |
| **Direction** | Outbound only (apps → Sentry SaaS) |
| **Frecuencia** | Realtime (errors), sampled (performance) |
| **Owner ICONSA** | James |
| **Notas** | MCP disponible para Chat. Queries via `Sentry:find_issues`, `Sentry:search_events`, etc. |

### Vercel (hosting + cron)

| Item | Valor |
|---|---|
| **Status** | Live |
| **Team principal** | `team_eF8Xr3TDs6yd5Q6nAhics6s3` (great-mann's projects) |
| **Team secundario** | `team_yGAYhYjLvxBn2Ar4LjDkKxtJ` (jecg2804's projects) — legacy `movilizaciones-iconsa` candidato a archivar |
| **MovimientOS** | `prj_o28h5tYDskqF3AjBg1w5W3F3fYu4` → `rein-eisenwerk.com` + `www.rein-eisenwerk.com` |
| **HumanOS** | `prj_DqJQEL9LJ5qcwkw8Et6WYUpUxiLQ` → `humanos.rein-eisenwerk.com` (validado DNS+HTTP) |
| **Node** | 24.x |
| **Framework** | Next.js 16 |
| **Cron jobs (HumanOS Group 2+)** | Declarados en `vercel.ts` (knowledge update 2026 reemplaza `vercel.json`). Schedule `*/5 * * * *` para `/api/cron/process-notifications` email worker |
| **Cron auth** | `CRON_SECRET` env var (openssl rand -base64 32). Route handlers validan `x-vercel-cron` header (Vercel-signed) + `Authorization: Bearer ${CRON_SECRET}` |
| **Env vars** | Gestionados en Vercel Dashboard (override .env.local). MCP Chat NO lee env vars — solo lista projects, deployments, logs |
| **Owner ICONSA** | James |

### MCPs activos

**Chat (Anthropic API directo)**:
- Supabase ✓ (29 tools — execute_sql, apply_migration, list_branches, etc.)
- Vercel ✓ (list_projects, get_project, list_deployments, build_logs)
- Sentry ✓
- Google Drive ✓
- Resend — configurado disabled status (no crítico MVP)

**Code (Claude Code en VS Code)**:
- Supabase ✓ (built-in plugin)
- Vercel ✓ (built-in plugin)
- Context7 ✓ (docs Next.js/React/Tailwind/Resend/Supabase actualizadas)
- Playwright ✓
- chrome-devtools-mcp ✓
- Filesystem ✓
- Notion ✓

---

## Sistemas externos (ETL / master data)

### 1. PayDay (nómina Panamá)

| Item | Valor |
|---|---|
| **Status** | Designing (target post-Skydata) |
| **Tipo** | SaaS payroll Panamá |
| **API** | **NO tiene API REST.** Acceso vía **PayDay Data Warehouse** — data dump batch 1-2 veces al día fuera de horarios laborales |
| **Auth** | Credenciales Data Warehouse (TBD: SQL Server direct, SFTP CSV, ODBC, otro) |
| **Rate limits** | N/A (no es API live) |
| **Direction** | Inbound only (PayDay Data Warehouse → BD ICONSA). Outbound NO viable — cambios admin en HumanOS no se reflejan en PayDay vía esta vía |
| **Entidades cubiertas** | Person (salary, hire_date, vacation_balance, employment_status, termination_date, deducciones, cost_center contable) |
| **Frecuencia ETL recomendada** | Batch pull 2x/día (madrugada + tarde) sincronizando con ventana data warehouse PayDay |
| **SOR Matrix** | Ver `12-SOR-MATRIX.md` — PayDay es SOR de salary, vacation_balance, employment_status |
| **Sensibilidad** | Alta — datos salariales |
| **Owner ICONSA** | RRHH (Samantha Kosmas) operacional; TI técnico |
| **Implicación arquitectónica** | ETL pattern para PayDay debe ser **batch staging** con tabla `etl.payday_employees_batch_YYYYMMDD_HHMM` por dump. Tolerancia a stale data: hasta 12h entre dumps. Operaciones que dependen de salary/vacation_balance no son realtime. |
| **Próximo paso** | Después de Skydata Live + primer integration Spectrum master data. Verificar formato del data dump PayDay (SQL Server tables, CSV files, etc.) con TI ICONSA |

### 2. Trimble B2W (operations management)

| Item | Valor |
|---|---|
| **Status** | Not Started — sin SDK ni acceso aún |
| **Tipo** | Construction operations management software |
| **API** | Existe documentación pública Trimble B2W API; acceso enterprise requiere contrato |
| **Auth** | OAuth Trimble enterprise (TBD) |
| **Rate limits** | TBD |
| **Direction** | Inbound (B2W → BD) + posible Outbound futuro (asignaciones desde MovimientOS) |
| **Entidades cubiertas** | Equipment (assignment), Person (current_project_assignment), Project (job code), horas trabajadas |
| **Frecuencia ETL recomendada** | TBD — realtime via webhooks si disponible, sino hourly |
| **SOR Matrix** | B2W sería SOR de current_project_assignment y current_operator cuando se integre |
| **Owner ICONSA** | Operaciones (PMs) operacional; TI técnico |
| **Próximo paso** | Posponer hasta después de Spectrum live. Verificar acceso comercial Trimble enterprise |

### 3. Trimble Spectrum (accounting/ERP) — **next priority after Skydata**

| Item | Valor |
|---|---|
| **Status** | Investigating / Designing — **SDK ya en mano**, integration en planning |
| **Tipo** | Construction accounting/ERP |
| **API** | **SDK Trimble Spectrum disponible.** Cubre **master data** (Employees, Equipment, Projects, Cost Codes, Vendors). **NO incluye transactional** (POs, Invoices, AP, GL entries) — esto vendrá en fase posterior si Trimble lo expone o si se gestiona otro mecanismo |
| **Auth** | SDK Spectrum (credenciales enterprise) |
| **Rate limits** | TBD |
| **Direction** | Inbound principal (Spectrum master data → BD ICONSA). Outbound NO en scope inicial |
| **Entidades cubiertas (master data fase 1)** | Employee (cedula contable, cost_center, hire/term dates), Equipment (serial, model, depreciation), Project (job code, budget contractual), Cost Code, Vendor |
| **Entidades transactional (fase 2 — pendiente acceso)** | Purchase Orders, Invoices, AP transactions, GL entries — **NO en fase 1** |
| **Frecuencia ETL recomendada** | Daily inbound master data + on-demand sync para cambios urgentes (onboarding empleado nuevo, nuevo equipo, nuevo proyecto) |
| **SOR Matrix** | Spectrum es SOR de master data contable: serial_number equipment, project_code, cost_center, hire_date |
| **Owner ICONSA** | Contabilidad operacional; TI técnico |
| **Próximo paso** | **Esta es segunda integration después de Skydata.** Mapear módulos Spectrum master data que SDK expone. Diseñar `etl.spectrum_*_staging` tables. Definir delta detection (cómo saber qué cambió desde último sync) |
| **Workarounds actuales (eliminables con MDM mature)** | Tariff rates forzadas como "Equipment" en Spectrum — pierde semantic value. Con MDM y Spectrum sync, tariff rates pueden vivir en `hr.equipment_tariffs` o `mdm.equipment_tariffs` correctamente. |

### 4. Trimble ProjectSight (project management)

| Item | Valor |
|---|---|
| **Status** | Not Started — sin SDK ni acceso aún |
| **Tipo** | Construction project management |
| **API** | Existe — REST API documentada Trimble; acceso enterprise requerido |
| **Auth** | OAuth Trimble |
| **Rate limits** | TBD |
| **Direction** | Inbound + Outbound (RFIs creadas desde apps internas) |
| **Entidades cubiertas** | Project (status operacional, phases, milestones), assignment de PM, RFIs, submittals |
| **Frecuencia ETL recomendada** | Hourly inbound de status |
| **SOR Matrix** | ProjectSight sería SOR de project status operacional cuando se integre |
| **Owner ICONSA** | PMs operacional; TI técnico |
| **Próximo paso** | Posponer. Última de las Trimble — depende de Spectrum y B2W estables |

### 5. Skydata GPS (telematics vehículos/maquinaria) — **first integration to implement**

| Item | Valor |
|---|---|
| **Status** | API disponible — credenciales en Vercel env vars (`SKYDATA_API_KEY`, `SKYDATA_API_PASSWORD`, `SKYDATA_BASE_URL`) |
| **Tipo** | GPS telematics |
| **API** | **Confirmado — REST API live** |
| **Auth** | API key + password (ya configurados en Vercel) |
| **Rate limits** | TBD |
| **Direction** | Inbound only (Skydata → BD) — GPS pings + telemetry |
| **Entidades cubiertas** | Equipment (current_location, telemetry), Driver tracking (asociación driver → equipment vía Skydata Driver ID) |
| **Frecuencia ETL recomendada** | Polling cada 1-5 min o webhook si Skydata lo soporta. Posiblemente Vercel Cron en HumanOS (pattern consolidado per ADR-0008) o Supabase Edge Function (TBD post-MVP) |
| **SOR Matrix** | Skydata es SOR de current_location en realtime y telemetry (velocidad, idle time, route history) |
| **Owner ICONSA** | Operaciones (logística MovimientOS) |
| **Implicación arquitectónica** | Volumen alto: cada equipo con GPS ping cada N segundos. Schema staging `etl.skydata_pings_staging` debe tener TTL/partitioning para no crecer indefinidamente. Considerar TimescaleDB extension o particionado nativo Postgres por tiempo. |
| **Próximo paso** | **Primera integration MDM-compliant a implementar.** Crear `etl.skydata_pings_staging` + worker pull cada N minutos + tabla canónica `mdm.equipment_locations` (o equivalente) con partition por tiempo |
| **Workarounds actuales** | Ninguno — clean slate para primera implementation MDM-compliant |

### 6. Google Workspace ICONSA (futuro SSO destino)

| Item | Valor |
|---|---|
| **Status** | Not Started — destino arquitectónico Opción D para auth |
| **Tipo** | SSO / Identity Provider corporativo |
| **API** | Google Admin SDK (Directory API) |
| **Auth** | OAuth Service Account |
| **Rate limits** | Generosos (Google) |
| **Direction** | Inbound principal (Workspace → BD) — auth + directory |
| **Entidades cubiertas** | Person (email, name, status), auth.users (SSO source) |
| **Frecuencia ETL recomendada** | Daily inbound + webhook on user changes |
| **SOR Matrix** | Workspace sería SOR absoluto de email y employment_status post-migration |
| **Owner ICONSA** | TI |
| **Próximo paso** | Esperar a que escale a 5+ apps internas — premature ahora. Ver ADR sobre Opción B vs D |

---

## Sistemas internos (otras apps ICONSA usando la BD)

### MovimientOS

| Item | Valor |
|---|---|
| **Status** | Live (producción en `rein-eisenwerk.com`) |
| **Tipo** | App interna Next.js — logística movilizaciones |
| **Repo** | ICONSA-Solutions/movimientOS |
| **Vercel project** | `prj_o28h5tYDskqF3AjBg1w5W3F3fYu4` |
| **Domains** | `rein-eisenwerk.com`, `www.rein-eisenwerk.com` |
| **Schemas usados** | `public.*` (38 tablas) — datos transaccionales propios + golden records temporales (people, equipment, projects) |
| **Auth** | Supabase auth — `auth.users` con `app_metadata.allowed_apps` incluyendo `'movimientOS'` |
| **Daily users** | 17 |
| **Owner** | James Cucalón (architect/dev) |

### HumanOS

| Item | Valor |
|---|---|
| **Status** | En construcción (Group 2 onboarding plan corregido post-audit-2, pre-Task 1) |
| **Tipo** | App interna Next.js — RRHH self-service |
| **Repo** | ICONSA-Solutions/HumanOS |
| **Vercel project** | `prj_DqJQEL9LJ5qcwkw8Et6WYUpUxiLQ` |
| **Domain** | `humanos.rein-eisenwerk.com` (subdomain del domain personal James, validado DNS+HTTP) |
| **Schemas usados** | `hr.*`, `requests.*`, `docs.*`, `workflows.*`, `audit.*`, `notifications.*`, `files.*`, `performance.*`, `learning.*` (52+ tablas total) |
| **Auth** | Supabase auth — `auth.users` con `allowed_apps` incluyendo `'humanOS'` |
| **Email sender** | `HumanOS <notificaciones@rein-eisenwerk.com>` (verificado en Resend) |
| **Email worker** | Vercel Cron `/api/cron/process-notifications` schedule `*/5 * * * *` (ADR-0008 revisado 49a978a) |
| **Owner** | James Cucalón |
| **Stakeholder** | Samantha Kosmas (Gerente RRHH) |
| **Tag actual** | v0.0.1 (Group 1 foundation deployed) |

### Apps futuras

**Aspiración documentada (James, 2026-05-25)**: ICONSA tendrá varios mini-apps internos siguiendo el patrón MovimientOS + HumanOS — digitalizar formularios + agregar valor con APIs/data integration. Ejemplos no comprometidos:

- App de mantenimiento equipos (RCM + preventive scheduling con GPS data Skydata)
- App de despacho/ruteo (algoritmos sobre data MovimientOS + GPS)
- App de inspecciones (digitaliza formularios de QA/QC con Spectrum project context)
- App de compras (integra POs Spectrum + workflow aprobaciones tipo HumanOS)
- App de cotizaciones multi-proveedor (automatiza RFQ + vendor management)

Cada app: nuevo schema dedicado (no entremezclar transactional), `auth.users.app_metadata.allowed_apps` incluye nombre app, RLS isolation, **NUNCA duplica master data** (`hr.people`, `mdm.equipment`, `mdm.projects` — single golden record por entidad).

Cuando se planifique cada nueva app:
- Reservar schema(s) en BD
- Define `allowed_apps` value
- Documentar entidades canónicas que toca vs solo lee
- Crear ADR de architectural fit
- Verificar contra `12-SOR-MATRIX.md` que no introduce nuevo SOR conflict

---

## Orden de implementación recomendado (post-HumanOS MVP funcional)

1. **Skydata GPS** — primera real integration. Baja complejidad, valida el approach MDM (staging → canonical, audit, source tracking). API REST live.
2. **Trimble Spectrum master data** — segunda integration. SDK disponible. Master data only fase 1 (Employees, Equipment, Projects, Cost Codes, Vendors). Transactional fase 2 pendiente expansión SDK.
3. **PayDay (Data Warehouse batch dump)** — tercera. NO API; pull batch 1-2 veces/día. Person fields críticos (salary, vacation_balance, employment_status).
4. **Trimble B2W** — operations layer. Sin SDK aún; requiere gestión acceso enterprise.
5. **Trimble ProjectSight** — última Trimble — depende de Spectrum + B2W estables.
6. **Google Workspace SSO** — solo cuando 5+ apps internas existan (ver ADR Opción D).

---

## Integrations evaluadas y NO MVP

Investigación 2026-05-27 — opciones que aportan valor a la visión final pero NO crítico MVP:

| Tool | Categoría | Status | Decisión MVP |
|---|---|---|---|
| Upstash Redis | Rate limiting + session cache | Considerado | NO MVP (sin volumen suficiente) |
| CodeRabbit | AI code reviews PRs | Considerado | NO MVP (Code single dev) |
| PostHog | Product analytics | Considerado | NO MVP (instrumentar post-funnel onboarding completo) |
| Sanity | Headless CMS (KB editing por Samantha) | Considerado | NO MVP (Notion ya wireado para esto) |
| Linear / GitHub Projects | Backlog tracker | Considerado | NO MVP (BACKLOG.md manual funciona) |
| Terraform | Infrastructure-as-Code | Considerado | NO MVP (2 Vercel projects + 1 Supabase = overkill) |
| Supabase Edge Functions | Worker compute cerca de BD | Considerado para email worker | **NO** — ver ADR-0008 alternativa rechazada (b revisited). Vercel Cron preferido para HumanOS por templates single-source + same Node runtime |

Reevaluar post-MVP cuando volumen/complejidad justifiquen.

---

## Cuándo este doc se actualiza

- Nueva integration arrancada: entry completa
- Status change (Not Started → Investigating → ... → Live)
- Cambio en SOR matrix relacionado
- Issue operacional documentable (rate limit hit, schema change, etc.)
- Nueva mini-app planificada
- Cambio en infraestructura operacional (Resend domain, Sentry config, hosting domain, MCP additions, Cron schedules)

## Cuándo migrar a `iconsa-knowledge` wiki

Inmediatamente al crearse ese repo. Este doc es **foundational ICONSA**.
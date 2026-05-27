# 13-INTEGRATIONS-INDEX.md — Catálogo de integraciones ICONSA

**⚠️ Foundational ICONSA, no específico de HumanOS.** Migra a `iconsa-knowledge` wiki cuando se cree.

**Última actualización**: sesión 2026-05-25 (creación)

**Propósito**: Inventario de cada sistema externo que sincroniza con la BD ICONSA. Por cada uno: status integration, API capabilities, auth, frecuencia ETL, entidades cubiertas. Sirve como source-of-truth operacional.

---

## Convenciones de status

- **Not Started** — no se ha tocado, sin investigación
- **Investigating** — research en curso (API docs, contratos, etc.)
- **Designing** — diseño ETL en progreso
- **Implementing** — código en construcción
- **Live** — en producción, sincronizando
- **Deprecated** — fue Live, se desconectó

---

## Sistemas externos

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
| **Frecuencia ETL recomendada** | Polling cada 1-5 min o webhook si Skydata lo soporta. Posiblemente Edge Function en Supabase con cron schedule |
| **SOR Matrix** | Skydata es SOR de current_location en realtime y telemetry (velocidad, idle time, route history) |
| **Owner ICONSA** | Operaciones (logística MovimientOS) |
| **Implicación arquitectónica** | Volumen alto: cada equipo con GPS ping cada N segundos. Schema staging `etl.skydata_pings_staging` debe tener TTL/partitioning para no crecer indefinidamente. Considerar TimescaleDB extension o particionado nativo Postgres por tiempo. |
| **Próximo paso** | **Primera integration MDM-compliant a implementar.** Crear `etl.skydata_pings_staging` + Edge Function pull cada N minutos + tabla canónica `mdm.equipment_locations` (o equivalente) con partition por tiempo |
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
| **Schemas usados** | `public.*` (38 tablas) — datos transaccionales propios + golden records temporales (people, equipment, projects) |
| **Auth** | Supabase auth — `auth.users` con `app_metadata.allowed_apps` incluyendo `'movimientOS'` |
| **Daily users** | 17 |
| **Owner** | James Cucalón (architect/dev) |

### HumanOS

| Item | Valor |
|---|---|
| **Status** | En construcción (Paso 9-11 framework setup) |
| **Tipo** | App interna Next.js — RRHH self-service |
| **Repo** | jecg2804/HumanOS (`human-os`) |
| **Schemas usados** | `hr.*`, `requests.*`, `docs.*`, `workflows.*`, `audit.*`, `notifications.*`, `files.*`, `performance.*`, `learning.*` (52 tablas total) |
| **Auth** | Supabase auth — `auth.users` con `allowed_apps` incluyendo `'humanOS'` |
| **Owner** | James Cucalón |
| **Stakeholder** | Samantha Kosmas (Gerente RRHH) |

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

## Cuándo este doc se actualiza

- Nueva integration arrancada: entry completa
- Status change (Not Started → Investigating → ... → Live)
- Cambio en SOR matrix relacionado
- Issue operacional documentable (rate limit hit, schema change, etc.)
- Nueva mini-app planificada

## Cuándo migrar a `iconsa-knowledge` wiki

Inmediatamente al crearse ese repo. Este doc es **foundational ICONSA**.

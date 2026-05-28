# HumanOS v2 ROADMAP

Macro tracker del overnight #1: 7 groups, 39 features F1-F39, tag plan `v0.0.1` -> `v0.0.7`. Source of truth para "donde estamos / que viene". Toda sesion fresca de Code DEBE leer este archivo al arrancar (linked desde `CLAUDE.md`).

Mantener sincronizado con `docs/CHANGELOG.md` (cambios granulares por commit) y `docs/02-MVP-SCOPE.md` (feature catalog). Si esos divergen de aqui, este archivo gana para status macro; ellos ganan para detalle.

## Status table

| Group | Scope corto | Feature IDs | Tag | Status | Commit / HEAD | Plan |
|---|---|---|---|---|---|---|
| 1 | Foundation: Supabase Auth, middleware allowed_apps, AppShell, test infra, shadcn + ICONSA tokens | F2, F3 | `v0.0.1` | done | `995e41b` | [plan](superpowers/plans/2026-05-27-group-1-foundation.md) |
| 2 | Onboarding: F1 wizard 10 pasos + F4 admin crear + F5 admin editar + F-04-01 + F-01-09 + forgot/reset password + perfil landing + NotificationBell + Cron worker + 7 email templates Resend | F1, F4, F5, F-04-01, F-01-09 (acks parciales) | `v0.0.2` | done, en auditoria | `32ef28b` (tag); HEAD `12f29a6` "pre auditoria" | [plan](superpowers/plans/2026-05-27-group-2-onboarding.md) |
| 3 | Profile + KB + Settings: perfil view/edit, directorio, knowledge base (`/ayuda`), settings notificaciones, profile robusto | F6, F7, F8, F9, F33, F34, F36 | `v0.0.3` | pending | - | TBD |
| 4 | Engines genericos E1-E6: FormEngine, ApprovalEngine, ChainResolver, StampEngine, PdfEngine, NotificationEngine | E1, E2, E3, E4, E5, E6 (no son F numerados; foundational para Groups 5+6) | `v0.0.4` | pending | - | TBD |
| 5 | Forms Categoria A: 9 tipos top con SOP papel + 6 sub-tipos F-05-01 | F10, F11, F12 + 6 sub (F12.1 a F12.6), F13, F14, F15, F16, F17, F18 | `v0.0.5` | pending | - | TBD |
| 6 | Forms Categoria B: 9 tipos adiciones HRIS mercado | F19, F20, F21, F22, F23, F24, F25, F26, F27 | `v0.0.6` | pending | - | TBD |
| 7 | Admin + UI tickets + extended: dashboards, UI solicitudes/[id], manual entry F32, search global, notificaciones inbox, audit log viewer, imprimir PDF, admin viewer tipos | F28, F29, F30, F31, F32, F35, F37, F38, F39 | `v0.0.7` | pending | - | TBD |

Total features: 39 (incluyendo sub-tipos como entradas separadas). Form variants tickets: 24 (18 top + 6 sub).

## Detalle por group

### Group 1 - Foundation (v0.0.1, done)

Commits: ver `git log v0.0.1` (15 commits desde `0c132fb` foundation hasta `995e41b` changelog).

Deliverables clave:
- Supabase clients server + browser + middleware (`src/lib/supabase/*`)
- Middleware `src/middleware.ts` enforce `app_metadata.allowed_apps` contiene `humanOS`
- shadcn/ui New York + ICONSA palette en `src/app/globals.css` @theme
- 11 shadcn primitives + use-mobile hook
- `/login` page + server actions Zod-validated
- AppShell layout: Sidebar + Topbar + UserMenu
- Generated Supabase types `src/lib/supabase/database.types.ts` (3675 lineas, 9 schemas)
- Test infra: vitest 4 (jsdom, coverage v8 70%), Playwright chromium

ADRs adoptados: [0001](adr/0001-rls-driven-db-access.md), [0002](adr/0002-codegen-snake-case-types-zod-boundaries.md), [0003](adr/0003-snapshot-profile-fields-at-submit.md), [0004](adr/0004-parallel-modify-reset-non-terminal.md), [0005](adr/0005-manual-entry-bypass-chain.md).

Tests al cierre: 21 unit (vitest), 5 E2E (Playwright).

### Group 2 - Onboarding (v0.0.2, done en auditoria)

Commits: ver `git log v0.0.1..v0.0.2`. HEAD actual `12f29a6` indica pre-auditoria (cambios despues del tag pendientes de revision).

Migrations BD aplicadas:
- 033 seed SOPs M-01 + D-07 + VV01 versions
- 034 `hr.find_auth_user_by_identifier` SECURITY DEFINER
- 035 storage bucket `avatars` + RLS subquery
- 036 + 036b `notifications.outbox` indexes + `notifications.enqueue()` helper + metadata jsonb
- 037 `hr.complete_onboarding_writes` RPC atomic idempotent
- 038 `hr.apply_employment_scd2_change` helper para F5

Deliverables clave (per CHANGELOG):
- `/onboarding/[code]` wizard 10 pasos
- `/admin/empleados/nuevo` (F4) + `/admin/empleados/[id]/editar` (F5) + regenerate invite
- `/forgot-password` + `/reset-password` (email-only MVP)
- `/perfil` landing (basico; F6 robusto en Group 3)
- NotificationBell + dropdown + Realtime subscription (canal in-app)
- Cron worker `/api/cron/process-notifications` (Resend, `*/5`, Reply-To pattern)
- 7 email templates @react-email/components
- ESLint rule `iconsa/no-admin-client-in-client` enforce ADR-0006
- `src/lib/supabase/admin.ts` service role wrapper

ADRs adoptados nuevos: [0006](adr/0006-service-role-admin-client-onboarding-exception.md), [0007](adr/0007-employment-type-reference-table.md), [0008](adr/0008-notifications-in-app-email-primary-mvp.md).

Tests al cierre: 58 vitest (8 files), 6+ E2E (onboarding happy / multi-app / step-5 critical-error / admin / forgot-password).

**Status auditoria:** en curso. Hallazgos por triage (P1/P2/P3 + trivial/no-trivial). Resoluciones se commiteran sobre HEAD actual y luego se considera tag intermedio (`v0.0.2-fix`) o se mueve `v0.0.2` (decision con James).

### Group 3 - Profile + KB + Settings (v0.0.3, pending)

Scope per `02-MVP-SCOPE.md`:
- F6 `/perfil` base completo (secciones: Datos personales, Empleo, Contacto, Emergencia, Datos medicos, Foto)
- F7 `/perfil/editar` form edicion campos auto-editables; algunos solo hr_admin via SCD-2
- F8 `/directorio` foto + busqueda + filtros (departamento, supervisor, ubicacion); solo activos
- F9 `/ayuda` KB completa carpeta RRHH (manuales M / docs D educativos / IT / PO / formularios F). Categorias en `docs.article_categories`. Full-text search
- F33 `/settings` preferencias notificaciones (email/in-app/whatsapp v1.1/sms v1.1), idioma, contrasena, 2FA, foto. `hr.user_settings` ya existe
- F34 `/perfil` completo (expansion F6): expediente digital + tab Mi Equipo si has_direct_reports
- F36 `/notificaciones` inbox in-app con badge contador (lee `notifications.outbox` filtrado por user)

Dependencias: ninguna fuerte sobre Group 2. Bloqueador potencial: si auditoria Group 2 levanta cambio de schema notifications, F36 lo absorbe.

Mini-grill esperado antes de plan (3-5 Q): scope de search KB (full-text vs filtros), pattern para SCD-2 edicion en UI, prioridad tab Mi Equipo (v0.0.3 o defer).

### Group 4 - Engines E1-E6 (v0.0.4, pending)

Foundational. Reusados por Groups 5 + 6.

- E1 FormEngine: renderer dinamico desde `requests.types.form_schema` JSONB. Tipos campo: text, number, currency, date, datetime, select, multiselect, textarea, file_upload, signature_canvas, computed. Field source matrix `profile|user_input|computed` per [ADR-0003](adr/0003-snapshot-profile-fields-at-submit.md)
- E2 ApprovalEngine: state machine 8 estados R16, soporta 4 modes R11/R24. Aplica reset non-terminal per [ADR-0004](adr/0004-parallel-modify-reset-non-terminal.md)
- E3 ChainResolver: resuelve steps per resolver (`selected_supervisor_id` + fallback, `any_hr_admin`, `president_user`). RRHH siempre incluido desde dia 0
- E4 StampEngine: genera `stamp_text` + `stamp_data` jsonb (R7)
- E5 PdfEngine: Puppeteer o react-pdf. Registry de templates por tipo. Cat A pixel-perfect SOP papel; Cat B template ICONSA-branded generico
- E6 NotificationEngine: ya parcialmente construido en Group 2 (`notifications.enqueue()` SQL + cron worker). En Group 4 se formaliza API + tests + tipo de notificacion `ticket_*` per ADR-0008.

Mini-grill esperado: API surface por engine (signatures), donde viven los compute_fn del FormEngine, pattern para SECURITY DEFINER RPC en ApprovalEngine (approve/reject/modify).

### Group 5 - Forms Cat A (v0.0.5, pending)

9 tipos top con SOP papel + 6 sub-tipos F-05-01. Implementados como instancias del Engine stack (no codigo custom per form).

| Feature | Tipo | SOP | Mode + SLA |
|---|---|---|---|
| F10 | VACACIONES | F-05-03 | parallel sup+hr+pres / 72h |
| F11 | PRESTAMO | F-05-02 | parallel sup+hr+pres / 72h (R4: $250 cap operacional, NO threshold) |
| F12 | ACCION_PERSONAL parent | F-05-01 | parent_only |
| F12.1 | ACCION_AUMENTO_SALARIO sub | F-05-01 | parallel sup+hr+pres / 120h |
| F12.2 | ACCION_HORAS_EXTRAS sub | F-05-01 | parallel sup+hr+pres / 120h |
| F12.3 | ACCION_PERMISOS sub | F-05-01 | parallel sup+hr+pres / 120h |
| F12.4 | ACCION_DESCUENTO sub | F-05-01 | parallel sup+hr+pres / 120h |
| F12.5 | ACCION_DESPIDO sub | F-05-01 | parallel sup+hr+pres / 120h |
| F12.6 | ACCION_LIQUIDACION sub | F-05-01 | parallel sup+hr+pres / 120h |
| F13 | ACTUALIZACION_DATOS | F-00-07 | direct_hr_admin / 48h |
| F14 | RECLAMO_PAGO | F-05-05 | parallel sup+hr / 48h (PO-05 §5.11) |
| F15 | PERMISO horas | F-00-08 | parallel sup+hr / 48h |
| F16 | REFERENCIA_LABORAL | F-00-06 | direct_hr_admin / 120h (RRHH inicia, workflow inverso) |
| F17 | ENTREVISTA_SALIDA | F-00-05 | direct_hr_admin / 72h (RRHH inicia) |
| F18 | CAPACITACION | F-02-09 | parallel sup+hr / 168h |

Pre-requisito: leer cada SOP en `docs/sops/formularios/` ANTES de definir su `form_schema` JSONB. Skill `iconsa-form-implementation` cubre el patron end-to-end (R26 SOP-driven).

### Group 6 - Forms Cat B (v0.0.6, pending)

9 tipos sin SOP papel (designs basados en HRIS mercado + ICONSA context). PdfEngine usa template ICONSA-branded generico.

| Feature | Tipo | Mode + SLA |
|---|---|---|
| F19 | CARTA_TRABAJO | any_of_hr / 48h (mas solicitado) |
| F20 | CERTIFICACION_LABORAL | any_of_hr / 72h |
| F21 | CONSTANCIA_NO_ADEUDO | any_of_hr / 72h |
| F22 | COPIA_CONTRATO | any_of_hr / 48h |
| F23 | COPIA_COLILLA | any_of_hr / 48h |
| F24 | CAMBIO_CUENTA_BANCO | direct_hr_admin / 48h |
| F25 | CAMBIO_DEPENDIENTES | direct_hr_admin / 72h |
| F26 | SOLICITUD_EPP | parallel sup+hr / 72h |
| F27 | REPORTE_INCIDENTE | parallel sup+hr / 24h (critico construccion) |

Dependencia: Group 4 Engines completo. Sin engines no se puede instanciar tipos.

### Group 7 - Admin + UI tickets + extended (v0.0.7, pending)

| Feature | Pagina / responsabilidad |
|---|---|
| F28 | `/solicitudes` con 2 pestanas (Mis solicitudes / Por aprobar), filtros estado, busqueda, progress bar per ticket |
| F29 | `/solicitudes/nueva/[code]` FormEngine render + content educativo embebido (ej: D-02 en PRESTAMO) |
| F30 | `/solicitudes/[id]` detalle con timeline + RequestDetailRenderer + actions contextuales |
| F31 | `/admin` dashboard hr_admin + president: pendientes globales, asignacion rapida, metricas, accesos rapidos |
| F32 | `/admin/solicitudes/manual-entry` hr_admin crea en nombre del empleado con foto SOP papel (R25, ADR-0005 bypass chain) |
| F35 | Search global cross-entity en topbar (personas, solicitudes, KB, formularios) |
| F37 | `/admin/auditoria` audit log viewer hr_admin/admin (lee `audit.log`) |
| F38 | `/solicitudes/[id]/imprimir` PDF formato original SOP para firma fisica (cuando supervisor offline) |
| F39 | `/admin/tipos` admin viewer Nivel A read-only: lista 24 tipos + form_schema visualizado + approval_chain visual + SOP referencia. Edit JSON raw (Nivel B) v1.1; visual editor v2 |

Dependencia: Group 4 + Group 5 + Group 6 completos.

## Outstanding decisions (post-MVP, defer)

- "Gerencia General" = solo Rodrigo? O +VP +otros gerentes? Deferred a v1.1 (validacion con Samantha post-MVP uso real).
- `requests.approvals.approver_role='specific_person'` CHECK value: future-proofing o vestigial. Documentar conclusion al usarlo o eliminarlo.
- Manual entry F32 attachment versioning: replaceable via DELETE + INSERT en MVP (per [ADR-0005](adr/0005-manual-entry-bypass-chain.md)). Si crece a multi-version, evaluar.

## Promise state

- Declarado: `<promise>MVP_COMPLETE</promise>` (overnight #1)
- Status actual: PARTIAL. Done 2/7 groups (Group 1 + Group 2). Pending 5/7 groups (Group 3 a Group 7).
- Redimir como `MVP_COMPLETE` SOLO cuando: 7/7 tags verde + verify gate cada uno + docs vivos actualizados.
- Si overnight cierra antes con resto pendiente: `<promise>PARTIAL_MVP</promise>` con lista explicita en HANDOFF.md + actualizar este archivo.

## Mantenimiento

Reglas de update:
1. Al cerrar un group (verify gate green + tag aplicado): mover su status a `done`, llenar commit hash, agregar resumen deliverables clave + ADRs adoptados.
2. Al detectar bloqueador o decision pendiente que afecta tag plan: agregar a "Outstanding decisions" o status del group como `blocked`.
3. Al pivotear scope (ej: feature movida entre groups): actualizar tabla + razon + commit con mensaje `docs(roadmap): rebalance scope`.
4. Antes de cerrar cualquier sesion Code: verificar este archivo refleja realidad. Si no, sincronizar antes del handoff.
5. Memory equivalente en `~/.claude/projects/.../memory/project_humanos_mvp_status.md` debe sincronizarse cuando este archivo cambie macro (groups done/pending, no detalles).

Cualquier sesion fresca de Code: leer este archivo + `docs/CHANGELOG.md` + `docs/CONTEXT.md` + ADRs antes de proponer trabajo nuevo. NO basarse solo en HANDOFF.md (lesson `feedback_handoff_macro_roadmap` en memory).

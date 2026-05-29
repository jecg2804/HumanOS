# 09-ESTADO-ACTUAL.md — Snapshot live del proyecto

**Última actualización**: 2026-05-29 (full multi-agent audit + remediación parcial — ver CHANGELOG [Unreleased] Audit 2026-05-29)

**Owner update**: Claude Chat. Este es el doc más volátil — actualizar cada sesión con "qué se hizo, qué sigue, qué bloqueo existe".

---

## Estado high-level

**Fase actual**: Group 2 shipped en tag v0.0.2 (commit `32ef28b`). Group 3 (Profile + KB) en planning. Dos auditorías integrales corridas (2026-05-28 + 2026-05-29 full multi-agent con verificación adversarial).

**Migraciones aplicadas a la fecha**: hasta **046**. 039 (invite rate-limit + commitment), 040 (DROP backup), 041 (touch_updated_at search_path), 042 (drop dup constraint), 043 (find_auth sin encrypted_password), 044 (REVOKE SECURITY DEFINER grants → service_role-only), 045 (fix scd2 fn: audit action='custom' + actor people-id), 046 (revoke requests.audit_log UPDATE/DELETE).

**Config Data API (RESUELTO 2026-05-29)**: exposed-schemas ahora incluye `hr`, `notifications`, `audit` (antes solo public/humanos/graphql_public → la app fallaba con PGRST106; nadie lo había notado, 0 onboarded). Quitado `humanos` (prohibido R1). Apagado "auto-expose new tables". **Orden crítico respetado**: migración 044 (revoke grants) ANTES de exponer hr, para no activar escalada de privilegios.

**Remediación audit 2026-05-29 — DONE**: cluster seguridad (SEC-1/2/3 grants), BE-1 Cron retry, audit-log/actor cluster (DB-5), scd2 fn, admin route guard (BE-4/SEC-5), requests.audit_log revoke (DB-2). Commits `8b95fdd` `4f64ba5` `5ad21c4`.

**PENDIENTE P2 (próxima sesión, budget fresco)**: BE-2 idempotencia notif, BE-3 Sentry + rollback checks (también elimina el audit-write app-level de regenerate vía DB-1 triggers), FE-1 ~47 hex→tokens (26 files), FE-2 loading/error/not-found + 5 nav links rotos, FE-3 a11y, FE-4 mobile/PWA, DOC-2/3/4 docs drift, DB-1 audit triggers.

**Decisión grande pendiente (James/Samantha) pre-Group-4 engines**: ADR-0011 — BL-2 presidente self-approval, BL-3 form_schema source en 8 seeds, BL-4 requests.next_ticket_number + reset anual, BL-5 enum Devuelta_Info huérfano, BL-6 SLA escalación, BL-7 reglas delegación. + Group 3 scope freeze (F6-F9).

**Data layer paridad de mercado (pre-Group-5)**: leave_balances/accrual ledger (gap #1), hr.people_external_ids (citado en docs MDM, no existe), columnas réplica comp.

---

## Base de datos — estado verificado post-migrations

### Migrations aplicadas

| # | Migration | Resultado |
|---|---|---|
| 015 | create_hr_invite_codes | ✅ Tabla creada con RLS + 3 policies + 5 COMMENTs |
| 016 | fix_hr_team_app_roles_and_constraint | ✅ CHECK reducido a 4 valores. SCD-2: Samantha/Rocío/Milagros/Jerelyn → hr_admin / Rodrigo → president |
| 017 | populate_auth_users_allowed_apps | ✅ 48 auth.users con `["movimientOS"]`. 0 humanOS aún (esperado, sign-up pendiente) |
| 018 | seed_8_categoria_b_request_types | ✅ 8 nuevos tipos seedeados |
| 019 | add_received_processed_columns_tickets | ✅ Columnas R8 received_by/at + processed_by/at |
| 020 | redesign_approval_chain_template_jsonb | ✅ Todos los 24 tipos con `{mode, visibility, steps[]}` |
| 020b | add_president_to_sop_chains | ✅ President step agregado per SOP |
| 021 | add_manual_entry_columns_tickets | ✅ Columnas R25 manual_entry + created_by_hr_admin + index |
| 022 | create_hr_user_settings | ✅ Tabla creada + 3 policies + 370 backfilled |
| 023 | seed_invite_codes_bootstrap | ✅ 6 codes (5 equipo HR/president + 1 VP Ferrer) |
| 024 | add_files_category_constraint | ✅ CHECK con 13 valores válidos |
| 025 | add_hr_helper_functions | ✅ `hr.current_app_role()` + `hr.has_direct_reports()` + trigger auto-create user_settings |
| 026 | rename_constancia_trabajo_to_carta_trabajo | ✅ Tipo renombrado CARTA_TRABAJO (alineación SOP) |
| 027 | create_hr_employment_types | ✅ Tabla referencia con metadata operacional 4 valores per IC-RH-D-05 |
| 028 | add_employment_type_id_to_employments | ✅ FK nullable transitional |
| 029 | create_core_identities_schema_and_table | ⚠️ Aplicada → revertida 032 |
| 030 | seed_core_identities_from_hr_and_public | ⚠️ Aplicada → revertida 032 |
| 031 | link_hr_people_to_core_identities | ⚠️ Aplicada → revertida 032 |
| 032 | rollback_core_identities_schema | ✅ DROP SCHEMA core CASCADE. Decisión: MDM gradual per ADR-0005, no anticipar |

### Migrations Group 2 aplicadas (v0.0.2)

| # | Name | Resultado |
|---|---|---|
| 033 | `seed_onboarding_sops_m01_d07` | ✅ Seed IC-RH-M-01 + IC-RH-D-07 + VV01 versions (Blocker B2) |
| 034 | `create_find_auth_user_by_identifier` | ✅ SECURITY DEFINER lookup multi-app (ADR-0006). **Audit 2026-05-28 NEW.C**: return TABLE incluye `encrypted_password` innecesario — fix pendiente Batch 4 |
| 035 | `create_avatars_bucket_and_policies` | ✅ Bucket avatars + RLS subquery `auth_id` (Q3) |
| 036 | `add_outbox_indexes_and_enqueue_helper` | ✅ Indexes + helper enqueue + namespace `preferences->'notifications'` (I1) |
| 036b | `add_outbox_metadata_column` | ✅ ADD COLUMN metadata jsonb (patch 036) |
| 037 | `create_complete_onboarding_writes_rpc` | ✅ Idempotente + JOIN docs.sops→sop_versions (B3 + I3) |
| 038 | `create_apply_employment_scd2_change` | ✅ F5 SCD-2 helper |

### Próximas migrations Group 3 + Batch 4 BD hardening

Pendiente plan Group 3. Inputs anticipados del audit 2026-05-28:

| # | Name (propuesta) | Purpose |
|---|---|---|
| 039 | `column_comments_backfill` | Audit Batch 4: 38 tablas con `COMMENT ON COLUMN` faltantes (hr.user_settings 10/13, hr.employment_types 6/18, hr.medical_info 3/15) |
| 040 | `index_foreign_keys` | Audit Batch 4: 63 unindexed FKs HumanOS — concentrados requests.tickets supervisor/received/processed + hr.employments position/office antes que Group 4 tickets martillen |
| 041 | `harden_touch_updated_at_search_path` | Audit Batch 4: ALTER FUNCTION SET search_path (advisor `function_search_path_mutable`) |
| 042 | `redefine_find_auth_user_drop_encrypted_password` | Audit Batch 4 NEW.C: quitar `encrypted_password` del TABLE return |
| 043+ | `requests_next_sequence_security_definer` | Audit Batch 4 P1.4: feature-pending Group 4 — sequence bumper definer + policy bypass para `requests.sequences` |

### Schemas (verificado vía Supabase MCP)

| Schema | Status HumanOS |
|---|---|
| `public.*` | INTOCABLE — MovimientOS producción |
| `payroll.*` | INTOCABLE — sistema planillas |
| `humanos.*` | INTOCABLE — demo legacy v1 archivo |
| `hr.*` | HumanOS principal — master data cross-app |
| `requests.*` | HumanOS principal — core tickets |
| `docs.*` | HumanOS — KB, SOPs, signatures (0 SOPs aún — migration 033 los seedea) |
| `workflows.*` | HumanOS futuro — onboarding/offboarding |
| `performance.*` | HumanOS futuro v2 |
| `learning.*` | HumanOS futuro v2 |
| `audit.*` | HumanOS — log inmutable cross-app |
| `notifications.*` | HumanOS — outbox (0 rows aún) |
| `files.*` | HumanOS — storage polimórfico |

### Data crítica verificada (2026-05-27)

| Tabla | Rows | Notas |
|---|---|---|
| `hr.people` | **370** | 184 Activos + 186 Inactivos/históricos |
| `hr.employments` | **375** | 184 con `is_current=TRUE` |
| `hr.user_settings` | **370** | Backfilled. Default: email + in_app enabled, language='es', timezone='America/Panama'. `preferences` jsonb genérico — Group 2 usa namespace `notifications` aquí |
| `hr.invite_codes` (unconsumed) | **6** | Bootstrap: Samantha, Rocío, Milagros, Jerelyn, Rodrigo, Javier Ferrer |
| `hr.employment_types` | **4** | tiempo_indefinido / tiempo_definido / obra_determinada / servicios_profesionales |
| `requests.types` | **24** | 18 top-level + 6 sub-types ACCION_PERSONAL. Todos con `{mode, visibility, steps[]}` |
| `auth.users` | **48** | Todos con `raw_app_meta_data.allowed_apps = ["movimientOS"]`. HumanOS users agregados via sign-up |
| `docs.sops` | **0** | Migration 033 seedea IC-RH-M-01 + IC-RH-D-07 con VV01 versions |
| `notifications.outbox` | **0** | Worker pendiente Group 2 (Vercel Cron) |

### Equipo HR + Gerencia (verificado BD)

| Persona | employee_code | Cargo | app_role | auth_id | Invite code bootstrap |
|---|---|---|---|---|---|
| Samantha Kosmas | KOSM01 | Gerente RRHH y ADM | `hr_admin` | NULL | `F1F3D92A` |
| Rocío Olmedo | OLM206 | Oficial RRHH | `hr_admin` | NULL | `F1F738DF` |
| Milagros Manyoma | MAN943 | Oficial Planillas | `hr_admin` | NULL | `A4046851` |
| Jerelyn Mendoza | MEN943 | Asistente Adm RRHH | `hr_admin` | NULL | `A65376E1` |
| Rodrigo Eisenmann | EIS772 | Presidente | `president` | NULL | `8917F9DB` |
| Octavio Javier Ferrer | FER337 | Vice Presidente | `admin` (a revisar) | NULL | `A16E6D56` |

**Pre-onboarding context** (Chat verificó 2026-05-27):
- 50 personas con email `@iconsanet.com` (oficina)
- 60 con phone +507 solo (campo Suntracs)
- 74 sin email ni phone (data gap legacy, no MVP-onboardables sin captura adicional hr_admin)
- 2 personas con auth.user existing (multi-app): Rodrigo (EIS772, reisenmann@iconsanet.com), Javier Ferrer (FER337, ojferrer@iconsanet.com)

---

## ADRs commiteados Code-level (docs/adr/)

Sesión 2026-05-27 generó/actualizó 3 ADRs commiteados:

- **ADR-0006** (`2593f39`) — Service role admin client onboarding exception. Email/phone lookup via SECURITY DEFINER `hr.find_auth_user_by_identifier`. NO national_id en raw_app_meta_data (verificado vacío), NO public.people cross-schema (viola ADR-0005 Chat-level). **I3 absorbido**: capture-then-restore `originalAppMetadata` pre-updateUserById merge; rollback completo si RPC falla; RPC idempotente.
- **ADR-0007** (`2593f39`) — Employment type reference table. Tabla `hr.employment_types` con metadata operacional 4 valores per SOP IC-RH-D-05. NO `*_text` fallback.
- **ADR-0008 revisado** (`49a978a`) — Notifications in-app + email PRIMARY MVP, **Vercel Cron worker** (no Edge Function). Pattern INSERT same-tx, Reply-To pattern, domain `rein-eisenwerk.com`, `RESEND_FROM_EMAIL` standardized. **I1 absorbido**: reusar `hr.user_settings.preferences` jsonb con namespace `notifications` (no column nueva).

**Numeración**: Chat-level ADRs en `08-ADRs.md` (este project) y Code-level ADRs en `docs/adr/` del repo son **independientes**. Cross-reference ver `08-ADRs.md` sección "Cross-referencia Code-level".

---

## Decisiones grill cross-cutting 2026-05-27 (Q1-Q5 absorbidas)

1. **Q1 — F4 campos críticos (11)**: full_name, national_id, employee_code (opcional), position_id+text fallback, department_id+text fallback, office_id+text fallback, supervisor_id (nullable=president), hire_date requerido UI, app_role, delivery_target, employment_type_id requerido. Catalog fallback (b): link "No veo el mío" cambia input a text libre.
2. **Q2 — Wizard navigation**: useReducer client state, atomic commit step 10, lock invite_code post-validation, cero localStorage por R13 medical SENSITIVE, redirect `/perfil`, beforeunload guard.
3. **Q3 — Photo upload**: optional, single source `hr.people.photo_url`, bucket `avatars` RLS via subquery `auth_id` (fix del bug original auth.uid() vs id), resize 800x800 q0.85, pattern β-prima (pre-submit non-blocking). **B1 resolved**: upload pre-submit via server action `uploadOnboardingAvatarAction` (admin client gated by invite_code validity), preserva β-prima.
4. **Q4 — Password policy**: 10 chars min, no forced complexity, HIBP activo (Pro), copy-paste OK, no rotación. Switch sobre error.code (no i18n framework). 2FA defer v1.1 mandatorio hr_admin+president.
5. **Q5 — Step 5 "hay error"**: option C — `hr.people.needs_review=true` + `review_notes` append markdown structured + `notifications.outbox`. Severidad híbrida (leve continúa / crítica pausa wizard) con guidance UI explícita.

---

## Notifications + email setup

**Domain Resend verificado**: `rein-eisenwerk.com` (NO `iconsa.com.pa` que Chat propagó por error — corregido en commit 49a978a).

**Variables .env.local** (mantenidas por James):
```
RESEND_API_KEY=re_***
RESEND_FROM_EMAIL=HumanOS <notificaciones@rein-eisenwerk.com>
RESEND_REPLY_TO=samantha.kosmas@iconsanet.com
NEXT_PUBLIC_APP_URL=https://humanos.rein-eisenwerk.com
CRON_SECRET=<openssl rand -base64 32>
NOTIFICATION_TEST_EMAIL=jecg2804@gmail.com  # dev override, NO en producción
```

**Pattern Reply-To**: aplica a todos los emails EXCEPTO `password_reset` (self-service, no requiere respuesta humana). Implementación condicional en worker:
```typescript
const replyTo = template_code === 'password_reset' ? undefined : process.env.RESEND_REPLY_TO;
```

**Worker strategy (resolución Issue I2)**: **Vercel Cron + Next.js route handler** en `/api/cron/process-notifications`. Cron declarado en `vercel.ts` (knowledge update 2026 reemplaza `vercel.json`) con schedule `*/5 * * * *`. Auth: `x-vercel-cron` header (Vercel-signed) + `Authorization: Bearer ${CRON_SECRET}`. Templates single-source en `src/emails/*.tsx` (barrel export `src/emails/index.ts` para lookup dinámico por `template_code`). NO sync script entre filesystems — Vercel Cron corre en mismo Node runtime que el app.

**Per-user opt-in (resolución Issue I1)**: reusamos `hr.user_settings.preferences` jsonb existing con namespace `notifications`. Shape: `{ notifications: { email: { <type>: bool }, sms: {}, whatsapp: {} } }`. Helper `notifications.enqueue` lee `preferences->'notifications'->'email'->>type`, fallback TRUE si namespace absent (opt-in implícito hasta F33 settings UI). Los 4 booleanos legacy `notification_{email,in_app,sms,whatsapp}_enabled` quedan como master switch futuro F33. **NO migration nueva, NO column nueva**.

---

## Hosting

**HumanOS** custom domain: `humanos.rein-eisenwerk.com` (subdomain del domain personal James). DNS+HTTPS validados via probe HTTP (responde con redirect 307 a `/login?next=%2F`).

| App | Custom domain | Vercel project | Team |
|---|---|---|---|
| MovimientOS | `rein-eisenwerk.com` + `www.rein-eisenwerk.com` | `prj_o28h5tYDskqF3AjBg1w5W3F3fYu4` | `team_eF8Xr3TDs6yd5Q6nAhics6s3` |
| HumanOS | `humanos.rein-eisenwerk.com` | `prj_DqJQEL9LJ5qcwkw8Et6WYUpUxiLQ` | `team_eF8Xr3TDs6yd5Q6nAhics6s3` |

**Build status HumanOS actual**: último deployment ERROR (commit "Target docs"). Causa: script `scripts/copy-sops-to-public.ts:9:15` ENOENT buscando `Docs/SOPs, Formularios y Documentos` (path stale, real es `docs/sops/documentos/`). James confirmó: error del demo, ignorar — NO bloquea Group 2.

---

## Group 2 — shipped v0.0.2

**Plan ejecutado**: `docs/superpowers/plans/2026-05-27-group-2-onboarding.md` (5,832 líneas, untracked). Tasks 1-22 completos. Detalle granular vivo en `docs/CHANGELOG.md` sección v0.0.2.

**Resumen entregado**:
- F1 onboarding wizard 10 pasos (`/onboarding/[code]`) con multi-app merge ADR-0006
- F4 admin nuevo empleado + invite code auto
- F5 admin editar empleado + regenerate invite + SCD-2 helper
- F-04-01 emergency + medical (R13 sensible)
- F-01-09 acknowledgments M-01 + D-07
- `/forgot-password` + `/reset-password` anti-enumeration
- `/perfil` post-onboarding landing
- NotificationBell + dropdown + Realtime subscription
- Email worker Vercel Cron `/api/cron/process-notifications` schedule `*/5 * * * *`
- 7 email templates Resend con Reply-To pattern
- 8 archivos vitest (58 tests), 6 specs Playwright

**Verification gate v0.0.2** (per CHANGELOG):
- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors
- `npx vitest run`: 8 files / 58 tests green
- `npm run build`: production OK, 12 routes generated

**E2E branch temporal (Task 22)**: la suite Playwright corrió contra un Supabase branch temporal `group-2-e2e` creado para aislar el `count_auth_users` SECURITY DEFINER RPC + `e2e/.auth/hr_admin.json` storage state. Branch borrado por Chat 2026-05-28 post-tag v0.0.2 (cleanup discipline). Patrón branch-temporal-con-cleanup confirmado por James; constitution 5.7 wording pendiente aclaración via ADR-0016 (framework audit post-batches) para distinguir explícitamente daily-dev (prohibido) vs E2E-suite-temporal (permitido con cleanup).

**Audit 2026-05-28 detectó deuda en Group 2 shipped (no bloqueo, fix en Batch 3)**:
- **NEW.A** (P1): `validateInviteCodeAction` retorna `existing_multi_app_user` + `existing_email_masked` + preview PII sin OTP proof, sin rate limit, sin consumir invite — cross-app enumeration oracle. Fix Opción B quirúrgico planificado.
- **NEW.B** (P2): `reportOnboardingErrorAction` toma `person_id` client-controlled sin token de sesión.
- **P1.6**: server actions `/admin/empleados` (`createEmployeeAction`, `updateEmployeeAction`, `regenerateInviteCodeAction`) sin verificar `hr_admin` role — solo chequean `auth.getUser()`.
- **P2.14**: open redirect en `login/actions.ts:49` (`?next=https://evil` pasa Zod).

---

## Repositorio HumanOS

**Deploy actual**: https://humanos.rein-eisenwerk.com (último READY = `dpl_Es87K14sFybEBM2f4v9KzR4S3nk6`, latest ERROR pendiente fix del script `copy-sops-to-public.ts` — error del demo, no bloquea Group 2)
**Repo path**: `C:\Users\Jaime Cucalon\Documents\iconsa_apps\HumanOS`
**GitHub**: `https://github.com/ICONSA-Solutions/HumanOS`
**Branch**: trabajo directo en `main` (greenfield)
**Tag actual**: `v0.0.1` (Group 1 foundation)
**Próximo tag**: `v0.0.2` (Group 2 onboarding) — post-implementation + audit final

**Commits Group 2 (2026-05-27 noche → tag v0.0.2 en `32ef28b`)**:
- `2593f39` docs(adr): add 0006 + 0007 + 0008 (initial)
- `49a978a` docs(adr): revise 0008 — Vercel Cron + rein-eisenwerk + Reply-To
- `e2d196c` chore(deps): Group 2 deps + admin client lint guard
- `371319b` feat(admin): F4 nuevo empleado + F5 editar + regenerate invite + SCD-2 helper
- `5a42b62` feat(notifications): NotificationBell + dropdown + Realtime in topbar
- `c960156` feat(notifications): Vercel Cron worker process-notifications (I2 resolved)
- `bc009f0` test(e2e): onboarding happy + multi-app + error-report + admin + forgot-password
- `32ef28b` docs(changelog): v0.0.2 Group 2 onboarding complete

---

## Claude Code setup (post-recovery)

- Claude Code 2.1.150
- Windows 11 / PowerShell 5.1
- 4 marketplaces: claude-code-plugins, openai-codex, claude-plugins-official, superpowers-marketplace
- ~20 plugins instalados (superpowers, supabase, vercel, playwright, frontend-design, context7, etc.)
- Hooks ASCII puro v7 aplicados
- `.claude/settings.json` strict-schema sin BOM
- MCPs activos: Supabase, GDrive, Notion, Vercel, Filesystem, Resend (configurado disabled — no crítico)

**Pendiente Claude Code** (no crítico):
- mattpocock skills ya instaladas en `.claude/skills/{grill-with-docs,handoff,diagnose,setup-matt-pocock-skills}/` — verificado audit 2026-05-28
- Smoke tests bedrock
- Audit 2026-05-28 Batch 3 (code security) + Batch 4 (BD hardening) pendientes — ver `Lo que sigue` abajo

---

## Lo que sigue

### Group 2 — cerrado v0.0.2

✅ Migrations 033-038 aplicadas. ✅ ADRs 0006/0007/0008 commiteados. ✅ Tasks 1-22 ejecutados. ✅ Vercel Cron deploy validado. ✅ E2E 6 specs green. ✅ Tag v0.0.2 cortado en commit `32ef28b`.

### Audit 2026-05-28 (post Group 2 ship)

Hallazgos consolidados (50 items, mayoría reclasificados/diferidos a grupos futuros) generaron 4 batches de fixes:

- **Batch 1 — Quick wins safe** (gitignore HANDOFF.json + repomix XML + *.backup-* + hook debounce artifact, MCP pin 6 servers, deny list mínimo settings.json, hook hygiene "17→47" + matcher bypass, settings.local.json cleanup 12 quarantine entries, throttle post-tool-use 30s debounce): ✅ aplicado este commit
- **Batch 2 — Docs sync** (00-INDEX rewrite + paths reales, CHANGELOG [Unreleased] cleanup, este 09-ESTADO header + Group 2 status + migrations applied, 10-HANDOFF URL stale, 13-INTEGRATIONS HumanOS status, 02-MVP-SCOPE status section): ✅ aplicado este commit
- **Batch 3 — Code security** (NEW.A hardening Opción B quirúrgico: quitar `existing_*` del response + rate limit + invite single-use validation + token opaco para reportError, NEW.B reportOnboardingError token validation, P1.6 `requireHrAdmin` helper applied a 3 server actions admin, P2.14 open redirect allow-list, P2.16 matcher bypass — ya parcial en Batch 1, P3.43-now-P2 CRON_SECRET undefined check): pendiente
- **Batch 4 — BD hardening** (P1.3 backup.* DROP CASCADE aprobado James 2026-05-28, P2.22 hr.touch_updated_at search_path pin, P2.26 duplicate index hr.people drop, NEW.C redefinir hr.find_auth_user_by_identifier sin `encrypted_password`): plan SQL preparado por Code; Chat ejecuta via Supabase MCP. **P2.23 FK indexes 63 + P2.24 COMMENT ON COLUMN 38 tablas DIFERIDOS a checklist pre-Group-4** (Group 3 es Profile/KB, no toca tickets — registrar en memory de Code).

**Drifts diferidos a ADR-0016 (framework audit Chat-level post-batches)**:
- Constitution 5.7 wording: distinción daily-dev (prohibido) vs E2E-suite-temporal (permitido con cleanup) — pendiente amend con ejemplo `group-2-e2e`.
- Constitution 6.1 `docs/superpowers/specs/` folder claim — superpowers actual workflow no genera specs, solo plans. Resolución: amend 6.1 o instalar brainstorming skill que genere specs.
- Constitution R13 wording loose: omite DELETE special case `hr_admin`-only documentado en 05-BUSINESS-RULES.md R13.
- Constitution edits requieren ADR per sección 9 — por eso Chat redacta ADR-0016 (Chat-level), no Code unilateralmente.

### Group 3 — preparación

Pre-requisito: Batch 3 + Batch 4 cerrados antes de arrancar writing-plans Group 3.

Scope (per `02-MVP-SCOPE.md`):
- F6 `/perfil` base con secciones Datos personales / Empleo / Contacto / Emergencia / Datos médicos / Foto (versión básica)
- F7 `/perfil/editar` con SCD-2 admin-only fields (empleo, salario)
- F8 `/directorio` con búsqueda + filtros (departamento, supervisor, ubicación)
- F9 `/ayuda` KB **completa de carpeta RRHH GDrive** (manuales M, políticas D, IT, PO, formularios F) con full-text search

Pre-Group-3 también: form_schema backfill para 15 tipos sin schema (VACACIONES, PRESTAMO, ACCION_PERSONAL+6 subtipos, PERMISO, CARTA_TRABAJO, RECLAMO_PAGO, ACTUALIZACION_DATOS, ENTREVISTA_SALIDA, REFERENCIA_LABORAL, CAPACITACION) — workflow propio con skill `iconsa-form-implementation`.

---

## Bloqueos / riesgos

| Riesgo | Mitigación |
|---|---|
| Overnight no completa | HANDOFF.json via hook PreCompact. Resume en próxima sesión |
| Form schemas mal diseñados se propagan | Code lee SOPs primero, skill `iconsa-form-implementation` con templates |
| RLS policies rotas | Skill `iconsa-rls-validation` + subagent `rls-validator` antes de feature done |
| Email entrega fallida silente | Worker pre-flight check `if (!RESEND_API_KEY \|\| !RESEND_FROM_EMAIL) skip`. Verify Resend domain status pre-cutover |
| CRON_SECRET leak | env var solo en Vercel Dashboard + .env.local local, never committed. Route handler valida `x-vercel-cron` header OR Bearer match |
| Encoding BOM/non-ASCII regresión | Hook PostToolUse valida + R23 |
| Personal de campo no completa sign-up | F32 manual entry como fallback. hr_admin completa en su nombre |

---

## Quick reference

**Próxima sesión Chat al abrir**:
1. Verificar este doc (`09-ESTADO-ACTUAL.md`) primero
2. Verificar `CHANGELOG.md` para últimos commits Code
3. Verificar Supabase MCP `execute_sql` el state real BD
4. Verificar Vercel MCP latest deployment status

**Próxima sesión Code al abrir**:
1. Lee `CLAUDE.md` raíz (≤4.3KB)
2. Sigue `docs/05-BUSINESS-RULES.md` para R1-R26
3. Sigue `docs/07-SCHEMAS-PERMISOS.md` para qué tocar
4. Sigue `docs/CONTEXT.md` para vocabulario dominio
5. Usa skills `iconsa-*` cuando aplique
6. Documenta decisiones en `docs/adr/`
7. Mantén `docs/CHANGELOG.md` per commit/feature
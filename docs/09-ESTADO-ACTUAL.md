# 09-ESTADO-ACTUAL.md — Snapshot live del proyecto

**Última actualización**: sesión 2026-05-27 nocturna post-audit-2 (Code aplicó correcciones plan Group 2, ADR-0008 revisión commiteada 49a978a, pre-Task 1)

**Owner update**: Claude Chat. Este es el doc más volátil — actualizar cada sesión con "qué se hizo, qué sigue, qué bloqueo existe".

---

## Estado high-level

**Fase actual**: Group 1 (foundation auth) en producción tag v0.0.1. Group 2 (onboarding) plan corregido tras audit Chat (5,832 líneas, untracked). Pre-implementation Task 1.

**Decisión grande pendiente**: NINGUNA. Audit 2 absorbió 3 blockers + 3 issues + correcciones globales. Plan listo para audit final.

**Próxima acción**: Audit final Chat → Task 1 starts.

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

### Próximas migrations Group 2 (post-audit numbering final)

Pendientes de aplicar via Code durante implementation:

| # | Name | Purpose |
|---|---|---|
| **033** | `seed_onboarding_sops_m01_d07` | **Blocker B2**: seed IC-RH-M-01 (Manual Ética) + IC-RH-D-07 (Política Trabajo Infantil) + VV01 versions |
| **034** | `create_find_auth_user_by_identifier` | ADR-0006: SECURITY DEFINER lookup multi-app |
| **035** | `create_avatars_bucket_and_policies` | Q3 grill: bucket + RLS subquery `auth_id` |
| **036** | `add_outbox_indexes_and_enqueue_helper` | Issue I1 resolved (sin nueva column — reuse `preferences` jsonb namespace `notifications`) |
| **037** | `create_complete_onboarding_writes_rpc` | Blocker B3 + Issue I3: RPC con JOIN docs.sops→sop_versions WHERE is_current, idempotente |
| **038** | `create_apply_employment_scd2_change` | F5 SCD-2 helper |

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

## Group 2 plan status — POST AUDIT 2

**Plan**: `docs/superpowers/plans/2026-05-27-group-2-onboarding.md` (5,832 líneas, untracked).

**Audit Chat 2 → Code Plan Mode → corrected plan**:

🔴 Blockers resueltos:
- **B1**: server action `uploadOnboardingAvatarAction` (admin client gated por invite_code validity). β-prima preservado. Helper cliente `uploadAvatar` mantenido scope F5 admin edit + F33 self-service.
- **B2**: nueva Task 2A + migration 033 seedea `IC-RH-M-01` (Manual Ética) + `IC-RH-D-07` (Política Trabajo Infantil) + `VV01` versions con `file_url='/sops/{code}.pdf'`. PDF serving via existing `copy-sops-to-public.ts` prebuild script.
- **B3**: RPC `complete_onboarding_writes` (migration 037) resuelve `sop_version_id` via JOIN `docs.sops → docs.sop_versions WHERE is_current=true`. `signature_method='click'` (matches CHECK constraint). `ip_address`+`user_agent` passed como params del server action.

🟡 Issues resueltos:
- **I1**: NO migration nueva. Reutilizamos `hr.user_settings.preferences` jsonb existing con namespace `notifications`. Helper `notifications.enqueue` lee `preferences->'notifications'->'email'->>type`, fallback TRUE.
- **I2**: Task 21 reescrito completamente — Vercel Cron + Next.js route handler `/api/cron/process-notifications`. `vercel.ts` declara crons declarativamente. Templates single-source `src/emails/`. Auth via `x-vercel-cron` header + `CRON_SECRET`.
- **I3**: `completeOnboardingAction` captura `originalAppMetadata` antes de updateUserById merge. Si RPC falla: NEW user → deleteUser, EXISTING user → updateUserById restaura. RPC 037 idempotente (UPDATE auth_id solo si NULL or matches, WHERE NOT EXISTS para child inserts, ON CONFLICT DO UPDATE para medical_info).

🔵 Correcciones globales aplicadas:
- `iconsa.com.pa` → `rein-eisenwerk.com` (replace_all plan + ADR-0008 rewrite commit 49a978a)
- `RESEND_FROM_ADDRESS` → `RESEND_FROM_EMAIL` (replace_all)
- `RESEND_FROM_EMAIL=HumanOS <notificaciones@rein-eisenwerk.com>` confirmado
- Nuevas env vars: `RESEND_REPLY_TO`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`
- Migrations renumeradas 029-034 → **033-038** + nueva 033 SOPs seed pre-Task 16
- Reply-To header pattern documentado en ADR-0008 + Task 21

**Pre-execution checklist expandido a 10 items** (Code documentó detalles operacionales).

**Estado**: Audit final Chat → Task 1 starts.

---

## Repositorio HumanOS

**Deploy actual**: https://humanos.rein-eisenwerk.com (último READY = `dpl_Es87K14sFybEBM2f4v9KzR4S3nk6`, latest ERROR pendiente fix del script `copy-sops-to-public.ts` — error del demo, no bloquea Group 2)
**Repo path**: `C:\Users\Jaime Cucalon\Documents\iconsa_apps\HumanOS`
**GitHub**: `https://github.com/ICONSA-Solutions/HumanOS`
**Branch**: trabajo directo en `main` (greenfield)
**Tag actual**: `v0.0.1` (Group 1 foundation)
**Próximo tag**: `v0.0.2` (Group 2 onboarding) — post-implementation + audit final

**Commits sesión 2026-05-27 nocturna**:
- `2593f39` docs(adr): add 0006 + 0007 + 0008 (initial)
- `49a978a` docs(adr): revise 0008 — Vercel Cron + rein-eisenwerk + Reply-To

---

## Claude Code setup (post-recovery)

- Claude Code 2.1.150
- Windows 11 / PowerShell 5.1
- 4 marketplaces: claude-code-plugins, openai-codex, claude-plugins-official, superpowers-marketplace
- ~20 plugins instalados (superpowers, supabase, vercel, playwright, frontend-design, context7, etc.)
- Hooks ASCII puro v7 aplicados
- `.claude/settings.json` strict-schema sin BOM
- MCPs activos: Supabase, GDrive, Notion, Vercel, Filesystem, Resend (configurado disabled — no crítico)

**Pendiente Claude Code** (no crítico para arrancar):
- mattpocock plugins install (grill-with-docs, handoff, diagnose, git-guardrails)
- Smoke tests bedrock

---

## Lo que sigue

### Sesión actual (cierre)

1. ✅ Migrations BD 015-032 aplicadas (incluyendo rollback 032)
2. ✅ Grill cross-cutting Q1-Q5 resuelto
3. ✅ ADRs 0006/0007/0008 commiteados (incluye 49a978a revisión)
4. ✅ Group 2 plan inicial Code (5,578 líneas)
5. ✅ Audit Chat 1: 3 blockers + 3 issues + correcciones globales
6. ✅ Code Plan Mode → plan corregido (5,832 líneas)
7. ✅ Code aplicó B1+B2+B3+I1+I2+I3 + globales
8. 🟡 Audit final Chat in-progress
9. 🟡 Task 1 Group 2 starts post-approval

### Sesión siguiente (Code implementation)

1. Tasks 1-23 ejecución con migrations 033-038
2. Vercel Cron deploy + verificación schedule
3. E2E tests (happy + multi-app + error report + admin + forgot-password)
4. Tag v0.0.2

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
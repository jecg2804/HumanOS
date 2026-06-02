# HumanOS Project Constitution

Principios **non-negotiable**. Anulan conveniencia, deadlines, y cualquier sugerencia de agent en contra. Si Code intenta violarlos, hooks deterministas bloquean. Si Jaime decide cambiarlos, requiere ADR explícito en `docs/adr/` (ver `docs/adr/README.md`).

## 1. Database integrity

**1.1 SCHEMAS PROHIBIDOS** — bloqueados por hook `PreToolUse`:
- `public.*` — MovimientOS production de otro proyecto en mismo Supabase
- `payroll.*` — sistema planillas de compañero de Jaime
- `humanos.*` — legacy v1 demo, **schema dropeado 2026-06-02 (W3 SEC-LEGACY)**; prohibición se mantiene contra recreación; data consolidada en `hr.*` + snapshot en `backup.*`

**1.2 SCHEMAS TOCABLES** — DDL + DML libre con validaciones:
- `hr.*`, `requests.*`, `docs.*`, `workflows.*`, `audit.*`, `notifications.*`, `files.*`, `performance.*`, `learning.*`
- Futuros MDM/ETL (reservados; al llegar la primera integración externa): `mdm.*`, `etl.*`, `backup.*`

**1.3 Toda migration lleva COMMENT** — `COMMENT ON TABLE` + `COMMENT ON COLUMN` para columnas no obvias. Sin esto el Supabase Dashboard queda inutilizable para Samantha.

**1.4 RLS obligatorio** — toda tabla nueva en schemas HumanOS tiene `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + mínimo 1 policy SELECT. Validar post-creación con skill `iconsa-rls-validation`. Sin excepciones.

**1.5 Helpers existentes — NO redefinir**:
`hr.current_person_id()`, `hr.current_app_role()`, `hr.is_hr_admin()`, `hr.is_president_or_admin()`, `hr.is_supervisor_of()`, `hr.has_direct_reports()`, `requests.can_view_ticket()`, `hr.touch_updated_at()`. Verificar lista actual via `pg_proc` antes de crear nuevas.

**1.6 Migrations via MCP** — Code usa `Supabase:apply_migration` con nombre snake_case (`NNN_action_target`). Nunca DDL via Dashboard.

## 2. Language and communication

**2.1 UI text en español neutro Panamá.** NUNCA voseo argentino:
- ❌ "vos", "tenés", "podés", "querés"
- ❌ Imperativos con tilde aguda: "registrá", "verificá", "ajustá", "pegáme"
- ✅ "tú", "tienes", "puedes", "quieres"
- ✅ Imperativos sin tilde aguda: "registra", "verifica", "ajusta", "pásame"

**2.2 Code identifiers en inglés**: tabla names, function names, variable names, file names.

**2.3 Business logic comments**: español permitido cuando refleja terminología SOP.

**2.4 Tono profesional accesible.** Usuarios incluyen ingenieros, conductores, soldadores. Lenguaje claro sin jerga corporativa innecesaria.

## 3. Code quality

**3.1 TypeScript strict** — no `any`, no `@ts-ignore`, no `@ts-expect-error` sin comentario justificando.

**3.2 Tests son backpressure obligatorio** — no commit sin:
- `npx tsc --noEmit` → 0 errors
- `npm run lint` → 0 errors
- `npx vitest run` → all green
- `npx playwright test` → all green (si UI cambió)
- `npm run build` → success

**3.3 NO placeholders ni stubs.** Implementación completa o documentar blocker.

**3.4 Single source of truth** — no migrations layer, no adapter shims duplicando lógica. Si tests unrelated fallan, fix como parte del increment.

**3.5 Conventional commits** — `type(scope): description`. Types: feat, fix, chore, docs, test, refactor.

## 4. Reglas de negocio críticas

Las 27 reglas R1-R27 viven en `docs/reference/business-rules.md`. Highlights non-negotiable:

**R4 — Préstamo $250**: cap operacional, NO escalation threshold. TODOS los préstamos van por el chain completo (supervisor + hr_admin + president) según R26. ICONSA NO cobra intereses.

**R5 — No self-approval**: aprobador ≠ requester. Validación en **código** (ApprovalEngine), NO en BD constraint. Code valida antes de persistir approval.

**R6 — Fallback supervisor NULL**: si `selected_supervisor_id IS NULL`, hr_admin actúa solo. No es excepción — es comportamiento normal en parallel mode.

**R7 — Sello aprobación**: formato `"Aprobado por [full_name], [YYYY-MM-DD], [HH:MM:SS]"` + `stamp_data` JSONB con signer_id, signer_name, signer_role, signed_at, ip, user_agent.

**R8 — F-05-01 dos pasos**: tipo ACCION_PERSONAL trackea `received_by` + `processed_by` (uuid hr.people) post-approval, separados del chain.

**R9 — 3 opciones aprobador**: Aprobar / Rechazar con observaciones / Modificar valor con razón. Modificación va a `requests.revisions` con `status='Pendiente_Aceptacion'`.

**R10 — Concepto único usuario**: NO tipos cuenta separados. `app_role` sin valor `'supervisor'` — emergencia contextual via `hr.employments.supervisor_id` + `tickets.selected_supervisor_id`.

**R13 — Documentos sensibles**: `hr.medical_info` y `hr.personal_documents` SOLO accesibles por owner + hr_admin. NO supervisores, NO directorio.

**R14 — Auth invite codes**: NO sign-up libre. `hr.invite_codes` + onboarding wizard 10 pasos. Triple validación: code + national_id + employee_code.

**R16 — Estados ticket**: `Borrador` → `Enviada` → `En_Revision` → (`Aprobada` | `Rechazada` | `Devuelta_Modificacion`) → `Completada` | `Cancelada`. CHECK constraint con estos 8 valores.

**R17 — request_number format**: `HUM-YYYY-NNNN` con secuencia atomic via `requests.sequences`.

**R22 — auth.users destructive ops**: DELETE/UPDATE mass requieren filter `raw_app_meta_data->'allowed_apps'` (SQL) o `app_metadata->'allowed_apps'` (JS/RLS). Snapshot `backup.auth_users_YYYYMMDD` antes. Hook `PreToolUse` bloquea unfiltered. Incident 2026-05-25 documentado.

**R23 — Encoding**: archivos config UTF-8 sin BOM. Hooks `.ps1` ASCII puro. Use `[System.IO.File]::WriteAllText` con `UTF8Encoding(false)` en PS 5.1.

**R24 — Approval chain JSONB**: 4 modes (`parallel | direct_hr_admin | any_of_hr | parent_only`) con estructura `{mode, visibility, steps[]}`. NO inventar modes nuevos.

**R25 — Manual entry F32**: hr_admin crea ticket en nombre del empleado con foto del form papel. `manual_entry=true`, `created_by_hr_admin=<id>`. Foto en `files.uploads` con `category='original_paper_form'`. NO columna nueva para attach.

**R26 — SOP-driven chains**: NUNCA desviarse del SOP papel ICONSA sin validar con Samantha. Si SOP dice "Gerencia General", agregar step `president` (validar con Samantha si VP/otros gerentes incluyen).

**R27 — Compliance Ley 81**: datos personales/sensibles (médicos) bajo Ley 81/2019 Panamá. Consentimiento versionado antes de capturar datos médicos/emergencia (Step6/7 onboarding); loggear acceso de LECTURA a `hr.medical_info` / `hr.personal_documents` desde día 1. Detalle + checklist legal en `docs/reference/compliance-ley81.md`.

## 5. Architecture decisions (locked in)

**5.1 Stack**: Next.js 16 App Router + TS strict + Tailwind 4 + Supabase + Vercel. No cambiar sin ADR.

**5.2 NO payroll**: ICONSA usa Payday (sistema externo). HumanOS NO maneja nómina.

**5.3 `hr.*` cross-app master data**: otras apps ICONSA pueden leer `hr.people` vía RLS. NO duplicar persona data.

**5.4 Custom build, NO HRIS open-source**: decisión tomada. No reabrir.

**5.5 Repo `human-os` reusa in-place**: no crear repo nuevo. Trabajo directo en `main`.

**5.6 Modelo de ejecución: directo a `main`, atendido.** NO existe build overnight autónomo — fue aspiracional, nunca real (Groups 1-2 se hicieron human-in-the-loop). Modelo real: las fases de diseño (brainstorm → spec → grill → plan) son **atendidas** (Jaime decide en cada gate); una vez aprobado un plan, Code lo ejecuta a completitud sin interrupción. Trabajo directo en `main` (greenfield, sin users en prod, dev solo); CI es la señal visible + `npm run verify` verde antes de push; si algo entra rojo, Jaime revierte. Ejecución desatendida ("overnight") solo es viable con un spec bien definido + descompuesto en tasks sin decisiones abiertas — no es el default, nunca para diseño. Ver ADR-0026 (modelo de trabajo).

**5.7 NO branches Supabase como dev environment**: producción es source of truth. Local dev usa `supabase start` cuando se necesite.

## 6. Process discipline

**6.1 Specs en `docs/superpowers/specs/`** — Code genera vía `/brainstorming` + `writing-plans`. Source of truth para implementación.

**6.2 Plans en `docs/superpowers/plans/`** — tasks atómicas con código completo en steps, self-review obligatorio.

**6.3 ADRs en `docs/adr/`** — Code genera vía `grill-with-docs` cuando hay decisión arquitectónica.

**6.4 `docs/CHANGELOG.md`** — Code mantiene fresh con cada cambio BD (formato `[bd]` o `[seed]`) y commit técnico.

**6.5 Self-review obligatorio en cada plan**: spec coverage, placeholder scan, type consistency.

**6.6 Tag per successful loop**: patch increment (v0.0.1 → v0.0.2).

## 7. Stakeholder boundaries

**7.1 Samantha Kosmas (Gerente RRHH)** es decision authority para reglas de negocio. Cambios en flujos de aprobación, campos de formularios, política de vacaciones — requieren confirmación.

**7.2 Jaime Cucalón** es product owner / architect. Decisión técnica final. NO escribe código de producción.

**7.3 Un solo set de docs** en `docs/` (topicales en `reference/` + CONTEXT + ADRs, ver ADR-0024), NO separado por audiencia. Cualquier agente (implementer o reviewer) lee el mismo set; el implementer ejecuta vía `apply_migration` / `execute_sql` sobre schemas permitidos (hook valida).

**7.4 HumanOS NO es producto comercial**. App interna ICONSA. NO es SaaS multi-tenant. Arquitectura optimiza para 1 tenant.

## 8. Anti-scope (NO se construye en MVP)

- ❌ Sistema de nómina (Payday lo maneja)
- ❌ Marcación de asistencia / control biométrico de horario
- ❌ Portal público para candidatos externos
- ❌ Mobile app nativa (es PWA mobile-first, no nativa)
- ❌ Multi-idioma (solo español, por ahora)
- ❌ Multi-empresa / multi-tenant
- ❌ Integración con redes sociales
- ❌ Gamification / badges / leaderboards
- ❌ Firma digital legal (Documenso entra en v1.1)
- ❌ Anotaciones inline por campo en approvals (v2 lejano)

## 9. Mantenimiento del constitution

Cambios a este documento requieren:
1. ADR explícito en `docs/adr/` (ver `docs/adr/README.md`) con razón documentada
2. Approval de Jaime por escrito (chat o PR)
3. Update de `docs/STATUS.md` reflejando el cambio
4. Si afecta hooks: actualizar `.claude/hooks/*.ps1` también

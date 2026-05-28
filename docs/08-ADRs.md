# 08-ADRs.md — Architectural Decision Records (Chat-level)

**Última actualización**: 2026-05-28 (audit Batch 1+2 — fix typo + cross-reference Code-level ADRs 0006/0007/0008 verificados post v0.0.2)

ADRs aquí son decisiones de nivel Chat (estratégicas). Code genera ADRs técnicos en `docs/adr/` del repo durante implementación.

**Numeración independiente**: este doc (08-ADRs.md) tiene su propia secuencia 0001-0014 para decisiones Chat-level. El repo HumanOS tiene `docs/adr/` con su propia secuencia 0001-0008 para decisiones Code-level (implementación específica). Ver sección "Cross-referencia Code-level" al final para mapping.

---

## ADR-0001 — Stack tecnológico

**Status**: Accepted
**Date**: 2026-05-20

Next.js 16 + TypeScript 5+ + Tailwind 4 + Supabase + Vercel. Razón: convergence con MovimientOS, costo cero adicional (mismo Supabase project), shared auth, deploy unificado.

Alternativas descartadas: Remix (menos plugins Supabase), tRPC standalone (re-inventar lo que Supabase Auth + RLS ya da).

---

## ADR-0002 — Schemas modulares en BD compartida

**Status**: Accepted
**Date**: 2026-05-21

HumanOS usa schemas `hr.*`, `requests.*`, `docs.*`, `workflows.*`, `audit.*`, `notifications.*`, `files.*`, `performance.*`, `learning.*` en MISMA BD que MovimientOS (`public.*`) y planillas (`payroll.*`).

Razón: cost (single Supabase project), eventual data convergence MDM, FK integrity entre apps cuando aplique.

Risk: cross-schema RLS más complejo. Mitigación: helpers `hr.current_*()` + R1 hard rule no tocar prohibidos.

---

## ADR-0003 — Auth multi-app via allowed_apps

**Status**: Accepted (refinado 2026-05-27)
**Date**: 2026-05-22

`auth.users.raw_app_meta_data.allowed_apps` JSONB array (e.g. `["movimientOS", "humanOS"]`) determina qué apps puede usar el user.

Misma persona = mismo auth.user. NO duplicar users per app.

**Refinamiento 2026-05-27**: sign-up HumanOS detecta `auth.users` con `email` O `phone` match (NO `national_id` que NO existe en `raw_app_meta_data` — verificado vacío en BD). Si existe Y `allowed_apps` no contiene 'humanOS' → append via `auth.admin.updateUserById` con spread merge. Sino crea nuevo auth.user via `auth.admin.createUser`. Ver Code-level **ADR-0006** (`docs/adr/0006-service-role-admin-client-onboarding-exception.md`) para algoritmo detallado, incluyendo capture-then-restore pattern para rollback gap si RPC falla post-merge.

---

## ADR-0004 — Invite codes para sign-up

**Status**: Accepted
**Date**: 2026-05-22

Pattern: hr_admin genera `hr.invite_codes` row → empleado consume vía `/onboarding/[code]` wizard 10 pasos.

Triple validación: code + national_id + employee_code opcional.

Alternativa descartada: self-signup abierto (security risk).

---

## ADR-0005 — MDM gradual (no big-bang)

**Status**: Accepted (reafirmado post-rollback 2026-05-27)
**Date**: 2026-05-23

Person canonical eventual en `mdm.persons`. MVP usa `hr.people` como source HumanOS. Duplicación temporal hr.people ↔ public.people aceptada hasta otra app pida MDM.

Cuando aplique: `mdm.persons` + sync triggers + deprecar `public.people` y `hr.people` lentamente.

**Lección 2026-05-27**: intento prematuro de crear `core.identities` schema (migrations 029-031) fue rollbackeado en migration 032. Violaba este ADR al anticipar MDM antes de que otra app lo demandara. Reafirmación: MDM se hace cuando hay PULL (segunda app necesita identity unificada), no PUSH (Chat anticipando).

---

## ADR-0006 — Engines genéricos vs custom per feature

**Status**: Accepted
**Date**: 2026-05-24

Construir engines E1-E6 una vez (FormEngine, ApprovalEngine, ChainResolver, StampEngine, PdfEngine, NotificationEngine) y reutilizar. NO custom logic per form variant.

`requests.types.form_schema` y `approval_chain_template` JSONB dirigen el behavior. Add new tipo = INSERT en `requests.types`, no code change.

---

## ADR-0007 — Triple stack docs

**Status**: Accepted
**Date**: 2026-05-25

Project Files (Chat) / `docs/` repo (Code) / wiki cross-app (futuro).

Razón: separación de concerns por audiencia. Project Files contienen strategy + history. Repo docs son operativos. Wiki será compartido cross-app.

---

## ADR-0008 — Hooks ASCII + JSON strict (lección 2026-05-25)

**Status**: Accepted (post-incident)
**Date**: 2026-05-25

`.claude/settings.json` strict-schema sin BOM. Hooks `.ps1` ASCII puro. UTF-8 sin BOM en todo config.

Razón: incidente donde BOM + non-ASCII rompió harness Claude Code. Recovery completa documentada.

Enforcement: hook PostToolUse + audit script + R23.

---

## ADR-0009 — Framework cherry-pick (no monolítico)

**Status**: Accepted
**Date**: 2026-05-26

Cherry-pick: Superpowers (workflow harness) + mattpocock (grill-with-docs, handoff, diagnose, git-guardrails) + ICONSA custom skills + custom hooks.

Razón: cada plugin tiene fortalezas. Monolítico = adoptar limitaciones.

Risk: combinaciones inesperadas. Mitigación: smoke tests bedrock + isolation per skill.

---

## ADR-0010 — auth.users destructive ops protection (R22)

**Status**: Accepted (post-incident)
**Date**: 2026-05-25

`auth.users` compartido entre apps. `DELETE FROM auth.users` sin WHERE filtro `allowed_apps` borró 47 users en incidente.

Enforcement: hook PreToolUse bloquea queries peligrosas + R22 documentada + snapshot pre-op obligatorio + SELECT preview con approval explícita.

---

## ADR-0011 — Approval chain template JSONB con modes finales (REESCRITO)

**Status**: Accepted (revised 2026-05-27)
**Date**: 2026-05-26 inicial, 2026-05-27 final
**Supersedes**: versión inicial con `sequential` + threshold lógica

`requests.types.approval_chain_template` JSONB con estructura:

```json
{
  "mode": "parallel" | "direct_hr_admin" | "any_of_hr" | "parent_only",
  "visibility": "universal",
  "steps": [
    {
      "step_id": 1,
      "role": "supervisor" | "hr_admin" | "president",
      "resolver": "selected_supervisor_id" | "any_hr_admin" | "president_user",
      "sla_hours": 72,
      "required": true
    }
  ]
}
```

### Modes (3 + parent_only)

| Mode | Comportamiento |
|---|---|
| `parallel` | Todos stakeholders notificados día 0. Aprobada cuando TODOS required = approved. Rechazada si ALGUNO = rejected |
| `direct_hr_admin` | Sin chain, cualquier hr_admin actúa |
| `any_of_hr` | Idéntico a direct (semantic distinct para documentos) |
| `parent_only` | Tipo parent (ACCION_PERSONAL), sub-tipos llevan chain real |

### Decisiones clave incorporadas

1. **Eliminado mode `sequential`**: no aplica al pattern HumanOS donde RRHH siempre debe ver desde día 0
2. **$250 PRESTAMO NO bloqueante** — cap operacional. TODOS los préstamos van al chain completo paralelo
3. **President día 0** cuando aplica (no como step final) — paralelo total
4. **R26 SOP-driven**: chain refleja SOP papel. NO desviarse sin validar con Samantha
5. **`allow_supervisor_override = true`** en todos los tipos con step supervisor — solicitante elige supervisor real del ticket (no hardcoded de `hr.employments.supervisor_id`)
6. **Eliminado `'supervisor'` como app_role** — emerge contextualmente de `selected_supervisor_id` o `supervisor_id` en employments

### Resolvers

- `selected_supervisor_id` — usa `tickets.selected_supervisor_id` (override solicitante), fallback `hr.employments.supervisor_id`
- `any_hr_admin` — cualquier `app_role='hr_admin'`
- `president_user` — `app_role='president'` (Rodrigo único MVP)

### Decisión "Gerencia General" pending Samantha (v1.1)

Si Samantha confirma incluir Javier Ferrer (VP) u otros gerentes:
- Opción A: extender `resolver` a `gerencia_user_list` con array UUIDs paralelo
- Opción B: cambiar `app_role` de FER337 + otros gerentes a `'president'`
- Decisión post-MVP en F39-B v1.1 cuando Samantha tenga claridad uso real

---

## ADR-0012 — Manual entry F32 sin column nueva (AJUSTADO)

**Status**: Accepted (revised 2026-05-27)
**Date**: 2026-05-26 inicial, 2026-05-27 final

hr_admin crea solicitud en nombre de empleado vía `/admin/solicitudes/manual-entry`.

**Schema**:
- `requests.tickets.manual_entry boolean NOT NULL DEFAULT false`
- `requests.tickets.created_by_hr_admin uuid REFERENCES hr.people(id)`

**Foto del original**: usa `files.uploads` polimórfico con `category='original_paper_form'`. NO se crea columna `original_paper_attachment_id` (eliminada del diseño inicial). Pattern consistente con todo otro upload del sistema.

**Razón cambio**: una columna específica sería single-purpose. `files.uploads` ya es polimórfico (`entity_schema + entity_table + entity_id`) y soporta múltiples adjuntos por ticket. Constraint `files.uploads.category` CHECK con 13 valores válidos enforced (migration 024).

**Audit completo**: `audit.log` registra `actor_id=hr_admin`, `record_id=ticket_id`, `metadata={manual_entry: true, original_paper_uploads: [<files.uploads.id>]}`.

**Razón business**: realidad operacional ICONSA = personal campo sin app + supervisores acostumbrados papel + transición papel-digital gradual.

---

## ADR-0013 — Admin viewer approval chains F39 (NUEVO)

**Status**: Accepted
**Date**: 2026-05-27

**Decisión**: Implementar admin viewer Nivel A read-only en MVP. Edit JSON raw (B) + Visual editor (C) diferidos a v1.1/v2.

### Niveles

| Nivel | Esfuerzo | Entrega | Versión |
|---|---|---|---|
| **A. Read-only viewer** | Trivial | `/admin/tipos/[code]` muestra cada tipo con: form_schema preview (campos), approval_chain visual (steps con role+SLA), SOP referencia link | **MVP F39** |
| B. Edit JSON raw | Bajo | + Botón "Editar JSON" con textarea + validación server-side. Para hr_admin avanzado | v1.1 |
| C. Visual editor | Alta | Drag-drop steps, dropdowns resolver, sliders SLA, condicionales visuales | v2 |

### Justificación

- Samantha necesita visibilidad de qué está configurado (Nivel A da 80% del valor)
- Pattern industria: BambooHR/Workday tienen workflow designer pero es feature de años
- En MVP, James edita JSONB directo cuando Samantha pide cambios
- Cuando Samantha tenga feedback real de uso, decidimos Nivel B (cuál UX prefiere ella editar)

### Alternativa descartada

Implementar Nivel C en MVP. Sobre-engineering. Samantha primero necesita USAR el sistema antes de tener opinión informada de qué editor visual quiere.

---

## ADR-0014 — Eliminar app_role 'supervisor' (NUEVO)

**Status**: Accepted
**Date**: 2026-05-27

`hr.employments.app_role` CHECK constraint reducido a 4 valores: `employee`, `hr_admin`, `president`, `admin`. **Eliminado `'supervisor'`** como valor distinto.

### Razón

"Ser supervisor" es **propiedad emergente**, NO rol fijo:
- Persona X es supervisor de Y si `hr.employments.supervisor_id = X AND person_id = Y AND is_current`
- Persona X aprueba un ticket específico si fue seleccionada en `selected_supervisor_id` por el solicitante
- UI muestra tab "Por aprobar" automáticamente si hay rows en `requests.approvals.approver_id = X`, sin importar app_role

### Implicaciones

- 184 empleados activos son `employee` regular (algunos circunstancialmente tienen reportes directos)
- Helper function nueva `hr.has_direct_reports()` para mostrar tab "Mi Equipo" en perfil
- RLS policies migrar de `app_role = 'supervisor'` a `hr.is_supervisor_of()` o `hr.has_direct_reports()`

### Migration aplicada

016_fix_hr_team_app_roles_and_constraint: SCD-2 corrección equipo HR (4 → hr_admin, Rodrigo → president), CHECK constraint con 4 valores.

---

## Cross-referencia Code-level ADRs (docs/adr/)

Code genera ADRs técnicos en `docs/adr/` del repo con numeración propia 0001-0008+. Estos cubren decisiones de implementación específica (algoritmos, patterns, schemas) más granulares que las Chat-level. Tabla de mapping:

| Code-level ADR (docs/adr/) | Chat-level ADR relacionado | Tema | Commit |
|---|---|---|---|
| 0001-rls-driven-db-access | ADR-0002 (este doc) | RLS como mecanismo primario de access control | pre-grill |
| 0002-codegen-snake-case-types-zod-boundaries | — | Tipos snake_case + Zod en boundaries (técnico) | pre-grill |
| 0003-snapshot-profile-fields-at-submit | ADR-0006 (Engines) | Snapshot pattern FormEngine | pre-grill |
| 0004-parallel-modify-reset-non-terminal | ADR-0011 (este doc, modes) | Reset non-terminal en parallel mode | pre-grill |
| 0005-manual-entry-bypass-chain | ADR-0012 (este doc) | Manual entry F32 bypass approval chain | pre-grill |
| **0006-service-role-admin-client-onboarding-exception** | ADR-0003 (este doc, multi-app) | Service role para onboarding lookup + multi-app gating (email/phone NO national_id) + capture-then-restore rollback pattern (Issue I3) | `2593f39` |
| **0007-employment-type-reference-table** | — | hr.employment_types con metadata operacional IC-RH-D-05 | `2593f39` |
| **0008-notifications-in-app-email-primary-mvp** (revised) | — | Notifications in-app + email PRIMARY MVP, **Vercel Cron worker** (no Edge Function), pattern INSERT same-tx, Reply-To pattern, domain `rein-eisenwerk.com`, reusar `preferences` jsonb namespace (Issue I1) | `2593f39` initial, `49a978a` revised |

**Códigos bold** = ADRs nuevos commiteados sesión 2026-05-27 nocturna.

**Decisiones absorbidas por ADR-0008 revisión (49a978a)**:
- Worker pattern: Supabase Edge Function → Vercel Cron + Next.js route handler (`/api/cron/process-notifications`)
- Templates single-source en `src/emails/` (sin sync script dual-runtime)
- Auth: `x-vercel-cron` header + `CRON_SECRET`
- Per-user opt-in: reusar `hr.user_settings.preferences` jsonb con namespace `notifications` (NO column nueva — Issue I1)
- Domain: `iconsa.com.pa` (incorrect) → `rein-eisenwerk.com` (Resend verified)
- Env var: `RESEND_FROM_ADDRESS` → `RESEND_FROM_EMAIL` (standardize con .env.local real)
- Reply-To: `RESEND_REPLY_TO=samantha.kosmas@iconsanet.com` excepto `password_reset`

---

## Cómo se usan estos ADRs

- **Chat al inicio sesión**: lee este doc para refresh decisiones grandes
- **Si surge una decisión que contradice un ADR**: documenta el SUPERSEDES con razón
- **Code en `docs/adr/`**: ADRs técnicos de implementación específica (ej: "uso Zod vs Yup", "pattern de error handling en API routes"). Diferentes nivel de detalle
- **Cross-reference**: mantener tabla arriba sincronizada cuando Code crea nuevo ADR técnico que refiere/extiende una decisión Chat-level, o cuando un ADR Code-level se revisa (capturar commit hash)
# Group 4 — Engines (FormEngine · ApprovalEngine · ChainResolver · StampEngine · PdfEngine · NotificationEngine) + VACACIONES worked example

**Decisions in scope:** ADR-0033, ADR-0015, ADR-0020, ADR-0027
**Also rests on:** ADR-0003 (snapshot), ADR-0004 (parallel reset), ADR-0005 (manual-entry bypass), ADR-0008 (notifications), ADR-0030 (GG=president provisional), ADR-0001 (RLS-first), ADR-0002 (snake_case + Zod). **New decision crystallized:** ADR-0037 (see §11).

> **Status:** design-only (DESIGN-ONLY per ADR-0033 — overnight council build exception). · **Created:** 2026-06-05. · **Mode:** spec + ADR only. **Nothing applied:** no migration, no app code, no DB writes — only read-only introspection of `bzeoszympkkicwlfdtcn`. A future **attended** session (ADR-0026) builds this; tonight Jaime gets a reviewed architecture to react to.

> **Why this spec exists:** Group 4 is the critical path (`docs/work/2026-06-03-hr-catalog-and-launch-plan.md` §8). The six engines are the app core, written **once** and generic (ADR-0015); every one of the 24 `requests.types` plugs in via JSONB config with **zero per-form logic**. VACACIONES (F-05-03) is the first concrete ticket type — the end-to-end worked example that proves the engine contract and exercises both `approval` gates and `processing` steps. SOP fidelity is R26-critical (ADR-0027): the chain and fields come from the SOR, not from memory.

---

## 0. Ground truth (read-only introspection, 2026-06-05)

Verified live against `bzeoszympkkicwlfdtcn` (PG 17.6). These facts anchor every decision below; do not re-derive from memory.

| Fact | Verified value | Source of the check |
|---|---|---|
| VACACIONES `form_schema` | **NULL** (gap this spec fills) | `requests.types` where code='VACACIONES' |
| VACACIONES `approval_chain_template` (live seed) | `mode:parallel`, 3 steps `[supervisor(approval), hr_admin(approval), president(approval)]`, no `kind`, no Planilla | same row |
| VACACIONES `allow_supervisor_override` / `sla_hours` / `category` | `true` / `72` / `permisos` | same row |
| `requests.approvals` columns | id, ticket_id, step_order, approver_role, approver_id, delegated_to_id, delegated_at, delegation_reason, decision, decision_at, comments, stamp_text, stamp_data, created_at, updated_at — **NO `kind` column** | information_schema |
| `approvals.decision` CHECK | `Pendiente \| Aprobada \| Rechazada \| Modificada \| Devuelta_Info` (nullable) | pg_constraint |
| `tickets.status` CHECK (R16) | `Borrador, Enviada, En_Revision, Devuelta_Modificacion, Aprobada, Rechazada, Completada, Cancelada` (8) | pg_constraint |
| `tickets` R8 columns | `received_by, received_at, processed_by, processed_at, manual_entry, created_by_hr_admin, selected_supervisor_id, current_step, current_assignee_id, form_data, ticket_number` all present | information_schema |
| Helper `hr.post_leave_ledger_entry(...)` | **EXISTS** — `(p_assignment_id uuid, p_kind text, p_amount numeric, p_event_date date=CURRENT_DATE, p_source_ticket_id uuid=NULL, p_note text=NULL) RETURNS hr.leave_ledger`, SECURITY DEFINER | pg_proc |
| Helper `requests.next_sequence(p_seq_type text)` | EXISTS, SECURITY DEFINER, `search_path=''`; format `HUM-{year}-{value:04d}`, Panama TZ; `requests.sequences` row `ticket_number` current_value 0 | pg_proc + prior introspection |
| Helper `requests.can_view_ticket(uuid)` / `hr.is_supervisor_of(...)` | EXIST | pg_proc |
| Helper to **read** a balance (`get_leave_balance`) | **DOES NOT EXIST** (read `hr.leave_balances.available` directly, or add a thin read helper) | pg_proc |
| Leave tables | `hr.leave_policies, leave_assignments, leave_balances, leave_ledger` all exist; **all 0 rows** (seed is a Group-4 task) | row counts |
| `leave_ledger` / `leave_balances` keying | both key to **`assignment_id`** (not directly person/policy); route person → `leave_assignments` → assignment → balance/ledger | information_schema |
| Tickets in DB | **0** (greenfield) | row count |
| `requests.types` | 24 total; **8** have `form_schema`; VACACIONES is among the 16 without | row counts |
| `src/lib/engines/` | **does not exist** — no engine code shipped (only auth/onboarding/admin/perfil/notifications) | prior `Glob src/**` |
| NotificationEngine foundation | `src/lib/notifications/{insert,realtime,templates,types,index}.ts` + cron worker `src/app/api/cron/process-notifications/route.ts` + `src/emails/*` (BaseLayout + 4 domain templates) **already shipped** (Group 2) | repo |

**Correction to prior council notes:** earlier passes claimed "no ledger-post function exists." That is **wrong** — `hr.post_leave_ledger_entry` is live (signature above). The genuinely-missing helper is only a balance *read* (and even that is optional, since `leave_balances.available` is directly selectable). This is reflected throughout.

---

## 1. Topology — where the engines live

Per CONTEXT.md (`### Engines`) + skill `iconsa-form-implementation`:

```
src/lib/engines/
  types.ts               shared engine types (FormSchema, ChainTemplate, Step, StampData, ...)
  form/index.ts          FormEngine        — render + validate + snapshot
  chain/index.ts         ChainResolver     — step.resolver -> concrete person
  approval/index.ts      ApprovalEngine    — 8-status state machine, modes, gates
  stamp/index.ts         StampEngine       — R7 stamp_text / stamp_data
  pdf/index.ts           PdfEngine         — expediente render (Cat A/B)
  notification/index.ts  NotificationEngine — thin facade over shipped notifications.*
```

Server actions in `src/app/.../actions.ts` (`'use server'`) sit **above** the engines and orchestrate them; the engines are modules that take a Supabase server client. NotificationEngine is largely a façade over the shipped `src/lib/notifications/*` (ADR-0008); its only net-new work is ticket-event email templates. Routes (skill §5): `/solicitudes/nueva/[code]`, `/solicitudes/[id]`, `/solicitudes/[id]/imprimir`, `/admin/solicitudes/manual-entry`.

> Interfaces below are **design sketches** (shapes for Jaime to react to), not final TS. Field/column names mirror the DB 1:1 so the engine maps directly. Final APIs verified via Context7 at build time (CLAUDE.md rule 10) — Next.js 16 server actions, React 19, `@supabase/ssr`, the PDF lib, `@react-email`.

---

## 2. The mental model the engines enforce

Every SOP field is exactly one of three `source` values (CLAUDE.md). The FormEngine resolves them; the user only ever touches `user_input`:

- `profile` — already in `hr.*`; **never asked**; prefilled read-only ("de tu perfil"); **snapshotted into `tickets.form_data` at submit** (ADR-0003).
- `user_input` — the only editable fields; the requester's contribution.
- `computed` — system-derived; read-only with a "Calculado" badge; resolved server-side.

The chain config is equally generic: `approval_chain_template` JSONB (ADR-0020) drives ChainResolver + ApprovalEngine. The single behavioral discriminator per step is `kind` (ADR-0027): `submit | approval | processing`. **ApprovalEngine gates only on `kind=approval`.**

---

## 3. The six engines — responsibilities + interface sketches

### 3.1 FormEngine — `src/lib/engines/form/`
**Owns:** rendering a ticket form from `requests.types.form_schema`, validating `user_input`, and producing the submit snapshot. (ADR-0015, ADR-0003, ADR-0002.)

```ts
type FieldSource = 'profile' | 'user_input' | 'computed';
type FieldType =
  | 'text' | 'textarea' | 'number' | 'currency' | 'date' | 'datetime' | 'time'
  | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'file_upload'
  | 'signature_canvas' | 'computed';

interface FormField {
  key: string;
  label: string;
  source: FieldSource;
  type: FieldType;
  path?: string;          // profile: dot-path into hr.* (e.g. 'people.full_name')
  compute_fn?: string;    // computed: server-resolved key (e.g. 'leave_balance', 'working_days')
  required?: boolean;
  options?: { value: string; label: string }[];
  group?: string;         // repeatable group id (e.g. 'date_ranges')
  max_repeat?: number;    // e.g. 3 for VACACIONES Del/Al rows
  validate?: { rule_key: string; args?: unknown }[]; // e.g. 'dias_lte_saldo'
}
interface FormSchema { version: number; fields: FormField[]; }

const FormEngine = {
  // server: resolve profile + computed for prefill (live hr.* read, pre-submit only)
  resolvePrefill(typeCode: string, requesterPersonId: string): Promise<Record<string, unknown>>,
  // validate user_input against schema + named business rules (R9 'dias_lte_saldo', etc.)
  validate(schema: FormSchema, userInput: Record<string, unknown>): ValidationResult,
  // AT SUBMIT: freeze profile+computed INTO tickets.form_data (ADR-0003)
  buildSnapshot(schema: FormSchema, userInput: Record<string, unknown>,
                prefill: Record<string, unknown>): Record<string, unknown>,
};
```

**Snapshot is the contract (ADR-0003):** `tickets.form_data = { ...profileSnapshot, ...computedSnapshot, ...userInput }`. All views and the PDF read the snapshot, never live `hr.*`. `compute_fn` values are resolved by a server-side registry (e.g. `leave_balance` → reads `hr.leave_balances.available` for the requester's active assignment; `working_days` → sums business days across the date ranges).

### 3.2 ChainResolver — `src/lib/engines/chain/`
**Owns:** turning each template step's abstract `resolver` into a concrete person at chain instantiation. (ADR-0020, ADR-0027, ADR-0030.)

```ts
type StepKind = 'submit' | 'approval' | 'processing';   // ADR-0027 / ADR-0037
type StepRole = 'requester' | 'supervisor' | 'hr_admin' | 'president' | 'specific_person';
type Resolver = 'self' | 'selected_supervisor_id' | 'any_hr_admin' | 'president_user' | 'specific_person';

interface ChainStep {
  step_id: number;
  step_order: number;     // ordering for sequential gating (ADR-0037)
  kind: StepKind;         // gate iff 'approval'
  role: StepRole;
  resolver: Resolver;
  required: boolean;
  sla_hours?: number;
  subrole?: string;       // e.g. 'planilla' (Asist. Planillas subset of hr_admin) — A2
  paper_block?: string;   // SOP signature-block label for PDF (StampEngine)
  ledger_effect?: 'verify_balance' | 'commit_used' | null; // VACACIONES side-effects
}
interface ChainTemplate {
  mode: 'sequential' | 'parallel' | 'direct_hr_admin' | 'any_of_hr' | 'parent_only'; // ADR-0037 reinstates 'sequential'
  visibility: 'universal';
  steps: ChainStep[];
}

const ChainResolver = {
  instantiate(template: ChainTemplate, ticket: TicketContext): ResolvedStep[], // -> approval rows to INSERT
  resolvePerson(step: ChainStep, ticket: TicketContext): Promise<string | null>,
};
```

Resolvers (all backed by existing columns/helpers):
- `selected_supervisor_id` → `tickets.selected_supervisor_id`; **NULL fallback → `hr.employments.supervisor_id`** (ADR-0020). Pre-selected at form load (R6/R10), overridable (`allow_supervisor_override=true`).
- `any_hr_admin` → any active `hr_admin` (pool; first to act claims it). Used for both RRHH-recibe and Planilla-verifica (the latter carries `subrole:'planilla'`).
- `president_user` → the president (ADR-0030: GG=president is **provisional** for MVP — Rodrigo only; flagged).
- `self` → the requester (the `submit` step).
- `specific_person` → supported by `approvals.approver_role` CHECK for edge actors.

**R5 + ChainResolver guards (instantiation time):** reject `selected_supervisor_id == requester` (R5/R6); for the president gate, apply **BL-2** — if `president_user == requester`, omit that gate and write an `audit.log` flag (no higher authority to chain on).

### 3.3 ApprovalEngine — `src/lib/engines/approval/`
**Owns:** the state machine over the 8 R16 statuses and writing `requests.approvals` rows. (ADR-0015, ADR-0020, ADR-0004, ADR-0005, ADR-0027, ADR-0037.)

Hard rules baked in:
- **Gates only on `kind=approval`** (ADR-0027). `kind=processing` rows (RRHH-recibe, Planilla-verifica) are stamped + advanced but **never block** and **never take employee input** (R8). `kind=submit` is the requester's own row.
- **Ordering (ADR-0037):** in `sequential` mode, `approval` gates fire in `step_order`; `processing` steps stamp-and-advance between them. In `parallel` mode, all `approval` gates open day 0 (ADR-0004).
- **R5 no-self-approval** — enforced in **code**, not a DB constraint: `if (approverPersonId === ticket.requesterPersonId) throw`.
- **R9 back-and-forth** — three actions: approve / reject-with-observation / modify-with-reason (via `requests.revisions`).
- **Manual-entry bypass (ADR-0005)** — if `tickets.manual_entry === true`: insert **no** approval rows, ticket born `Aprobada`, write the `audit.log` bypass entry; **still post the `leave_ledger` commit** (a back-filled paper vacation already consumed the balance).
- **Revision reset** — ADR-0004 for `parallel`; the **sequential analog** (ADR-0037): on accepted revision, reset every `approval` gate at-or-after the lowest `step_order` whose attested fields changed; earlier gates that signed unchanged values stand.

```ts
const ApprovalEngine = {
  instantiateChain(ticketId: string): Promise<void>,  // or ADR-0005 bypass
  actuate(ticketId: string, approverPersonId: string,
          decision: 'Aprobada'|'Rechazada'|'Modificada', comments?: string): Promise<TicketStatus>, // kind=approval only
  process(ticketId: string, actorPersonId: string, step: 'received'|'processed'): Promise<void>,     // kind=processing, never a gate
  acceptRevision(revisionId: string, byPersonId: string): Promise<void>,
  rejectRevision(revisionId: string, byPersonId: string): Promise<void>,
  cancel(ticketId: string, byPersonId: string): Promise<void>,
};
```

**Parallel-mode convention (CONTEXT.md):** while pending in `parallel`, `tickets.current_step = 0` and `current_assignee_id = NULL`; approvers act via their own `approvals` row, not via a ticket pointer. In `sequential`, `current_step`/`current_assignee_id` track the active gate. ApprovalEngine documents/honors both.

### 3.4 StampEngine — `src/lib/engines/stamp/`
**Owns:** the R7 digital sello on every actuated step (gate **and** processing). (ADR-0027, R7.)

On actuation, writes to the step's `requests.approvals` row:
```
// stamp_text (rendered on the PDF, maps to the paper's named blocks)
approval:    "Aprobado por {full_name} ({role_label}), {YYYY-MM-DD} {HH:MM:SS} (America/Panama)"
processing:  "Recibido por {full_name} (RRHH), {YYYY-MM-DD} {HH:MM:SS}"        // RRHH-recibe
             "Verificado por {full_name} (Planilla), {YYYY-MM-DD} {HH:MM:SS}"  // Planilla
// stamp_data jsonb (audit-legal)
{ signer_id, signer_name, signer_role, kind, decision, signed_at, ip, user_agent, step_id, paper_block }
```
`signer_name` is a snapshot (ADR-0003). **Processing steps still stamp** (R8 + R26): the expediente PDF must show all five touches of F-05-03 or it is not a faithful reproduction. Processing actuation also sets `tickets.received_by/at` (RRHH) and `processed_by/at` (Planilla). **Audit-legal only — NOT a legal e-signature** (Documenso deferred to v1.1); UI labels "Aprobación registrada", never "Firma electrónica certificada".

### 3.5 PdfEngine — `src/lib/engines/pdf/`
**Owns:** rebuilding the expediente PDF from `tickets.form_data` + the stamped `approvals` rows (IT-01). Not yet covered by any ADR; verify the render lib via Context7 at build time.
- **Cat A** (regulatory / paper-fidelity, e.g. F-05-03): faithful reconstruction of the SOP layout including all signature/processing blocks.
- **Cat B** (internal): ICONSA-branded generic template (Navy/Gold design tokens, `globals.css`).
```ts
const PdfEngine = { render(ticketId: string): Promise<Uint8Array>; };
```

### 3.6 NotificationEngine — `src/lib/engines/notification/`
**Owns:** in-app + email on assignment / decision / comment / modification. (ADR-0008, R18.) **Mostly reuse** — a façade over the shipped `src/lib/notifications/insert.ts` (`enqueueNotification` → `notifications.enqueue` RPC with `dedupeKey`) + the Vercel Cron worker + Resend templates. Fire-and-forget (R18): INSERT the notification **in the same transaction** as the business mutation; external delivery is async and never blocks the business op. Respects `hr.user_settings.preferences->'notifications'` opt-in (`in_app` not opt-out-able). Uses `requests.watchers.notify_on` + logs to `requests.notifications`.
- **Net-new:** ticket-event email templates (assignment / approved / rejected / returned) under `src/emails/` (closes CODE-TEMPLATE-GAP for ticket types).

> **Audit/ledger are NOT fire-and-forget.** The `audit.log` INSERT and the `leave_ledger` post run **in the same transaction** as the status mutation and must fail the op if they fail. Only the notification is fire-and-forget. Audit integrity > availability.

---

## 4. Data flow — submit → snapshot → instantiate → actuate → stamp → notify

```
[1] FormEngine.resolvePrefill(typeCode, requester)
      profile from hr.people/hr.employments · computed from hr.leave_balances / hire_date
      ↓ (user fills only user_input fields)
[2] createTicket(typeCode, userInput, selectedSupervisorId?)        ← server action
      FormEngine.validate(schema, userInput)                         (R9 'dias_lte_saldo')
      ChainResolver guard: selectedSupervisorId != requester (R5/R6)
      ticket_number = requests.next_sequence('ticket_number')        → HUM-{year}-{NNNN}
      tickets.form_data = FormEngine.buildSnapshot(...)              (ADR-0003 freeze)
      status: Borrador → Enviada
      post hr.post_leave_ledger_entry(assignment, kind='pending', amount=-dias, source_ticket_id)
      ↓
[3] ApprovalEngine.instantiateChain(ticketId)
      if tickets.manual_entry → ADR-0005 bypass: 0 approval rows, status=Aprobada,
                                 audit_log bypass entry, ledger commit  (skip to [7])
      else → ChainResolver.instantiate(template, ticket):
             per step INSERT requests.approvals {step_order, approver_role, approver_id,
                                                 kind, decision='Pendiente'}
             status: Enviada → En_Revision
      ↓ NotificationEngine.notify(assignment) to each approval/processing assignee
[4] RRHH recibe (hr_admin, step kind=processing)  → ApprovalEngine.process('received')
      StampEngine processing stamp; tickets.received_by/at; advance  NON-GATING (R8, ADR-0027)
[5] Supervisor (kind=approval, gate)              → ApprovalEngine.actuate('Aprobada')
      R5 self-check · StampEngine sello · NotificationEngine.notify(decision) · advance
      (R9 alt: 'Rechazada' → Rechazada + ledger reversal · 'Modificada' → revisions → ADR-0004/0037)
[6] Planilla verifica acumulados (hr_admin subrole=planilla, kind=processing)
      → ApprovalEngine.process('processed'); StampEngine stamp; tickets.processed_by/at  (R8)
[7] GG=president (kind=approval, final gate)       → ApprovalEngine.actuate('Aprobada')
      all kind=approval steps Aprobada → status Aprobada (→ Completada on archive)
      ledger: move pending → used (post kind='used')
      NotificationEngine.notify(approved) to requester + watchers
[8] PdfEngine.render(ticketId) on demand → expediente (form_data + all 5 stamps)
```

The flow is **identical for all 24 types**; only `form_schema` + `approval_chain_template` differ. That is the ADR-0015 promise.

---

## 5. VACACIONES — `form_schema` (field-source matrix)

SOP source: F-05-03 (`docs/sops/formularios/acciones-personal/IC-RH-F-05-03 Solicitud de Vacaciones.pdf`) + governing **PO-05 §5.8–5.10** (`docs/sops/procedimientos/IC-RH-PO-05 Acciones de Personal.pdf`, VV.2018 — the maestro; per ADR-0027 r4 it wins over the 2012 form scan). Catalog `docs/work/2026-06-03-hr-catalog-and-launch-plan.md` §3.A.1 + §4.

| field | source | origin / engine behavior |
|---|---|---|
| Fecha (solicitud) | `computed` | server `now()` at submit; read-only |
| Nombre del Empleado | `profile` | `hr.people.full_name` (or `given_names`+`surnames`) — prefilled read-only, snapshotted |
| No. Cédula | `profile` | `hr.people.national_id` — prefilled read-only, snapshotted |
| Cargo / Depto (context) | `profile` | `hr.employments.position_text/position_id`, `department_text/department_id` (current row) |
| Antigüedad | `computed` | `age(now(), hr.employments.hire_date)` — badge "Calculado" |
| **Saldo acumulado de vacaciones** | `computed` | `compute_fn:'leave_balance'` → `hr.leave_balances.available` via person→`leave_assignments`→assignment; badge "Calculado" (§6) |
| Días solicitados (total) | `computed` | `compute_fn:'working_days'` — sum of business days across ranges; `validate:'dias_lte_saldo'` |
| Tipo de Pago [Completas / Adelanto / Descuento] | `user_input` | select, required |
| Tiempo Solicitado [Completas / Parciales] | `user_input` | select, required |
| Desglose Del/Al (rows 1–3) | `user_input` | repeatable `group:'date_ranges'`, `max_repeat:3` (matches paper); each {del:date, al:date} |
| Observaciones | `user_input` | textarea, optional |
| Firma del Solicitante | (submit event) | the `kind=submit` action IS the firma (ADR-0027) — not a drawn-signature gate |
| "Conocimiento y verificación por PLANILLA" | (chain processing) | NOT a form field — StampEngine at the Planilla step (R8) |
| "POR EL GERENTE DE PROYECTO" Aprobado/Rechazado + Nombre + Firma | (chain approval) | StampEngine at the supervisor gate |
| "Gerente General — Aprobado por / Fecha" | (chain approval) | StampEngine at the GG gate |

---

## 6. VACACIONES — `computed` balance is a real DB read

The DB already models full leave-accrual (engines **reuse**, never reinvent — and never write `payroll.*`, R1):
- `hr.leave_policies` — D-05 config (accrual_method/frequency/rate, caps, carryover, `employment_type_id`, proration).
- `hr.leave_assignments` — person → policy (accrual_start_date, valid_from/to, is_active).
- `hr.leave_balances` — `accrued, used, pending, available, as_of`, keyed by **`assignment_id`** (**`available` is the computed source**).
- `hr.leave_ledger` — append-only (`kind, amount, balance_after, event_date, source_ticket_id, reversal_of_id`), keyed by `assignment_id`.

**Ledger lifecycle (uses the existing `hr.post_leave_ledger_entry`):**
1. **At submit:** post `kind='pending'`, `amount = -dias`, `source_ticket_id = ticket.id` → `pending` += dias.
2. **At final approval (GG):** move pending → `used` (post `kind='used'`).
3. **At reject / cancel after pending:** post a reversal (`reversal_of_id` = the pending row) → restore `available`.

**Net-new for the engine:** a *read* path for balance (`hr.get_leave_balance(person)` thin helper, OR direct `select available from hr.leave_balances ...` joined through the active assignment) + the `compute_fn` registry entries. The *write* helper already exists. Accrual itself (filling `accrued`) is a **policy-config + seed/cron** concern, **out of engine scope** (§9 A1) — do not hardcode "30/11" in FormEngine; it belongs in `hr.leave_policies` (D-05 + PO-06 "vacaciones 11mo/año", validated vs Código de Trabajo).

---

## 7. VACACIONES — corrected `approval_chain_template` (the re-seed)

**The live seed is wrong** (§0): 3-step `parallel`, `hr_admin` modeled as a **gate**, no Planilla, no `kind`. PO-05 §5.9 prose is ordered and load-bearing:

> "La Solicitud de Vacaciones (IC-RH-F-05-03) **es recibida por RRHH** y se entregan al supervisor para su autorización, para luego ser **revisados sus acumulados** y verificar el tema del pago... Luego se **pasa a la Gerencia General para ser autorizada**."

→ **RRHH recibe → Supervisor aprueba → Planilla verifica acumulados → GG autoriza.** Corrected shape (sequential; 2 approval gates; 3 processing/submit touches):

| step_order | role | kind | resolver | gate? | paper_block | ledger_effect |
|---|---|---|---|---|---|---|
| 1 | requester | `submit` | `self` | no | "Firma del Solicitante" | (post `pending`) |
| 2 | hr_admin | `processing` (recibe/enruta) | `any_hr_admin` | **no** (R8) | — (no RRHH signature line) | — |
| 3 | supervisor | `approval` | `selected_supervisor_id` (+NULL fallback) | **yes** | "POR EL GERENTE DE PROYECTO" | — |
| 4 | hr_admin (Planilla) | `processing` (verifica acumulados) | `any_hr_admin` (`subrole:'planilla'`) | **no** (R8) | "Conocimiento y verificación por PLANILLA" | `verify_balance` |
| 5 | president | `approval` (GG final) | `president_user` | **yes** | "Gerente General — Aprobado por" | `commit_used` |

```jsonc
{
  "mode": "sequential",            // ADR-0037 reinstates ordering; ADR-0027 r4 (PO maestro gana)
  "visibility": "universal",       // RRHH sees from day 0 INDEPENDENT of mode (ADR-0037 decouples this)
  "steps": [
    { "step_id": 1, "step_order": 1, "kind": "submit",     "role": "requester",  "resolver": "self",
      "required": true, "paper_block": "Firma del Solicitante" },
    { "step_id": 2, "step_order": 2, "kind": "processing", "role": "hr_admin",   "resolver": "any_hr_admin",
      "required": true, "sla_hours": 24 },
    { "step_id": 3, "step_order": 3, "kind": "approval",   "role": "supervisor", "resolver": "selected_supervisor_id",
      "required": true, "sla_hours": 72, "paper_block": "POR EL GERENTE DE PROYECTO" },
    { "step_id": 4, "step_order": 4, "kind": "processing", "role": "hr_admin",   "resolver": "any_hr_admin",
      "required": true, "sla_hours": 24, "subrole": "planilla",
      "paper_block": "Conocimiento y verificacion por PLANILLA", "ledger_effect": "verify_balance" },
    { "step_id": 5, "step_order": 5, "kind": "approval",   "role": "president",  "resolver": "president_user",
      "required": true, "sla_hours": 72, "paper_block": "Gerente General - Aprobado por",
      "ledger_effect": "commit_used" }
  ]
}
```

**Why sequential, not parallel (the engine-architect's biggest trap):** `parallel` would let GG approve **before** the supervisor and **before** Planilla verifies the balance — violating PO-05 §5.9 (GG signs last, after balance verification) and ADR-0027 r4. The order is the SOP. Sequential is mandatory for VACACIONES.

**Why RRHH-recibe is `processing`, not a gate:** F-05-03 has **no RRHH signature line**, so ADR-0027 r2 makes it visibility/processing. RRHH must **never block** a vacation request. (Contrast PRESTAMO, where RRHH *does* gate — "beneficio social + verifica endeudamiento", catalog §4 — so PRESTAMO's RRHH step is `kind=approval`. Do not copy one chain's RRHH treatment onto the other.)

**Same `kind` pass is owed** to PRESTAMO (RRHH = `approval`), PERMISO (RRHH in flow), and the other 13 chains-without-schema (catalog §3/§4). ACCION_PERSONAL (`parent_only` + parallel + president + R8) is the harder ApprovalEngine test (catalog §8, ADR-0009) — VACACIONES is the gentler worked example, but the `kind`/sequential machinery built here serves both.

---

## 8. The 8-status state machine (R16) — VACACIONES transitions

| from | event (actor / step kind) | to | engine effects |
|---|---|---|---|
| — | createTicket (requester) | **Borrador** | FormEngine renders; profile/computed prefill staged; no allocation yet |
| Borrador | submit (requester / submit) | **Enviada** | `next_sequence('ticket_number')`; snapshot → `form_data` (ADR-0003); post ledger `pending`; ChainResolver materializes rows |
| Enviada | RRHH recibe (hr_admin / processing) | **En_Revision** | `received_by/at` (R8); processing stamp; advance; **no gate** |
| En_Revision | supervisor approve (/ approval) | **En_Revision** | sello on approvals row; advance to Planilla; **R5 check** |
| En_Revision | supervisor reject (/ approval) | **Rechazada** | ledger reversal of pending; notify requester; terminal |
| En_Revision | supervisor modify (/ approval, R9) | **Devuelta_Modificacion** | open `requests.revisions` (`Pendiente_Aceptacion`) |
| En_Revision | Planilla verifica (hr_admin / processing) | **En_Revision** | `processed_by/at` (R8); processing stamp; advance to GG; **no gate** |
| En_Revision | GG approve (/ approval, final) | **Aprobada** | final sello; ledger pending → used; `resolved_at` |
| En_Revision | GG reject (/ approval) | **Rechazada** | ledger reversal; terminal |
| Devuelta_Modificacion | requester accepts + resubmits | **En_Revision** | apply `revisions.new_form_data`; re-run from modified `step_order` forward (ADR-0037) |
| Devuelta_Modificacion | requester rejects own revision / cancels | **Cancelada** | ledger reversal of pending; terminal |
| Aprobada | RRHH archives / closes (housekeeping) | **Completada** | optional terminal; PdfEngine generates expediente (IT-01) |
| any non-terminal | requester cancels | **Cancelada** | ledger reversal of pending; terminal |

`Aprobada` vs `Completada` (R16): **proposal** — `Aprobada` = chain fully signed (GG done, balance committed); `Completada` = RRHH archived the signed expediente / period consumed. **Flag (§9 A5):** if PO-05 has no operational distinction, collapse `Completada` into `Aprobada` rather than ship a status nobody sets.

`Devuelta_Info` (BL-5): present in `approvals.decision` CHECK but **absent** from `tickets.status` CHECK and from this flow. **Do not wire it in.** R9's modify path uses `Devuelta_Modificacion` (a status) + `revisions`. Treat `Devuelta_Info` as a decision-level "request more info" only if Jaime confirms a use; else flag-to-drop (§9 A6, ADR-0037).

---

## 9. The modes (R24) + self-approval (R5)

Modes (ADR-0020 as-shipped: `parallel | direct_hr_admin | any_of_hr | parent_only`; ADR-0037 **reinstates `sequential`**):
- **`sequential`** — VACACIONES. `approval` gates fire in `step_order`; `processing` steps stamp-and-advance between them. `visibility:"universal"` keeps RRHH on the flow from day 0 **independent of ordering** (this is the reconciliation — see §11).
- **`parallel`** — ADR-0004. All `approval` gates open day 0; an accepted revision resets all non-terminal gates and re-runs. ACCION_PERSONAL-class co-equal signers.
- **`direct_hr_admin` / `any_of_hr`** — single RRHH gate (constancias/certificaciones).
- **`parent_only`** — ACCION_PERSONAL parent; subtypes carry the real chain.

**R5 no-self-approval** — engine code, not a DB constraint. At each `kind=approval` step: assert `approverPersonId !== requesterPersonId` before writing the row. Collisions: (a) president-as-requester → BL-2 (omit gate + audit flag); (b) requester == selected supervisor → ChainResolver rejects at submit (R5/R6).

---

## 10. Testing strategy (for the attended build — not run tonight)

Per CLAUDE.md gate (`npm run verify` == CI: typecheck + lint + vitest + docs:check + build; e2e via `verify:e2e`) and the per-feature bar (E2E happy path + edge case + RLS validation + tsc/lint/build clean).

**Engine unit tests (vitest, jsdom, 70% coverage floor):**
- FormEngine: source resolution (profile prefilled read-only / computed badge / user_input editable); `buildSnapshot` freezes profile+computed (ADR-0003); `validate` rejects `dias > saldo` (`dias_lte_saldo`); repeatable group caps at `max_repeat:3`.
- ChainResolver: each resolver → correct person; `selected_supervisor_id` NULL → `employments.supervisor_id` fallback; R5/R6 reject requester==supervisor; BL-2 omits president gate when requester is president.
- ApprovalEngine: 8-status transitions (table §8); gates only on `kind=approval`; processing never blocks; manual-entry bypass (0 rows, born Aprobada, ledger commit); R9 reject/modify; ADR-0004 (parallel reset) + ADR-0037 (sequential reset-from-modified-step).
- StampEngine: stamp_text/stamp_data per kind; processing stamps present; signer_name snapshot.
- Ledger: pending at submit → used at GG approval → reversal at reject/cancel; balance arithmetic via `hr.post_leave_ledger_entry`.

**RLS / DB tests (pgTAP + supabase-test-helpers, the TF foundation phase):** requester sees own ticket; supervisor sees assigned; RRHH `can_view_ticket` universal; non-party denied; `approvals`/`leave_ledger`/`audit.log` write-paths SECURITY DEFINER only. Validate post-build with skill `iconsa-rls-validation`.

**E2E (Playwright, :3001):** VACACIONES happy path (employee submit → RRHH recibe → supervisor approve → Planilla verify → GG approve → Aprobada → PDF) + edge cases (reject reverses pending balance; modify round-trips via revisions; `dias > saldo` blocked at submit; manual-entry bypass).

---

## 11. Is a NEW ADR needed?

**Yes — one.** Most of this rests on existing ADRs (0015 generic engines, 0027 `kind` + fidelity, 0003 snapshot, 0004 parallel reset, 0005 bypass, 0008 notifications, 0030 GG=president, 0020 template grammar). But two coupled facts force a genuinely new architectural decision **not** settled by 0015/0020/0027:

1. **ADR-0020 explicitly *eliminated* `sequential`** ("no aplica… RRHH siempre debe ver desde día 0"). VACACIONES (PO-05 §5.9) **requires ordering** (GG signs last, after balance check). The 0020 rationale conflated *ordering of gates* with *RRHH visibility* — but `visibility:"universal"` already guarantees day-0 RRHH visibility independent of mode. Reinstating ordering is a real decision that **amends 0020**.
2. **`requests.approvals` has no `kind` column.** ADR-0027 *mandates* per-step `kind` and its §Consecuencias points at "steps llevan `kind`", but it never decided the **runtime home** (a `kind` column on `approvals` vs reusing ticket-level `received_by/processed_by`). That runtime-model decision is new.

These are one coherent decision about **how the runtime approval model represents gates, processing, and ordering** → **ADR-0037** (written this session; index bumped to 0038). It also folds the BL-4 (annual sequence reset) and BL-5 (`Devuelta_Info` use-or-drop) resolutions as consequences, since both are runtime-model questions surfaced by the worked example.

> Everything else in this spec rests on existing ADRs — no further ADRs invented.

---

## 12. Build TASKS for the attended session — **NOT BUILT TONIGHT**

DESIGN-ONLY (ADR-0033). The following are for the future **attended** build (ADR-0026); each is marked with its constraint. No migration/code/DB-write performed tonight.

**Migrations (`hr.*` / `requests.*` only; CREATE checklist: RLS + ≥1 policy + COMMENT; reuse helpers; skill `iconsa-supabase-migration`):**
- **T1 — `requests.approvals.kind` column** (`text` CHECK `submit|approval|processing`, NOT NULL default for back-compat decided in ADR-0037) + step-`kind` + `step_order` formalized in `approval_chain_template`. (ADR-0037; resolves §0 gap; generalizes R8 `received_by/processed_by` beyond ACCION_PERSONAL.)
- **T2 — re-seed VACACIONES `approval_chain_template`** to §7 shape (sequential, 2 gates, 3 processing/submit, `kind` per step). (ADR-0037 + ADR-0027.) **DB-1 audit-trigger decision is made inside this same migration/ADR** (STATUS §7 gate — coupled to ApprovalEngine).
- **T3 — seed VACACIONES `form_schema`** per §5 (currently NULL). (ADR-0015, ADR-0003.)
- **T4 — `kind` pass over the other 15 chains-without-schema** (PRESTAMO RRHH=`approval`; PERMISO RRHH in-flow; etc.) + their `form_schema` (Groups 5-6; VACACIONES proves the pattern). (ADR-0027.)
- **T5 — leave read helper** `hr.get_leave_balance(person)` (thin; or document direct `leave_balances.available` read) + `compute_fn` registry wiring. **Write helper `hr.post_leave_ledger_entry` already exists — reuse, do not recreate** (R5/CLAUDE.md rule 5).
- **T6 — seed `hr.leave_policies` (D-05)** + assignments/balances backfill (accrual = config, not hardcode; validate vs Código de Trabajo + PO-06). (STATUS §3 "construir hr.leave_balances + accrual ledger; no descopear".)
- **T7 — annual sequence reset** (BL-4 / DB-SEQRESET): decide per-year counter vs reset job. `next_sequence` substitutes `{year}` but never zeroes `current_value`. (ADR-0037 consequence; cosmetic — `{year}` already disambiguates.)
- **T8 — `Devuelta_Info` resolution** (BL-5): wire a real use OR drop from `approvals.decision` CHECK. (ADR-0037 consequence.)

**App code (`src/lib/engines/*`; verify external APIs via Context7 — CLAUDE.md rule 10):**
- **T9** — `types.ts` + the six engine modules (§3).
- **T10** — server actions orchestrating them (`createTicket`, `approveTicket`, `rejectTicket`, `modifyTicket`, `accept/rejectRevision`, `cancelTicket`, `markReceived`, `markProcessed`) + routes (§1).
- **T11** — ticket-event email templates under `src/emails/` (closes CODE-TEMPLATE-GAP for ticket types; ADR-0008).
- **T12** — tests per §10; gate `npm run verify` + RLS validation (skill `iconsa-rls-validation`).

**Gate / docs (same commit when built):** CHANGELOG + STATUS (§6 backlog items below) + CONTEXT/adr if a decision shifts.

---

## 13. Backlog-gate matches (STATUS §6 — filtered to Group 4 + `hr.*`/`requests.*`)

Per the non-skippable pipeline gate (STATUS §7), each match is either folded into a TASK above or re-deferred with reason:

| Backlog ID | Disposition |
|---|---|
| **DB-1** (audit-trigger SECURITY DEFINER, coupled to ApprovalEngine) | **In scope** — decided inside T2's migration/ADR (STATUS §7 explicitly couples it). |
| **DB-SEQRESET** (annual reset, BLOCKED-on-Jaime) | **In scope as T7 / ADR-0037 consequence** — needs Jaime's call on format `HUM-2027-0001`; design captured, build attended. |
| **BL-3..7** (chain modes, BLOCKED-on-Jaime; "Group 6 president-gated") | **Partially folded:** BL-2 already decided (used in ChainResolver); BL-4/BL-5 resolved as ADR-0037 consequences (T7/T8). **BL-6 (SLA/escalation) + BL-7 (delegation) RE-DEFERRED** to Group 6 — VACACIONES uses static `sla_hours` only; escalation/delegation are president-gated/money-form concerns, not needed for the worked example. |
| **CODE-TEMPLATE-GAP** (5 missing ticket email templates) | **In scope as T11** — ticket-event templates are NotificationEngine net-new work. |
| **TEST-CRON-WORKER** (no unit test on email worker) | **RE-DEFERRED** to a dedicated tests pass — the worker is shipped Group-2 infra; Group 4 adds ticket templates but does not refactor the worker. |
| **DB-VISION-B** (retrofit soft-delete + `source_system` on existing `hr.*`/`requests.*`, triggers "al TOCAR tablas existentes") | **RE-DEFERRED with reason** — Group 4 *reads* `requests.*`/`hr.leave_*` and *adds* a `kind` column (T1) but does not retrofit soft-delete across existing tables; that needs its own brainstorm+grill before mobile/offline (STATUS §7). T1 must, however, follow the existing `deleted_at`/`source_system` conventions on any column it touches. |
| **FND-SCD2-ATOMIC** (combine `update_person_profile`+`apply_employment_scd2_change` into 1 atomic RPC, triggered "at engine work") | **Adjacent, RE-DEFERRED** — VACACIONES does not mutate employment SCD-2; fold into the ACCION_PERSONAL/ACTUALIZACION_DATOS engine slice, not this worked example. Flagged so the attended session picks it up when it first touches that path. |
| **PAYROLL-RLS / PLANILLA-MVP** | **Out of scope (read-only boundary)** — VACACIONES *reads* nothing from `payroll.*`; balance is `hr.leave_balances`. R1 boundary noted (§6 A4). |
| **AUDIT2-SOP-MD** (SOP markdown/OCR pipeline; triggers "Group 4 chains SOP-driven") | **Mitigated, RE-DEFERRED** — the SOP source for VACACIONES (F-05-03 + PO-05) was read directly and is captured in §5/§7; the general OCR pipeline remains a TF-foundation task. |
| **AUDIT2-STORAGE-ATTACH** (HumanOS needs its own private attachments bucket) | **RE-DEFERRED to Group 3 uploads** — VACACIONES `form_schema` has no required attachment (RECLAMO_PAGO does); flagged so the file_upload field type has a bucket before a form needs it. |

No Group-4-relevant backlog item is left unresolved.

---

## 14. Assumptions & SOP ambiguities (do NOT invent — Jaime gates)

- **A1 — Accrual formula** is policy-config, not engine logic. PO-06 says "vacaciones 11mo/año" (≈ Código de Trabajo Art. 54 norm); validate against seeded `hr.leave_policies` + Código de Trabajo. **Do not hardcode "30/11" in FormEngine.**
- **A2 — "Planilla" actor.** No `planilla` app_role exists (`approvals.approver_role` CHECK = supervisor/hr_admin/president/specific_person). Modeled as `hr_admin` + `kind=processing` + `subrole:'planilla'` (Asist. Planillas ⊂ RRHH). Confirm vs `specific_person`.
- **A3 — GG=president provisional** (ADR-0030). Resolver `president_user` (Rodrigo only MVP). Confirm membership (VP Ferrer / other gerentes) before president-gated forms (Group 6).
- **A4 — R1 read boundary.** HumanOS *reads* `hr.leave_balances` and *posts* `hr.leave_ledger` (HR-owned); it must **never write `payroll.*`**. If any balance truth lives in `payroll.*`, that is an integration *read*. Confirm ownership.
- **A5 — `Aprobada` vs `Completada`** (R16): operational distinction unconfirmed in PO-05. Proposal §8; collapse if no real difference.
- **A6 — `Devuelta_Info`** (BL-5): orphan in `approvals.decision` CHECK; confirm a use or drop (T8).
- **A7 — Annual sequence reset** (BL-4): per-year counter vs reset job; `{year}` already disambiguates so cosmetic (T7).
- **A8 — F-05-03 layout order vs PO-05 prose:** the 2012 form lists Planilla before Gerente de Proyecto; PO-05 (2018 maestro) puts RRHH-reception first and GG last. **Follow PO-05** (ADR-0027 r4). Flagged in case Samantha's current practice diverges (R26 — Jaime validates deviations).
- **A9 — Sequential revision/reset semantics** (ADR-0037): proposed "reset every gate at-or-after the lowest `step_order` whose attested fields changed." Confirm the exact field-attribution rule with Jaime before build (a supervisor who approved old dates must re-sign if dates change; R7).

---

**Source files:** `docs/work/2026-06-03-hr-catalog-and-launch-plan.md` (§1, §3.A.1, §4, §8) · `docs/sops/formularios/acciones-personal/IC-RH-F-05-03 Solicitud de Vacaciones.pdf` · `docs/sops/procedimientos/IC-RH-PO-05 Acciones de Personal.pdf` §5.8–5.10 · ADRs 0001/0002/0003/0004/0005/0008/0015/0020/0027/0030/0033 + new 0037 · CLAUDE.md + CONTEXT.md (mental model, `### Engines`) · STATUS.md §3/§6/§7 · live read-only introspection of `bzeoszympkkicwlfdtcn`.

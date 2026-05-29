# HumanOS Operating Model + Groups/MVP Verdict — Audit Synthesis 2026-05-29

**Status:** PROPOSED — pending James's ratification via one consolidating ADR. Nothing here is applied to the harness or docs yet.
**Source:** Two multi-agent audit workflows (2026-05-29): framework-v2 audit + docs/groups/harness audit (4 auditors + independent best-practices research → 2 synthesis agents). Findings validated against repo files with default skepticism (instructed to refute, not agree).
**How to use:** This is the design doc for the framework/docs/scope remediation. Ratify the 4 decisions in Part 5; then Code remediates in batches.

---

## PART A — OPERATING MODEL

### 0. The one assumption to kill first

Every layer of this project is still organized around a **three-audience split** (Chat writes strategy docs / Code reads-and-executes / James decides). That model is now fiction: Chat and Code consume the **same repomix bundle**, and there is only **one** agent reading docs at runtime. The audience framing is the *root cause* of nearly every concrete defect found:

- R1–R26 duplicated across CLAUDE.md + Constitution + 05 → already drifting.
- Approval-mode/JSONB duplicated across 02 + 04 + 05/R11 + ADR-0011 + CONTEXT.
- Status duplicated across CLAUDE.md + 02 + 09 + the (deleted) ROADMAP + MEMORY.md.
- **Two** independently-numbered ADR ledgers bridged by a hand-maintained cross-ref table.
- `hr.people_external_ids` documented as "exists" in 11/12 but "does not exist" in 09 — a live contradiction an agent could code against.

**Decision: re-key everything by FUNCTIONAL ROLE + READ-CADENCE, not by audience.** One canonical set, one decisions log, single-source ownership for every fact. Everything else links; nothing restates.

### Part 1 — The Canonical Doc Set

**1.1 Operating principle** — each surviving doc gets a mandatory 3-line header:

```
Role:       vision | rules | schema | domain | glossary | decisions | scope | history | process
Read when:  always | session-start | just-in-time:<keyword> | future-only
Maintain when: <trigger — new R-rule | new table | new external system | every shipped feature | new decision>
```

A timestamp says a doc is *old*; it does not say whether to *read* it or whether Code is *obligated to update* it. The header does both.

**1.2 Canonical set (operational tier) — 9 files + future tier**

| # | Doc | Role | Read cadence | Maintenance trigger | Verdict |
|---|-----|------|--------------|---------------------|---------|
| 1 | CLAUDE.md | router | always (every turn) | harness/rule pointer change only | KEEP, hard-trim (<200 lines) |
| 2 | PROJECT_CONSTITUTION.md | governance | session-start / JIT when a rule is challenged | locked-decision change (rare) | KEEP, stop restating R-rules |
| 3 | 05-BUSINESS-RULES.md | rules (SoT) | JIT (hook+skill enforced) | new/changed R-rule | KEEP — sole R1-R26 home |
| 4 | 07-SCHEMAS-PERMISOS.md | schema/RLS/helpers | JIT before any DDL/RLS | new helper / new pattern | KEEP, strip migration narrative |
| 5 | 04-DOMAIN-RRHH.md | domain/SOP catalog | JIT when building a form | new SOP / new request type | KEEP, purge live BD data + vocab |
| 6 | CONTEXT.md | glossary (SoT) | JIT when terminology in doubt | new term / resolved ambiguity | KEEP — sole glossary |
| 7 | docs/adr/ + README index | decisions (SoT) | read-first for "why" | every non-trivial decision | KEEP, merge both ledgers in |
| 8 | 02-MVP-SCOPE.md | scope + status (SoT) | JIT before a group; status often | every shipped feature / scope change | KEEP, absorb 03, sole status home |
| 9 | CHANGELOG.md | shipped history | session-start / JIT for recent deltas | every shipped feature (past tense) | KEEP, constrain [Unreleased] |

Plus one **process doc** (merge of 06 + 10) and a **future tier** `docs/future/` (11, 12, ETL-half of 13).

**1.3 MERGE / KILL / SPLIT / DEMOTE**

- **MERGE:** 08-ADRs.md → docs/adr/ (one file per ADR, renumber once into a monotonic space, delete the cross-ref table — it *will* drift); 03-ROADMAP-POST-MVP → 02 "deferred" section; 10-HANDOFF → 06 into one "Process & Harness" doc (delete the obsolete "paste 14 docs" ritual — repomix replaced it); 04's vocabulary table → CONTEXT.md.
- **KILL (content/framing):** the audience split everywhere (00-INDEX "triple stack", ADR-0007, every `Owner: Chat`/`Audiencia: Code` header, Constitution §7 "Chat proposes / Code executes"); the live-status paragraph in CLAUDE.md (violates the file's own "BD es la fuente de verdad" rule and is already stale — says 8 files/58 tests; CHANGELOG says 9/65); all BD-derivable facts from docs (invite codes, row counts, per-person app_role, migration numbers — query live via Supabase MCP); the mode-mapping duplication (keep only in 05/R11).
- **SPLIT:** 13-INTEGRATIONS by status (LIVE infra rows stay operational; external-ETL catalog → future tier; tag every row real-vs-planned); 00-INDEX rewritten from "triple stack" philosophy into the read-cadence map of §1.2 (navigation SoT).
- **DEMOTE to docs/future/:** 11-MDM-PRINCIPLES + 12-SOR-MATRIX (reference `mdm.*`/`etl.*` schemas that don't exist). **Fix the `hr.people_external_ids` contradiction first** (mark PLANNED, not existing).

**1.4 Decisions-log mechanism Code reads FIRST**

1. One sequence: `docs/adr/NNNN-title.md`, append-only, `Status:` field (Proposed/Accepted/Superseded-by-NNNN).
2. `docs/adr/README.md` — one line per ADR (`NNNN | title | status | supersedes`); Code scans titles, opens only what's relevant.
3. CLAUDE.md "Past decisions" pointer aims at the README index FIRST.
4. Sweep orphans in: CONTEXT "Flagged ambiguities", grill Q1–Q5, CHANGELOG [Unreleased] decision-narratives → ADRs.
5. **Three-way rule (enforced in review): CHANGELOG = what changed (shipped). 09 = what's happening now. ADR = why we decided. No fact lives in two of the three.**

**1.5 09-ESTADO-ACTUAL → slim to ~1 screen:** current phase, in-flight, explicit blockers, pending HUMAN decisions. Everything durable moves out (decisions → ADR, status → 02, counts → BD).

**1.6 CLAUDE.md target:** <200 lines / well under ~5k tokens. Keep: stack one-liner, commands, the 10 non-negotiables as terse bullets with R-pointers, the conditional-import table, design-token pointer. Move out: mental-model prose (→ 04/CONTEXT), full design tokens (→ UI skill/doc), promise mechanism (→ process doc), live-status (→ delete).

### Part 2 — Harness Usage Matrix

Classes: **ALWAYS-ON** / **MANUAL+TRIGGER** / **INSTALL** / **DROP**.

**2.1 ICONSA skills — all ALWAYS-ON, KEEP** (highest value; they encode domain no off-the-shelf plugin has). Dedup the helper list (see 2.6).

**2.2 Workflow skills — MANUAL+TRIGGER, with router fixes:**
- writing-plans / test-driven-development / verification-before-completion / finishing-a-development-branch / frontend-design — KEEP, **namespace fix**.
- requesting-code-review — KEEP, **raise to `high`**, namespace, add to router (solo dev = no human reviewer; this is where AI review earns its keep).
- **brainstorming — INSTALL in router** (`suggest`). The "already done in Chat" exclusion is stale: 34 of 39 features (F6–F39) are undesigned.
- grill-with-docs / diagnose / handoff (local) — KEEP, fine unprefixed.
- **Router bug (P1):** `skill-rules.json` emits bare base names for plugin skills; UserPromptSubmit prints them verbatim → a literal `Skill(name)` will not resolve. Rewrite plugin-skill `name` fields to namespaced form (`superpowers:writing-plans`, etc.).

**2.3 Hooks:** keep all 5 ALWAYS-ON. PreToolUse = crown jewel. **P2 fix:** post-tool-use.ps1 ~line 86 advises phantom `mcp__supabase__get_advisors` → real name `mcp__plugin_supabase_supabase__get_advisors`. **INSTALL Stop hook** (advisory first: when session touched .ts/.tsx/.sql, run/remind `npm run verify`; escalate to blocking only if skipped). Lower priority than CI (Stop hook only guards local sessions).

**2.4 MCP — the big cleanup. CRITICAL: config is contradictory** — `~/.claude.json` `disabledMcpServers` contradicts `settings.local.json` `enabledMcpjsonServers`; the disabled list likely wins → **four servers James believes are wired are inert.** Reconcile `.mcp.json` + `settings.local.json` + `~/.claude.json`.
- KEEP ALWAYS-ON: Context7 (verify CONTEXT7_API_KEY populated), Supabase.
- KEEP MANUAL: next-devtools, Vercel (prefer `vercel` CLI for routine), Playwright (the one canonical browser MCP), chrome-devtools (perf/Lighthouse/a11y — the redundancy to cut is Puppeteer, not this).
- **DROP:** GitHub MCP (use `gh` CLI, 4–32× cheaper), Filesystem MCP (native Read/Glob/Grep), Puppeteer (redundant browser driver), Resend MCP (no key, disabled, duplicate entry).
- **WIRE-OR-DROP:** Sentry MCP (useful in prod only if token set + un-disabled; else `sentry-cli`).

**2.5 CLI-first policy** for routine ops, MCP for introspection: PROMOTE `gh` (replaces GitHub MCP), WIRE `vercel` (env pull/deploy), WIRE `supabase` (migration-file generation + local stack — underpins version-controlled schema, Part 4).

**2.6 DROP outright:** `setup-matt-pocock-skills` (dead — `disable-model-invocation:true` + every downstream skill it configures is absent). **Helper-function list copied in 4 places** (session-start.ps1, iconsa-supabase-migration, iconsa-rls-validation, CLAUDE.md) — single-source in iconsa-supabase-migration; others point to it + "verify against pg_proc".

### Part 3 — The SDLC Loop

**3.1 Two-actor model:** Code (only agent that reads docs + writes code, from the one repomix bundle). James (human: scope, business-rule rulings R26/BL-2/legal, the read-before-merge comprehension gate). Chat-as-strategy-partner = **not a separate reader**; fed the same repomix bundle, produces proposals → ADRs/spec updates that land in the canonical set. No "Chat docs", no "Code docs".

**3.2 The 6-phase loop** (per feature / vertical slice):
1. **FRAME** (James + Chat, JIT) — brainstorming for net-new shape; grill-with-docs stress-tests → captures decisions as ADRs + CONTEXT updates; James rules open questions.
2. **PLAN** (Code) — writing-plans → **committed** plan in docs/superpowers/plans/ (untracked plans are invisible to repomix). Reads ADR README first, then 02/05/07/04/CONTEXT.
3. **BUILD** (Code, TDD) — red→green→refactor; DDL via **committed .sql** (Part 4) reviewed as a diff, applied via Supabase MCP; hooks fire always.
4. **VERIFY** (Code, then CI) — verification-before-completion → `npm run verify`; Stop hook reminds; **gate of record = CI** (tsc+lint+vitest+e2e+build + gitleaks + npm audit + golden-set evals).
5. **REVIEW** (Code → James) — requesting-code-review (raised) + /security-review + iconsa-rls-validation; Code emits a plain-Spanish "what changed / why safe / what could break" explainer; **James comprehension gate** (§3.4), non-skippable for auth/RLS code.
6. **CLOSE** (Code) — finishing-a-development-branch; update the THREE single-sourced docs (CHANGELOG/02-status/ADR); slim 09; handoff + PreCompact.

**3.4 Comprehension gate (bus-factor-1 countermeasure):** James is a newer dev delegating heavily; AI-assisted coders carry a ~17pt comprehension gap (worst on debugging), and the deepest-risk code is auth/RLS/SECURITY DEFINER/cross-app auth.users. Make the human's understanding a process artifact: Code's plain-Spanish explainer per change-set + periodic "James explains the auth/RLS module back". Pair with golden-set evals so James isn't the only line of defense.

### Part 4 — Where the orchestrator/project were wrong (load-bearing corrections)

**4.1 Feature structure — 7-group sequence is a flawed BUILD ORDER (catalog is fine):**
- **VACACIONES (F10) unbuildable as specified** — `computed: días disponibles` has no data source (leave-balance/accrual ledger = "gap #1", deferred to v2). Build `hr.leave_balances` + accrual ledger as explicit prereq, OR descope VACACIONES v1 to request-only (HR validates manually) and document the limitation.
- **Dependency inversion** — 16 form types (Groups 5–6) have no UI to submit/approve until Group 7 (F28/F29/F30), yet done-criterion is "E2E happy path green" → impossible. Move F28/F29/F30 forward to ship with the first form.
- **Group 4 "engines first, no consumer"** violates the project's own vertical-slice doctrine — build engines just enough to drive ONE form E2E (minimal E1+E2+E3+E4), defer E5 PdfEngine, E6 already started.
- **W1-W2-W3 reframe: right instinct, wrong packaging** — re-sequencing is correct, but a new wave taxonomy on top of 7 groups + tag plan + MEMORY + the just-deleted ROADMAP = a fourth competing tracker (the drift we just paid down). **Reject the W1-W2-W3 naming; re-sequence within the existing group/tag vocabulary, in ONE ADR.**
- **F33/F34/F36 placement genuinely undecided** (deleted ROADMAP said Group 3; 02 says Group 7) — one ADR fixes it (recommend Group 3 — profile/settings/notification surfaces).
- **"39 = MVP, no subset" over-scoped** — recommend a thin **First Usable Release**: profile + directory + ONE complete request type (CARTA_TRABAJO — simplest chain, most requested, no leave-ledger dep) E2E through real UI + admin action. Keep F1–F39 as committed catalog/backlog, not the v1 gate.
- **ACCION_PERSONAL = 1 form family, not 6** → ~33 build units, not 39; sequence it LAST (comp-sensitive + hardest chain + blocked on BL-2 president self-approval).

**4.2 SDLC maturity — three P1 gaps no hook/RLS addresses:**
- **No CI.** `npm run verify` is a suggestion, not a gate; no `.github/`. **P1: add `.github/workflows/verify.yml`** (verify + gitleaks + `npm audit --audit-level=high`) on push/PR + branch protection. Highest-ROI single artifact. CI > Stop hook.
- **Schema not version-controlled.** ZERO `.sql` files — 43 migrations live only in the remote DB + as prose. No diff review of RLS/SECURITY DEFINER, no drift detection, no reproducibility (Batch 4 irreversibly DROP'd the backup schema). **P1: `supabase db pull` → commit to `supabase/migrations/`; all future DDL through committed SQL** (reviewed as a diff first).
- **Panama Ley 81/2019 absent from all 26 rules + 14 docs.** App stores medical_info, allergies, CSS numbers, salaries, national IDs, photos — all sensitive under a law in force since 2021, enforced by ANTAI ($1k–$10k/offense). **P1: add a compliance doc + R27** (consent at onboarding, 7-year retention, breach-notification runbook, hr_admin confidentiality ack, data-subject access/rectification). Validate with a Panama lawyer before go-live.
- **P2/P3:** prove backups (PITR + one restore drill; **Storage is excluded from DB backups**); golden-set evals (R11 chains/modes, R13 RLS matrix); lightweight agent observability (per-session ledger of files/tests/cost); pin Node via `.nvmrc`/engines + adopt Supabase local stack.

### Part 5 — Ratification (the 4 decisions James must bless)

1. **Doc set** collapses to the 9-file canonical operational tier + `docs/future/`, re-keyed by role+cadence; ADRs merge into one repo-local sequence read-first via README.
2. **Harness:** DROP GitHub/Filesystem/Puppeteer/Resend MCPs + setup-matt-pocock-skills; reconcile enabled/disabled config; fix router namespaces + the phantom advisor tool; INSTALL Stop hook + brainstorming; CLI-first for gh/vercel/supabase.
3. **SDLC:** 6-phase loop, 2-actor model (Chat = strategy via same bundle, not a parallel reader), comprehension gate non-skippable for auth/RLS.
4. **Corrections:** re-sequence to vertical slices (reject W1-W2-W3 naming), descope/prereq VACACIONES, "First Usable Release" milestone, and the three P1 maturity gaps (CI, version-controlled schema, Ley 81/R27) accepted as committed work before further breadth.

---

## PART B — GROUPS / MVP VERDICT

**TL;DR:** The 7-group F1-F39 plan is a good *catalog* and a *bad build sequence*. Keep the catalog, kill "39 = MVP, no subset", re-sequence around vertical slices. forms-first instinct is correct; W1-W2-W3 naming is wrong — fix the sequence inside the existing group/tag vocabulary. Two hard blockers make the current order literally unexecutable to spec today.

**1. Sound?** As a catalog yes; as a build sequence no. Group 4 = consumerless horizontal layer (anti-vertical-slice); Cat A/B split sequences on the wrong axis (SOP-origin, not chain complexity — Cat B is *simpler* and holds CARTA_TRABAJO); ACCION_PERSONAL inflates count (1 family, 6 children).

**2. Order right?** No — hard inversion: F28/F29/F30 (the only ticket UI) are in Group 7 (last), but Groups 5/6 ship 16 forms whose done-criterion is "E2E happy path" — impossible without UI. Second blocker: VACACIONES F10 unbuildable (no leave-balance data).

**3. 39 = right MVP?** Over-scoped. Hardest 0-to-1 (auth+onboarding) is done. First usable product ≈ 8-10 features: profile + directory + ONE request type E2E + admin surface. North-star (~30% tickets digital) moves on a single working type. Keep F1-F39 as backlog; bless "First Usable Release" as a distinct milestone.

**4. Keep forms-first / W1-W2-W3?** Keep the diagnosis, drop the packaging. W1-W2-W3 exists in no repo doc; layering it on 7 groups + tags + MEMORY + deleted ROADMAP recreates the multi-tracker drift (`feedback_handoff_macro_roadmap` lesson). Re-sequence inside existing group/tag vocabulary.

**5. Recommended definition to adopt:**

- **MVP = "First Usable Release"** (distinct from F1-F39 catalog): (1) Profile + directory (F6, F8); (2) ONE request type fully E2E through real UI — **CARTA_TRABAJO** (any_of_hr, simplest, most requested, no leave-ledger dep) — proving FormEngine+ApprovalEngine+ChainResolver+StampEngine+NotificationEngine + ticket UI; (3) minimal admin action (F31).
- **Re-sequenced groups (same vocabulary, corrected order):**
  - **Group 3:** F6, F8 first; then F7 (SCD-2), F33 (settings), F34 (robust profile), F36 (notif inbox). Defer F9 (KB-GDrive).
  - **Group 4:** first vertical slice — minimal E1+E2+E3+E4 just enough to ship CARTA_TRABAJO + ticket UI F28/F29/F30 + minimal F31. Defer E5; E6 already started.
  - **Group 5:** breadth wave 1 — the ~10 `any_of_hr`/`direct_hr_admin` 1-step forms (no president, no computed) + F32 manual-entry.
  - **Group 6:** breadth wave 2 — VACACIONES, PRESTAMO, ACCION_PERSONAL family — **gated on** (a) leave_balances ledger built or VACACIONES descoped, and (b) BL-2 president self-approval resolved.
  - **Group 7:** extras — F35 search, F37 audit viewer, F38 print, F39 type-viewer, F9 KB. v1.1 candidates.
- **Two prerequisites to decide before they block:** VACACIONES (build ledger vs descope to request-only); BL-2 (resolve before ACCION_PERSONAL).

**6. Doc changes so it sticks:** one ADR fixes group membership + new sequence + supersedes the wave plan; 02-MVP-SCOPE = sole status owner; correct the count (~33, not 39); reframe Decision #5 in 01-VISION ("39 = full catalog" + "First Usable Release" = v1 milestone).

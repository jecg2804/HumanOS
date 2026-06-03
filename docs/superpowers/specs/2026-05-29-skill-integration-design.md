> **ARCHIVADO / SUPERSEDED (2026-06-03).** merge de los 2 ADR-ledgers DONE 2026-06-01 (ver docs/adr/README.md History). Estado vivo: `docs/STATUS.md`. No empezar aqui.

# Skill Integration Design — HumanOS Claude Code Harness

**Status:** ACCEPTED (lead engineer decision, ratified by James 2026-05-29)
**Scope:** Solo-dev (James + Claude Code) harness for Groups 3-7 (F6-F39)
**Supersedes:** the "brainstorming skip — already done in Chat" note in `docs/06-FRAMEWORK-CLAUDE-CODE.md` §Workflow + §Overnight phases

---

## 0. The decision in one paragraph

We keep **grill-with-docs** (local, Pocock) and **Superpowers** (plugin) and run them **together**, because they produce non-overlapping artifacts: Superpowers writes the *what/how* (spec + plan + tests + verified code); grill writes the *why/vocabulary* (CONTEXT.md glossary + ADRs). The seam between them is a **~12-line edit to the local `grill-with-docs/SKILL.md`** plus a **3-stop human convention in CLAUDE.md** — **not** an orchestrator skill and **not** an edit to the Superpowers plugin cache. Grill is inserted **between the spec and the plan** (grill the cheap-to-revise spec, never the code-laden plan). Before any of this goes live we **collapse the dual ADR ledger** (`docs/08-ADRs.md` + `docs/adr/`) into one monotonic sequence, because grill is about to start writing `docs/adr/0009-*` into a number that `08-ADRs.md` already occupies. We wake five dormant plugins (`typescript-lsp`, `code-review`, `security-guidance`, `claude-md-management`, `commit-commands`) at specific pipeline stages. We adopt **nothing** from ECC / GSD / gstack / Ralph as a system; we steal at most one idea from each only if a concrete pain appears.

## 1. Do we use Superpowers AND grill-with-docs together? — YES

Verified: Superpowers does **not** read ADRs or CONTEXT.md; grill does not read specs/plans. They are mechanically disconnected but **complementary**, not redundant.

- **Superpowers self-review** only checks coverage, placeholders, type consistency — all *internal* to the plan. It cannot catch a term that contradicts the glossary or a decision that violates an existing ADR.
- **Grill** is the only thing in the harness that challenges a design against `CONTEXT.md` and `docs/adr/`. Examples it catches that Superpowers would encode happily: "supervisor is emergent, not an `app_role`"; a plan creating a new MDM schema (kills on "MDM is PULL not PUSH" + R1 allowlist).

Grill keeps its behavior unchanged; we only teach it *where to find the artifact under review*. It stays read-and-challenge, writing only CONTEXT.md + ADRs.

## 2. The connection mechanism — EDIT the local grill SKILL.md (+ CLAUDE.md convention)

| Option | Verdict | Why |
|---|---|---|
| Edit the Superpowers cache SKILL.md | **REJECTED** | Cache keyed by `plugin+version`; edits vanish on version bump (orphan dir auto-removed). |
| New local orchestrator skill | **REJECTED** | Re-implements Superpowers' own self-chain (lives in cache, drifts on update). Surface for ~zero gain. |
| **Edit local `grill-with-docs/SKILL.md` + CLAUDE.md convention** | **CHOSEN** | Local, we own it. ~12 lines. Touches nothing in cache. Degrades gracefully (no SP artifact → grill behaves as today). |

**Half A — text added to `.claude/skills/grill-with-docs/SKILL.md`** (after the "Interview me relentlessly" paragraph): a "Plan under review (Superpowers handoff)" block that reads the most-recently-modified file in `docs/superpowers/specs/`, treats it as the design under review, and grills only the gaps (terminology vs CONTEXT.md, decisions vs ADRs, silent hard-to-reverse choices). Prefers grilling a SPEC over a PLAN. "Most recently modified file" (not a hard path) so it reverts to no-op if Superpowers changes its output dir.

**Half B — 3-stop convention in CLAUDE.md §Workflow:** `brainstorming` → (writes spec, STOP) → `grill-with-docs` (grills spec, writes ADRs) → `writing-plans` (same spec). Breaks Superpowers' brainstorming→writing-plans auto-chain so grill runs in between.

**Survives plugin updates:** only the local grill file is edited; CLAUDE.md references SP skills by stable namespaced name; zero cache files touched.

## 3. The full pipeline — stages → skills → dormant plugins

```
BRAINSTORM ─► SPEC ─► GRILL(spec) ─► PLAN ─► DEV(plan+ADRs+CONTEXT) ─► VERIFY ─► REVIEW ─► CLOSE
```

| Stage | Primary skill | Reads | Writes | Wake dormant plugin |
|---|---|---|---|---|
| Brainstorm | `superpowers:brainstorming` | user intent | — | — |
| Spec | (brainstorming output) | — | `docs/superpowers/specs/<date>-design.md` | — |
| Grill | `grill-with-docs` (local) | spec, CONTEXT.md, docs/adr/, code | CONTEXT.md, `docs/adr/NNNN-*.md` | `claude-md-management` (only on doc drift) |
| Plan | `superpowers:writing-plans` | spec + the ADRs grill wrote | `docs/superpowers/plans/<date>-*.md` w/ `**Decisions in scope:** ADR-NNNN` header | — |
| Dev | `executing-plans`/`subagent-driven-development` + `test-driven-development` | **plan=task list, ADRs=guardrails, CONTEXT=JIT glossary** | code + tests | `typescript-lsp` (live diagnostics in TDD) |
| Verify | `verification-before-completion` | — | `npm run verify` evidence | `typescript-lsp` |
| Review | `requesting-code-review` + `iconsa-rls-validation` | diff | findings | `code-review` (correctness), `security-guidance` (auth.users/RLS/allowed_apps = R2/R4/R22) |
| Close | `finishing-a-development-branch` | — | branch/PR | `commit-commands` |

**The three-read mental model for Dev (non-negotiable):** Plan = *"what's the next step"*; ADR = *"am I allowed to do it this way"* (read ADRs named in the plan's `Decisions in scope` header before touching schema/RLS/approval chains/auth.users/MDM); CONTEXT.md = *"what does this word mean"* (JIT lookup). Do NOT merge plan + ADRs into one mega-doc.

## 4. ECC / GSD / gstack / Ralph — what to adopt and refuse

**Default posture: REJECT all four as systems.** Stacking frameworks creates the documented failure mode: multiple auto-invoked skills competing for the same stage. We already run the recommended pairing (grill = decide/context, Superpowers = execute).

| Framework | What it is | Verdict | Steal-later idea (only if a pain appears) |
|---|---|---|---|
| **GSD** | Spec/context-anchor; fresh ~200K window per phase; `PROJECT.md`/`DECISIONS.md`/`KNOWLEDGE.md` | DO NOT ADOPT | If context rot bites on a long group, replicate *fresh-window-per-phase* via `superpowers:dispatching-parallel-agents` — no install, no new doc system |
| **gstack** | Virtual eng-team roles (CEO/EngMgr/Designer/Reviewer/QA/Security/Release) | DO NOT ADOPT | The security + eng-review lenses are covered by waking `security-guidance` + `code-review` |
| **ECC** (affaan-m) | Harness-native operator system: ~180-250 skills, instincts, cross-session memory, AgentShield | DO NOT ADOPT | "research-first dev" already = R10 (Context7 check) |
| **Ralph** (`while true` loop) | Brute-force re-feed until done | DO NOT ADOPT (one exception) | A single tightly-bounded mechanical refactor *could* loop behind `npm run verify` as the done-gate. Not in the standard pipeline |

Also reject the bdarbaz `/s:` mega-merge (re-implements six frameworks under one namespace — larger surface than our two-system seam).

## 5. The dual-ADR-ledger fix — MERGE `docs/08-ADRs.md` into `docs/adr/` (BLOCKING)

Two independently-numbered ledgers exist: `docs/08-ADRs.md` (Chat-level, 0001-0014) and `docs/adr/` (Code-level, 0001-0008), bridged by a hand-maintained cross-ref table. Grill's ADR-FORMAT numbers by "scan `docs/adr/` for the highest number and increment" → it will create **0009**, which `08-ADRs.md` already has with different content. The moment grill runs, "ADR-0009" becomes ambiguous. **Prerequisite, not nice-to-have.**

Fix: (1) `docs/adr/` (one-file-per-ADR) is the surviving home. (2) Renumber every entry into one monotonic `0001..00NN` with no clashes (preserve dates/content; note prior Chat-ledger number in body if needed). (3) Add `docs/adr/README.md` index. (4) Delete `docs/08-ADRs.md` + cross-ref table; update CLAUDE.md import to `@docs/adr/*.md` + README. (5) Append-only from here.

Stopgap (only if the pipeline must run before the merge): pin grill to "next number after the max across BOTH ledgers." Band-aid — do the merge first.

## 6. Implementation checklist (ordered)

1. **[BLOCKING]** Merge `docs/08-ADRs.md` → `docs/adr/` (single sequence + README index); delete old file + cross-ref table; update CLAUDE.md import. (§5)
2. ✅ Edit `.claude/skills/grill-with-docs/SKILL.md` — Half-A block. (§2)
3. ✅ Add the 3-stop "Pipeline canonico" convention to CLAUDE.md §Workflow. (§2)
4. Update `docs/06-FRAMEWORK-CLAUDE-CODE.md` — replace the stale "brainstorming skip" workflow + Overnight-phases with `brainstorm → spec → grill → plan → dev → verify → review → close`. (§0)
5. Add plan-template header line `**Decisions in scope:** ADR-NNNN`. (§3)
6. Wake the five dormant plugins at their mapped stages; add a `docs/superpowers/specs/` existence smoke check to the pre-overnight checklist. (§3)
7. (Optional) Advertise the pipeline in `.claude/skill-rules.json`.

**Hard-enforcement escape hatch:** if James repeatedly skips the grill step, the only deterministic lever is a hook (Stop/PostToolUse blocking "execute plan" until an ADR/CONTEXT update is detected). Grill is interactive by nature, so advisory chaining is the right weight today — reserve the hook for observed repeated skipping.

# Overnight Council Build — Charter + Morning Report (2026-06-05)

> **Read this first in the morning.** This is the operating contract for the authorized overnight
> council-driven build (ADR-0033) AND the running progress log. The PROGRESS LOG at the bottom is
> appended slice-by-slice through the night.

## Restore points (how to roll back)

- **Repo, to this exact pre-build moment:** `git checkout pre-overnight-2026-06-05` (tag at `7a3d468`).
  `main` was NOT touched — it still points at `7a3d468`.
- **All overnight work** is on branch `overnight/mvp-build-2026-06-05`, one commit per slice. Roll back
  to any slice with `git reset --hard <commit>` or `git revert <commit>`.
- **DB:** additive-only + snapshots in `backup.*` (each data write names its snapshot in the log). DB is
  reversible *in practice* (compensating migration + snapshot restore), **not** via `git`. See ADR-0033.

## Mission

Drive the **critical path** of the HumanOS MVP as far as it safely goes overnight, council-designed and
adversarially reviewed, fully documented and reversible. NOT a promise to finish Groups 3-7 — a promise to
make maximum *correct, reversible, reviewed* progress and hand back an honest report.

## Boundaries (ADR-0033 — non-negotiable)

| WILL | WILL NOT |
|---|---|
| Branch + tag; one commit per slice with living docs in the same commit | Touch `public.*` / `humanos.*`; change hooks/`settings.json` / Exposed Schemas |
| Additive DB migrations, snapshot-first, RLS+COMMENT, gated by migration-reviewer + rls-reviewer | Destructive ops on `auth.users` or `hr.people` identity |
| `npm run verify` (full gate) green before every commit | Deploy to prod; enable the SDX cron (needs vendor auth) |
| Adversarial council (research + R1-R27 + Ley 81, refute-by-default) in place of attended design | Merge to `main` (left as your clean restore point) |
| Defer + FLAG anything needing domain truth (SOP/R26) or vendor facts | Guess at SOP chains, A/C/S semantics, or vendor auth |

## Council architecture (per work-slice)

Replaces the attended `brainstorm → grill → writing-plans → review` pipeline with a Workflow-orchestrated
multi-agent council. Main loop (Code) stays the integrator + the sole DB-apply checkpoint.

1. **Ground** (parallel): repo-context (ADRs/CONTEXT/business-rules/STATUS) + external best-practice
   (Context7/web for the libs in play) + live-source (DB/SDX facts).
2. **Design proposals** (parallel, diverse lenses): DB/data-architect · security/Ley81/RLS guardian ·
   MVP-pragmatist (YAGNI). Each proposes independently.
3. **Adversarial cross-review + synthesis**: each proposal critiqued by the other lenses + an R1-R27
   judge; synthesizer merges into ONE spec (+ ADR if a decision crystallizes), recording rejected
   alternatives.
4. **Plan**: decompose into atomic tasks with full code; self-review (spec coverage, placeholder scan,
   type consistency).
5. **Build**: subagent-driven; **migrations written as files, not applied**; tests written (TDD where
   feasible).
6. **DB-apply gate (main loop)**: review migration SQL (migration-reviewer + rls-reviewer) → snapshot
   `backup.*` → apply additively (writable MCP) → verify live.
7. **Adversarial code-review council**: correctness · security/RLS · R1-R27 · library-API-currency
   (Context7) · Ley 81 lenses → verify findings (refute-by-default) → fix.
8. **Verify**: `npm run verify` + RLS validation queries + live DB checks.
9. **Commit (main loop)**: per slice, living docs (CHANGELOG/STATUS/CONTEXT/ADR) in the same commit.

When context fills: write a handoff (skill `handoff`) and continue in a fresh session, pointing at this
charter.

## Work queue (priority order — critical path)

1. **people-sync v2** (designed with Jaime this session; council finalizes + builds). Sidecar
   `hr.employment_classifications` (SCD-2) + `hr.apply_spectrum_classification` + `hr.sync_spectrum_people`
   (flag-only, never writes `hr.people` identity) + `_shared/sdx.ts` + `sdx-people-sync` Edge +
   gated cron route. Design summary frozen in the PROGRESS LOG below.
2. **SEC-CONSENT Ley 81 wiring** (P1, active prod gap: `hr.consent=0` vs `hr.medical_info=43`). Wire
   onboarding consent capture + block sensitive writes without it. Lawyer-validated text exists.
3. **Group 3 signup cluster**: SIGNUP-datamodel (link `employee_code`↔`person_sources`), session-bug,
   phone (email-only login), guardrails (11 rules), employee_code formula + collision.
4. **Critical-path extensions as safe**: KB read model finish, HumanOS own private storage bucket
   (attachments), DATA-HYGIENE value backfill (gated on Samantha vocab — likely partial/flag).

## Autonomy model (Jaime asleep ~7h — NO deferral)

The council does **not** stop and wait. At every fork it makes the best evidence-grounded call, **logs it
as an ASSUMPTION** (below) + an ADR if it's architectural, and **keeps moving**. Goal = **churn as many MVP
groups as possible**, not gold-plate one. Jaime reviews assumptions in the morning; branch + tag + `backup.*`
snapshots make every slice reversible.

**Continuous-loop mechanism:** each slice runs as a background Workflow (council). On completion the main
loop integrates (applies reviewed migrations, commits, appends the log) and launches the next slice. If a
gap ever opens, `ScheduleWakeup` keeps the loop alive. Handoff doc written if the session must restart.

### Assumptions taken (morning review — revert any you dislike)

- Spectrum `Employment_Status`: **A = activo; C/S = no-activo ⇒ flag** (label assumption; logic is
  compare-and-flag regardless). Confirm exact C/S meaning later.
- SOP chains are read from the SOR (GDrive `RECURSOS HUMANOS` + `docs/work/2026-06-03-hr-catalog-and-launch-plan.md`)
  and implemented faithfully; any ambiguity resolved to the most-faithful reading + logged here.
- (Appended slice-by-slice as taken.)

### Hard-stops (safety boundaries — NOT pending decisions)

- SDX cron stays **disabled** (vendor auth unconfirmed); `public.people` retirement / `payroll.*` physical
  move / Exposed-Schemas changes / prod deploy = **owner actions, not done overnight**.

---

# PROGRESS LOG (morning report)

Each entry: slice · status · commit · DB changes (+ snapshot) · verify result · open items.

- **2026-06-05 — Phase 0: governance + safety** — DONE. Tag `pre-overnight-2026-06-05`; branch
  `overnight/mvp-build-2026-06-05`; ADR-0033; this charter. No DB changes. (commit pending)

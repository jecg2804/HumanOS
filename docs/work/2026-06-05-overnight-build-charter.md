# Overnight Council Build — Charter + Morning Report (2026-06-05)

> **Read this first in the morning.** This is the operating contract for the authorized overnight
> council-driven build (ADR-0033) AND the running progress log. The PROGRESS LOG at the bottom is
> appended slice-by-slice through the night.

## MORNING TL;DR (2026-06-05)

**Shipped + verified + committed + pushed** on branch `overnight/mvp-build-2026-06-05` (4 commits; `main` untouched at `7a3d468`). Every slice was adversarially council-reviewed — the council caught fabricated metrics, dead-code test-theater, a consent-bypass function overload, and a collision-formula bug **before** they shipped.

| # | Slice | What | Verified | Commit |
|---|---|---|---|---|
| 1 | **people-sync v2** (Core MDM) | mig 089: `hr.employment_classifications` SCD-2 sidecar + `sync_spectrum_people` (FLAG-ONLY) + Edge `sdx-people-sync` deployed | LIVE cold-start: 184 read, 176 matched, 2 Z-skip, 12 flagged; `hr.people` untouched; 0 R12 viol. | `294156b` |
| 2 | **SEC-CONSENT Ley 81** (P1 gap) | mig 090: L1 RPC guard + L2 `hr.medical_info` trigger + `has_active_consent` + `v_pending_reconsent`; consent UI step | LIVE: L2 blocked a no-consent medical insert (0 stray); 43 flagged, 0 fabricated | `9efc1c2` |
| 3 | **signup `employee_code` formula** | mig 091: `hr.generate_employee_code` (PO-06) + CI-unique index; full signup-cluster DESIGN | LIVE: `ZZZ999->ZZZ99A`, `Nunez->NUN899`, real `CUC166` collision->`CUC16A` | `806f01a` |

**Test in the morning** (E2E is NOT in `npm run verify`, so unverified by me):
- Onboarding wizard end-to-end (new **consent step 6**; 11-step flow). Note: no session is created post-onboarding yet (SIGNUP-session-bug is **designed, not built**).
- Re-run people sync (`POST /functions/v1/sdx-people-sync`, anon bearer) -> idempotent; review the **12 flags** in `core.sync_runs.details` (6 Spectrum actives absent from `hr.people`; 6 status mismatches) = HR-admin follow-ups, not bugs.
- Review `hr.v_pending_reconsent` (the 43) and decide the re-consent prompt rollout.

**Flagged for your ATTENDED build (NOT done — R22/auth.users / needs E2E / vendor / legal):**
- SIGNUP-session-bug, SIGNUP-phone, SIGNUP-guardrails + wiring `generate_employee_code` into `create_employee_with_invite` (designed: `docs/superpowers/specs/2026-06-05-signup-cluster-design.md` + ADR-0036).
- SDX nightly cron stays **disabled** until the vendor confirms the GUID/auth quirk.
- Consent legal text is a **BORRADOR** pending your lawyer (`src/lib/consent/legal-text.ts`; `legal_version` makes the swap clean).
- Spectrum `Employment_Status` C/S exact meaning to confirm with Samantha (flag labels only).
- Group 4 engines + VACACIONES: a **design-only** spec is being produced for you to react to before an attended build.

**Rollback:** repo -> `git checkout pre-overnight-2026-06-05` (or reset to any commit). DB -> additive only; snapshots `backup.person_sources_pre_spectrum_20260605` + `backup.people_pre_consent_flag_20260605`; reverse via compensating migration (not `git`). New ADRs: 0033 (the exception) + 0034/0035/0036.

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
- **2026-06-05 — Phase 1: people-sync v2 (Spectrum GetEmployee, FLAG-ONLY)** — DONE. Commit pending.
  - **DB:** migration `089_people_sync_v2_classifications` APPLIED (remote version `20260605060424`; local file renamed to match). Snapshot `backup.person_sources_pre_spectrum_20260605`. New: `hr.employment_classifications` (SCD-2 sidecar, payroll/labor axis, separate from `hr.employments`) + `hr.apply_spectrum_classification` + `hr.sync_spectrum_people` (SECURITY DEFINER, service_role-only). RLS mirrors `hr.employments`.
  - **Edge:** `sdx-people-sync` DEPLOYED (Deno) + `_shared/sdx.ts` (SOAP helpers extracted; v1 `sdx-sync` untouched). Cron route `src/app/api/cron/sdx-people-sync/` present; `vercel.ts` entry OFF.
  - **Cold-start run (batch `4965244f`, verified live in DB):** rows_read 184, matched 176, enriched 176, skipped 2 (Z-sentinels `ZRIO9999`/`ZEIS99999`), flagged 12 = 6 `new_active_unmatched` (BA323, AVE701, CAS497, GAR860, QUI321, TIN470) + 6 `status_drift` (DOM689, ESP956, GUT617, ROD522, SOL256, VEL322). `core.sync_runs` people = `success` (rows_upserted 352, rows_flagged 12). FLAG-ONLY proven: `hr.people` UNCHANGED (370; Activo 184/Inactivo 186; 0 spectrum-sourced), `hr.employments` 184 current unchanged, 0 R12 multi-current; `hr.employment_classifications` 176 (all current); `raw_spectrum.sdx_landing` GetEmployee 184.
  - **Reconciliation follow-ups (NOT bugs):** the 12 flags are HR-admin data follow-ups — 6 Spectrum actives absent from `hr.people`, 6 status mismatches.
  - **Deferred (flagged, non-blocking):** cron OFF pending vendor auth/GUID; v1 `_shared` refactor deferred to an attended session; pgTAP (`supabase/tests/`) not yet wired into CI; A/C/S exact semantics to confirm with Samantha/vendor.
  - **Types + gate:** `database.types.ts` regenerated (multi-schema, all 13 schemas present + `hr.employment_classifications` + 2 fns). `npm run verify` result recorded in the manifest.
- **2026-06-05 — Phase 2: SEC-CONSENT Ley 81 (consent end-to-end, L1+L2+L3)** — DONE. Commit pending.
  - **DB:** migration `090_consent_enforcement_ley81` APPLIED + live-verified (remote version `20260605065009`; local file renamed to match — was `20260605013205`). Snapshot `backup.people_pre_consent_flag_20260605`. New: single 15-arg `hr.complete_onboarding_writes` (L1 atomic guard, +4 consent params; **old 11-arg overload DROPPED**; EXECUTE service_role/postgres only) + `hr.has_active_consent(uuid,text)` + `hr.enforce_medical_consent()` + `trg_medical_consent_guard` (L2 BEFORE INSERT/UPDATE on `hr.medical_info`) + `hr.v_pending_reconsent` view (security_invoker, 43 rows).
  - **Verified live:** 15-arg signature live / 11-arg dropped; `hr.consent`=0 (0 fabricated); **43 persons flagged** for re-consent (`SEC-CONSENT:` marker in `hr.people.review_notes`); L2 live-tested (a medical INSERT without consent was blocked with `check_violation`, 0 stray rows). SOPs IC-RH-M-01 / IC-RH-D-07 current versions present (the RPC depends on them).
  - **UI/code (L3 = capture):** `Step6Consent.tsx` (3 non-bundled required checkboxes, BEFORE emergency/medical; wizard now 11 steps) + `src/lib/consent/legal-text.ts` (`LEY81_CONSENT_VERSION='ley81-onboarding-v1'`, BORRADOR) + `WizardReducer.ts` consent state + `validation.ts` `ConsentSchema` + `actions.ts` passes the 4 consent params + `headers()` ip/ua + `Step10PhotoConfirm.tsx` sends consent on confirm. `database.types.ts` regenerated (15-arg + `has_active_consent` + `v_pending_reconsent`; no schema shrinkage). E2E `onboarding-happy.spec.ts` fixed for the new step order + an edge case (unchecked consent boxes block advance). L1 pgTAP cases added to `090_consent_enforcement.test.sql` (CALL the RPC: rollback-total, full-consent writes, idempotent re-run, empty legal_version, flag-clear).
  - **Accepted P3 fast-follows (NOT defects):** (i) `emergency_contact` consent is **L1-only** (no L2 trigger on `hr.contacts`) — medical is the strict P1 category, emergency is L1-guarded on the only live write path (the onboarding RPC); (ii) `/perfil` re-consent banner for the 1 onboarded person of the 43; (iii) legal text is **BORRADOR** pending lawyer; (iv) pgTAP not yet in the `npm run verify` gate (runs via `supabase test db`).
  - **Assumptions:** A/C/S (Spectrum status) semantics **n/a** to this slice. Legal text = BORRADOR (`ley81-onboarding-v1`); the `legal_version` pointer makes the post-review swap clean + auditable.
- **2026-06-05 — Phase 3: signup cluster (SIGNUP-formula + design of the rest)** — **PARTIAL**. Commit pending.
  - **BUILT + APPLIED + LIVE-VERIFIED — SIGNUP-formula (ADR-0036 / PO-06):** migration `091_employee_code_formula` APPLIED (remote version `20260605073213`; local file renamed to match — was `20260605022048`, which also fixed the earlier-timestamp ordering issue). New: `hr.generate_employee_code(p_apellido_paterno text, p_national_id text)` (3 surname letters de-accented UPPER + last 3 cedula digits = CUCALON+8-930-2166 -> CUC166; `SECURITY DEFINER search_path=''`, service_role-only; does NOT write `hr.people`) + `hr.people_code_ci_unique` index (UNIQUE on `upper(employee_code)` WHERE NOT NULL; coexists with case-sensitive `people_code_key`, not dropped). Collision = **alpha-first** deterministic bump (`'ABC...Z012...9'`) with `v_cand <> v_base` guard — the **B1 fix** (digit-first suffix without the guard reproduced `CUC160==base` at i=7). `src/lib/signup/employee-code.ts` = pure-TS mirror of the deterministic part; `employee-code.test.ts` = **14 vitest passed**. `database.types.ts` regenerated (`hr.generate_employee_code` present, all 13 schemas, no shrinkage).
  - **Verified live 2026-06-05:** collision bump `ZZZ999 -> ZZZ99A`; accent `Nunez -> NUN899`; `CUCALON + 8-930-2166 -> CUC16A` (a real Spectrum `CUC166`/Cucalon exists, so the generator correctly avoided reuse — ADR-0036 reconciliation working on real data); **0 stray test rows**; CI index present.
  - **DESIGNED-ONLY (flagged for ATTENDED build):** `SIGNUP-session-bug` / `SIGNUP-phone` / `SIGNUP-guardrails` + the wiring of `hr.generate_employee_code` into `create_employee_with_invite` — all documented in `docs/superpowers/specs/2026-06-05-signup-cluster-design.md` + ADR-0036. NOT built tonight: they mutate `auth.users` (R22-critical) and/or need E2E.
  - **Assumptions:** (i) `CUC166` is a **real** collision (existing Spectrum/Cucalon person), so the generator must NOT reuse it — exactly what ADR-0036 reconciliation prescribes; (ii) `hr.people.people_code_key` stays **case-sensitive** and the new `people_code_ci_unique` CI index **coexists** (additive, non-destructive — case-sensitive key not dropped).

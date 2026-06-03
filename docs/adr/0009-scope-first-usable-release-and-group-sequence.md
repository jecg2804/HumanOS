# First Usable Release = full form catalog, built de-risk-first; groups re-sequenced; honest build count ~33 not 39

**Decided 2026-05-29 (Jaime), captured 2026-06-01 (audit S1-S4).** Supersedes the W1-W2-W3
phasing proposal (rejected) and reframes Decision #5 of `reference/vision.md`.

## Scope: First Usable Release covers ALL forms

The product target ("First Usable Release") is the **complete form catalog**, not a
hand-picked subset. Jaime' decision: HumanOS replaces the paper/Humand flow only when every
SOP form is digitized, so partial form coverage is not a shippable milestone for the business.

This is a *scope* statement, not a *build-order* statement (see below). "39" in `reference/vision.md`
remains the **catalog size** (the full set of form variants); "First Usable Release" is the
**milestone** where that catalog is usable end-to-end. (S4 reframe: catalog ≠ milestone — the
two were conflated before.)

## Build order: engine + one form first, then fan out (de-risk)

Even though the *scope* is all forms, the *build order* de-risks by proving the machinery on
one vertical slice before fanning out:

1. **FormEngine + ApprovalEngine + ticket UI** on a single, low-risk form — **CARTA_TRABAJO /
   constancia de trabajo** (no approval chain beyond hr_admin, no money, pure profile-sourced
   data). This exercises form_schema rendering, the ticket lifecycle, and the approval engine
   end-to-end with minimal domain risk.
2. Once the engine is proven, the remaining forms are largely **configuration**
   (`requests.types.form_schema` + `approval_chain_template`), not new code.

VACACIONES depends on the leave accrual ledger (built: migrations 047/050), so it is NOT the
first slice despite being high-value.

## Group re-sequence (within the existing groups/tags vocabulary)

The W1/W2/W3 "wave" phasing is **rejected** — it introduced a parallel vocabulary competing
with the established group/tag scheme. Instead, re-sequence inside groups:

- **Group 3** — profile + directory + knowledge base (no approval engine yet).
- **Group 4** — the de-risk slice: FormEngine + ApprovalEngine + ticket UI + CARTA_TRABAJO,
  then the simple profile-sourced forms.
- **Group 5** — remaining simple forms (config over the proven engine).
- **Group 6** — president-gated / money forms (PRESTAMO, ACCION_AUMENTO_SALARIO).
- **Group 7** — extras (EPP, incident reports, exit interviews, training).

(Exact form-to-group assignment stays in `reference/mvp-scope.md`; this ADR fixes the *sequencing
principle*, not the per-form table.)

## Honest build count: ~33 units, not 39

The "39 forms" figure double-counts. **ACCION_PERSONAL is one form family** (one engine +
one schema with variants), not N separate builds; several "forms" are variants of the same
template. The realistic build-unit count is **~33**, and most are configuration once the
engine exists. Planning and estimates should use the build-unit count, not the catalog count.

## Alternatives rejected

- **Ship a subset as v1** — rejected by Jaime: the business value (retire paper/Humand)
  only materializes at full coverage.
- **W1-W2-W3 waves** — rejected: parallel vocabulary, churn against the groups/tags scheme.
- **Build forms in catalog order** — rejected: doesn't de-risk the engine; a hard form early
  (money/president gate) would couple engine bugs with domain complexity.

## Consequences

- `reference/vision.md` Decision #5 should be read as "catalog = 39 variants; First Usable Release =
  milestone at full coverage", and `reference/mvp-scope.md` as the per-form/group table.
- Group 4 is the highest-risk group (new engines); treat its first slice as a spike.
- Open per-form chain decisions (BL-2 president self-approval, BL-3..7) are tracked in
  `0020-approval-chain-template-jsonb-modes.md`, not here. BL-2 is decided (omit the president
  self-approval step + audit flag); BL-3..7 remain pending Jaime/Samantha.

## Update 2026-06-03 (Jaime) — de-risk slice changes from CARTA_TRABAJO

The de-risk first slice (above, lines 22-25/38) **changes**: instead of CARTA_TRABAJO, the engine is
proven on **ACTUALIZACION_DATOS** (FormEngine — `direct_hr_admin`, no chain, built in Group 3 with the
signup rework) and then **ACCION_PERSONAL** (ApprovalEngine — `parallel`+`president`+R8, Group 4).
Rationale: **CARTA_TRABAJO is already handled by PayDay** (low value to digitize first), while
acciones-de-personal + actualización-de-datos are Samantha's stated starting priority — so the slice
de-risks the engine incrementally (FormEngine on the simplest type, then ApprovalEngine on the hardest)
*and* delivers priority value.

**Unchanged / still valid:** full-catalog FUR scope, the Group/tag vocabulary (and the W1-W2-W3 wave
REJECTION — no parallel "ARC/wave" vocabulary), the ~33 honest build-count, ACCION_PERSONAL = one family.
The authoritative HR form catalog (fields + corrected chains + the ~14 net-new legal-gap types) lives in
**`docs/work/2026-06-03-hr-catalog-and-launch-plan.md`** (alongside `reference/mvp-scope.md`). Chain-fidelity
rules behind the corrected chains: ADR-0027.

# SDX People Sync v2 — Spectrum GetEmployee survivorship (FLAG-ONLY)

**Decisions in scope:** ADR-0032, ADR-0034

Status: FROZEN (design ratified with Jaime 2026-06-05; ground-verified against live SDX + live DB).
Feature: F0.x (Core MDM foundation, SP-0b). Backlog: `CORE-MDM` → "People sync = Edge v2 (survivorship)".

---

## 1. Goal

Nightly, idempotent sync of Spectrum `GetEmployee` (184 live records) into HumanOS, doing exactly three things and nothing else:

1. **Crosswalk** — maintain `hr.person_sources` rows (`source_system='spectrum'`, `external_id=Employee_Code`, full record in `external_data`) so HumanOS people are durably linked to their Spectrum identity.
2. **Classification enrichment** — land Spectrum's payroll/labor axis (department / occupation / cost center / union / wage class / worker-comp / trade) into a NEW SCD-2 sidecar table `hr.employment_classifications`, separate from the HR-org `hr.employments` table.
3. **Flag every divergence** — emit structured flags (status drift, new-active-unmatched) into the run record. The sync is **FLAG-ONLY**: it surfaces what a human must reconcile; it does not act on it.

## 2. Non-goals (hard guardrails)

- **NEVER writes `hr.people` identity rows.** No INSERT into `hr.people`, no UPDATE of any `hr.people` identity column (name, cédula, status, etc.). Unmatched actives are flagged, never created.
- **NEVER auto-changes `employment_status` / `hr.people.status`.** Status divergence is flagged, never written.
- **Does NOT use `GetEmployeeUDF`** (empty 184/184 — no signal).
- **Ignores `Supervisor_Code`** (empty 184/184). The org/supervisor axis stays in `hr.employments`.
- **No cédula, no salary** — Spectrum `GetEmployee` does not carry them (cédula authority = `humanos_app`/onboarding; salary authority = `payday`; ADR-0032 field_authority).
- **Does NOT modify `supabase/functions/sdx-sync/index.ts`** (v1 masters Edge stays frozen tonight; the v1 refactor to share helpers is deferred — see §10).
- **Cron stays OFF** until the vendor (Dexter+Chaney / iconsanet) confirms the intended SDX auth model. The cron entry ships **commented out** in `vercel.ts`.

## 3. Live facts (ground-verified 2026-06-05)

- `GetEmployee` returns **184 records**, 0 faults, all 21 tags present (empties render self-closing `<Tag/>`).
- `Employment_Status` distribution: **A=178, C=4, S=2**.
- Z-sentinels (SKIP, never create/flag): `ZRIO9999` (S), `ZEIS99999` (S). Both are status S. The rule `code starts with 'Z' AND code contains '9999'` selects **exactly** these two and correctly spares the two real `Z*` actives (`ZAL576`, `ZUR647`).
- `hr.people.status` is plain text with exactly two live values: **`Activo`** / **`Inactivo`**. Status map: Spectrum `A` → `Activo`; Spectrum `C`/`S` → `Inactivo`.
- `hr.people.employee_code` IS the Spectrum code (case-insensitive 1:1 match).
- `hr.person_sources` has a UNIQUE index on `(source_system, external_id)` (`person_sources_source_system_external_id_key`) — upsert target confirmed.
- Helpers exist (DO NOT redefine): `hr.is_hr_admin()`, `hr.is_supervisor_of(target_person_id uuid)`, `hr.current_person_id()`, `hr.current_app_role()`, `hr.is_president_or_admin()`, `hr.touch_updated_at()` (trigger fn).
- `audit.log`: `schema_name`, `table_name`, `source_system` are **NOT NULL** (must be set); `record_id`, `actor_id`, `reason`, `metadata` nullable; `action` NOT NULL with a CHECK allowing `'custom'`. There is NO `semantic_action`/`details`/`target` column — the semantic tag goes inside `metadata` jsonb.

### Expected first-run (cold start) result — shape of the run record

`hr.person_sources` spectrum rows existing = 0 (cold start). Of the 184 records: the 2 Z-sentinels are skipped; the rest are resolved (crosswalk → `employee_code` fallback), enriched (one classification row each), and any divergence flagged. The run record (`sync_runs`) carries `{matched, enriched, flagged, skipped, flags[], skipped_codes[]}` plus `rows_read` / `rows_upserted` / `rows_flagged`.

**Live cold-start run — VERIFIED 2026-06-05 (batch `4965244f`):** rows_read **184**, matched **176**, enriched **176**, skipped **2** (Z-sentinels `ZRIO9999`, `ZEIS99999`), flagged **12** = 6 `new_active_unmatched` (`BA323`, `AVE701`, `CAS497`, `GAR860`, `QUI321`, `TIN470`) + 6 `status_drift` (`DOM689` local Inactivo vs Spectrum A; `ESP956` Activo vs C; `GUT617` Activo vs C; `ROD522` Inactivo vs A; `SOL256` Activo vs C; `VEL322` Activo vs C). `core.sync_runs` people = `success` (rows_upserted **352** = 176 crosswalk + 176 enrich, rows_flagged **12**). SCD-2 transitions = 0 (cold-start all-inserts). FLAG-ONLY proven: `hr.people` UNCHANGED (370 total, Activo 184 / Inactivo 186, 0 spectrum-sourced); `hr.employments` 184 current unchanged; 0 R12 multi-current violations. `hr.person_sources` spectrum = 176; `hr.employment_classifications` = 176 (all current); `raw_spectrum.sdx_landing` GetEmployee = 184.

## 4. Data flow

```
Vercel Cron (DISABLED in vercel.ts; manual trigger only until vendor auth confirmed)
   └─ GET /api/cron/sdx-people-sync   (CRON_SECRET / x-vercel-cron gate, mirror of process-notifications)
        └─ fetch  SUPABASE_URL/functions/v1/sdx-people-sync   (Authorization: Bearer SERVICE_ROLE_KEY)
             └─ Edge fn sdx-people-sync (Deno, service_role)
                  1. callSdx('GetEmployee')                      → 184 records (regex-tolerant parse, retry x3)
                  2. core.land_sdx(batch, 'GetEmployee', null, recs)   → raw_spectrum.sdx_landing (BRONZE)
                  3. INSERT core.sync_runs (status='running', service='people', batch_id)
                  4. hr.sync_spectrum_people(p_records, p_batch_id)    → survivorship txn (the brain)
                       • per record: skip Z-sentinel
                       • resolve person (person_sources → fallback employee_code, then upsert crosswalk)
                       • upsert hr.person_sources
                       • hr.apply_spectrum_classification(...)          → SCD-2 sidecar
                       • compute status drift → flags[]  (NEVER writes status)
                       • unmatched + active → flags[]    (NEVER creates hr.people)
                       returns jsonb {matched, enriched, flagged, skipped, flags[], skipped_codes[]}
                  5. UPDATE core.sync_runs (status, rows_read, rows_upserted, rows_flagged, details=returned jsonb)
```

The classification SCD-2 and the crosswalk upsert are the only writes. Identity (`hr.people`) is read-only throughout.

## 5. The sidecar table — `hr.employment_classifications`

A NEW SCD-2 table holding Spectrum's payroll/labor classification axis, **separate** from `hr.employments` (which carries HR-org FKs: position/office/supervisor). Rationale: Spectrum owns the payroll/union/cost classification; HumanOS owns the org chart. Mixing them into `hr.employments` would let a Spectrum sync churn HR-org SCD-2 history. The sidecar isolates the Spectrum-authored axis with its own SCD-2 lineage.

Columns:

| column | type | notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `person_id` | uuid NOT NULL | FK → `hr.people(id)` **ON DELETE CASCADE** |
| `department_code` | text | Spectrum `Department_Code` (DIRECT/INDIRE/OPERAC) |
| `occupation` | text | Spectrum `Occupation` (free-text, 44 vals, 25 empty) |
| `cost_center` | text | Spectrum `Cost_Center` (MAR/ADM/EQO/REH/MOV/EQS/ING/CIV) |
| `union_code` | text | Spectrum `Union_Code` (SANTRAICO/NONUNION, 46 empty) |
| `wage_class` | text | Spectrum `Wage_Class` (23 vals, 63 empty) |
| `worker_comp_code` | text | Spectrum `Worker_Comp_Code` (DIRECT/INDIR) |
| `trade` | text | Spectrum `Trade` (Calificado/No Calificado/No Sindicalizado, 63 empty) |
| `valid_from` | date NOT NULL | DEFAULT `CURRENT_DATE` |
| `valid_to` | date | CHECK `valid_to IS NULL OR valid_to >= valid_from` |
| `is_current` | boolean NOT NULL | DEFAULT `true`; **set EXPLICITLY by the fn** (true on insert, false on close) — never rely on the default when closing |
| `source_system` | text NOT NULL | DEFAULT `'spectrum'` (plain text — NOT the `core.source_system` domain; this is an `hr.*` table per spec) |
| `created_from` | text NOT NULL | DEFAULT `'spectrum_sync'` |
| `deleted_at` | timestamptz | soft-delete |
| `deleted_by` | uuid | |
| `created_at` | timestamptz NOT NULL | DEFAULT `now()` |
| `updated_at` | timestamptz NOT NULL | DEFAULT `now()` (maintained by `touch_updated_at` trigger) |

Indexes / constraints:
- Partial **UNIQUE (`person_id`) WHERE `is_current AND deleted_at IS NULL`** — enforces one current classification per person.
- Index (`person_id`, `is_current`).

RLS: enabled, policies **MIRROR `hr.employments` exactly** (one per command, all `TO authenticated`):
- SELECT: `person_id = hr.current_person_id() OR hr.is_supervisor_of(person_id) OR hr.is_hr_admin() OR hr.is_president_or_admin()`
- INSERT WITH CHECK: `hr.is_hr_admin()`
- UPDATE USING + WITH CHECK: `hr.is_hr_admin()`
- DELETE USING: `hr.current_app_role() = 'admin'`

Grants: `SELECT` to `authenticated`; `SELECT, INSERT, UPDATE, DELETE` to `service_role` (the Edge fn writes via service_role / SECURITY DEFINER fns, which bypass RLS). `COMMENT ON TABLE` + `COMMENT ON COLUMN` for every column (R3). NO `_external_ids` table — `hr.person_sources` IS the crosswalk.

## 6. The two functions

Both `SECURITY DEFINER`, `SET search_path = ''`, `LANGUAGE plpgsql`. EXECUTE revoked from public/anon/authenticated, granted to `service_role` only.

### 6.1 `hr.apply_spectrum_classification(p_person_id, p_department_code, p_occupation, p_cost_center, p_union_code, p_wage_class, p_worker_comp_code, p_trade, p_batch_id) RETURNS uuid`

Returns the active classification id. Behavior:
1. Load current row: `SELECT * ... WHERE person_id = p_person_id AND is_current AND deleted_at IS NULL`.
2. **If none** → INSERT a new row (`is_current = true` explicit, `created_from = 'spectrum_sync'`); RETURN its id.
3. **If any field IS DISTINCT FROM current** (compare via `COALESCE(col,'') IS DISTINCT FROM COALESCE(p_arg,'')`, chained OR over the 7 fields) →
   - close old: `UPDATE ... SET valid_to = CURRENT_DATE, is_current = false, updated_at = now() WHERE id = v_current.id`
   - INSERT new (`is_current = true` explicit)
   - write `audit.log`: `action='custom'`, `actor_id=NULL` (system), `record_id=p_person_id`, `schema_name='hr'`, `table_name='employment_classifications'`, `source_system='spectrum'`, `reason='spectrum_classification_scd2_transition'`, `metadata` jsonb = `{semantic_action, batch_id, person_id, before:{7 fields}, after:{7 fields}}`.
   - RETURN new id.
4. **Else** (no change) → `UPDATE ... SET updated_at = now() WHERE id = v_current.id`; RETURN `v_current.id`.

Note vs the in-repo `hr.apply_employment_scd2_change` idiom: that fn does NOT set `is_current=false` on close (it relies only on `valid_to`); and its audit INSERT omits the NOT-NULL `schema_name`/`table_name`. This fn **fixes both**: explicit `is_current` management (required by the partial UNIQUE predicate) + sets `schema_name`/`table_name`/`source_system` on the audit row.

### 6.2 `hr.sync_spectrum_people(p_records jsonb, p_batch_id text) RETURNS jsonb`

The survivorship transaction. Iterate `jsonb_array_elements(p_records)` (each a GetEmployee row):

1. Read `Employee_Code`, `Employee_Name` (and the 7 classification fields + `Employment_Status`).
2. **Z-sentinel skip:** if `Employee_Code LIKE 'Z%' AND Employee_Code LIKE '%9999%'` → push to `skipped_codes[]`, `skipped++`, continue.
3. **Resolve person:**
   - (1) `hr.person_sources WHERE source_system='spectrum' AND external_id = Employee_Code` → `person_id`; else
   - (2) `hr.people WHERE upper(employee_code)=upper(Employee_Code) AND deleted_at IS NULL` → `person_id`.
4. **If matched:**
   - upsert `hr.person_sources` (`source_system='spectrum'`, `external_id=Employee_Code`, `external_data = the full record jsonb`, `last_synced_at=now()`) via `INSERT ... ON CONFLICT (source_system, external_id) DO UPDATE`.
   - `enriched++`; call `hr.apply_spectrum_classification(...)` with the 7 fields + batch.
   - **status drift:** map Spectrum status → local (`A`→`Activo`, else `Inactivo`); compare to `hr.people.status`; if different → push flag `{employee_code, name, reason:'status_drift', spectrum_value, local_value}`. NEVER write status.
   - `matched++`.
5. **If NOT matched AND `Employment_Status='A'`:** push flag `{employee_code, name, reason:'new_active_unmatched'}`. NEVER create `hr.people`. (Non-active unmatched are silently ignored — not real actives, nothing to reconcile.)
6. Return `{matched, enriched, flagged: count(flags), skipped, flags:[...], skipped_codes:[...]}`.

No write to `hr.people` identity columns anywhere. The whole fn is one transaction (function body) — all-or-nothing per run.

## 7. Survivorship / field_authority going live

ADR-0032 seeded `core.field_authority` (the SoR matrix). This sync is the first **runtime** expression of it for the people axis:
- Employment/labor classification (department/occupation/cost_center/union/wage_class/worker_comp/trade) → authority `spectrum`, mode `sor_wins` → Spectrum **writes** (into the sidecar, with SCD-2 history).
- `employment_status` → authority `humanos_app`, mode `manual_override` → Spectrum **flags only**, never writes.
- identity (names, cédula) → authority `humanos_app` → Spectrum **flags only** (new_active_unmatched), never creates.
- salary → authority `payday` → not present in GetEmployee, untouched.

ADR-0032 + ADR-0034 record this v2 survivorship runtime (FLAG-ONLY for non-authored fields; SCD-2 sidecar for the Spectrum-authored axis) as the ratified pattern; the crosswalk-first → employee_code-fallback resolution order; and the "sidecar separate from `hr.employments`" decision.

## 8. Flag taxonomy

| reason | trigger | payload | action policy |
|---|---|---|---|
| `status_drift` | matched person whose mapped Spectrum status ≠ `hr.people.status` | `{employee_code, name, spectrum_value, local_value}` | flag only — never write status |
| `new_active_unmatched` | unmatched `Employee_Code` with `Employment_Status='A'` | `{employee_code, name}` | flag only — never create `hr.people` |

Flags accumulate in the fn's return jsonb (`flags[]`) and land in `core.sync_runs.details`. `rows_flagged = length(flags)`. Z-sentinels are **not** flags (they are skips, tracked separately in `skipped` / `skipped_codes[]`).

## 9. Edge topology

- **NEW** `supabase/functions/_shared/sdx.ts` — SOAP helpers EXTRACTED (copied, generalized) from v1 `sdx-sync/index.ts`: `envelope(service, paramsMap, overrides)`, `decodeEntities`, `extractResponses` (regex-tolerant of the SDX server truncating trailing envelope close tags — keep the regex, do NOT swap in a strict XML parser), `callSdx` (retry x3, `400*attempt` backoff, treats `:Fault>` or `!res.ok` as error), `pmap`, `v()`, `dt()`. Plus a `GETEMPLOYEE_PARAMS` constant.
- **NEW** `supabase/functions/sdx-people-sync/index.ts` — imports from `../_shared/sdx.ts`. `GetEmployee` params (ground-corrected; the frozen brief's list was wrong): `['pCompany_Code','pWage_Class','pUnion_Code','pOccupation','pTrade','pStatus_Type','pCost_Center','pSort_By']` (preceded by `Authorization_ID=API` + empty `GUID`; `pCompany_Code=ICN`, rest empty). Client default schema `core` (so `land_sdx` + `sync_runs` are bare); `hr.sync_spectrum_people` called via `.schema('hr').rpc(...)`.
- **REMOVED (post-review):** an earlier draft added `supabase/functions/sdx-people-sync/mapping.ts` as a "pure, testable" TS reimplementation of the survivorship rules. It was DEAD CODE — `index.ts` never imported it (the Edge fn passes the full record array to `hr.sync_spectrum_people` and the SQL does all the per-field work). The survivorship logic lives in SQL; the TS module + its vitest file were deleted. Coverage of the SQL fns is via pgTAP (`supabase/tests/database/089_people_sync_v2.test.sql`), not a parallel TS mapper. See §11.
- **DO NOT MODIFY** `supabase/functions/sdx-sync/index.ts`.
- No tsconfig/eslint change needed: `supabase/functions/**` is already globally excluded in `tsconfig.json` (`exclude`) and `eslint.config.mjs` (`ignores`).

## 10. Cron — gated OFF

- **NEW** `src/app/api/cron/sdx-people-sync/route.ts` (`GET`) reusing the EXACT auth gate from `src/app/api/cron/process-notifications/route.ts`: fail-closed 500 if `!CRON_SECRET`; allow if `x-vercel-cron === '1'` OR `authorization === 'Bearer ${CRON_SECRET}'`, else 401. On pass, fetch `${SUPABASE_URL}/functions/v1/sdx-people-sync` with `Authorization: Bearer ${SERVICE_ROLE_KEY}` and relay the result.
- `vercel.ts`: add the people-sync cron entry **commented out**, with a clear comment that it stays OFF until the Dexter+Chaney/iconsanet vendor confirms the SDX auth model (empty-GUID works but the intended auth is unconfirmed — same caveat as v1). The existing `process-notifications` cron stays active.

## 11. Testing

- `src/app/api/cron/sdx-people-sync/route.test.ts` (vitest) for the auth gate: 500 when `CRON_SECRET` unset; 401 without secret/header; 200 (relays) with `x-vercel-cron:1` (fetch mocked). This is the only vitest file for this feature — there is no TS mapper to unit-test (the survivorship logic lives in SQL).
- **pgTAP:** `supabase/tests/database/089_people_sync_v2.test.sql` covers the SQL fns directly (the real survivorship home): `hr.apply_spectrum_classification` (insert-when-none, close+insert on change, no-op on same, one-current invariant) and `hr.sync_spectrum_people` (Z-sentinel skip, FLAG-not-create for unmatched-active, status_drift flag, never writes `hr.people`). It runs via `supabase test db` and is NOT yet wired into the vitest / `npm run verify` gate — TF-FOUNDATION will wire pgTAP into CI.

## 12. Backlog-gate matches (STATUS.md §6)

Filtered for `hr.*` + the people/classification/crosswalk/sync surface this plan touches:

| ID | Relationship | Resolution in this plan |
|---|---|---|
| **CORE-MDM** (P1, PARTIAL) | This IS the deferred "People sync = Edge v2 (survivorship)" line. | Delivers the v2 people sync (crosswalk + classification SCD-2 + flags) + the gated cron. Advances CORE-MDM; does not close it (F0.3 types/baseline regen + cron-go-live remain). |
| **DB-VISION-B** (P2, OPEN) | "bake `AND deleted_at IS NULL` in RLS of EXISTING `hr.*` tables." | The NEW sidecar is built with `deleted_at` + the resolution query already filters `deleted_at IS NULL`. We do NOT retrofit existing tables here (out of scope; that needs its own brainstorm+grill). **Re-deferred** with reason: this plan only ADDS a table; the retrofit is a separate dedicated pass. |
| **TYPES-STALE / AUDIT2B-BASELINE** (P2/P3) | New table + 2 fns change the schema → `database.types.ts` + baseline go stale. | Regenerate `database.types.ts` via `supabase gen types typescript --linked` in the SAME commit (the new `hr.employment_classifications` must appear). Baseline regen stays batched under AUDIT2B-BASELINE (orientative; migrations are the source) — **re-deferred** to the baseline pass. |
| **FND-SCD2-ATOMIC** (P2, OPEN) | Existing `hr.employments` SCD-2 path non-atomic across 2 RPCs. | Not triggered: this sync's SCD-2 (`apply_spectrum_classification`) is a single SECURITY DEFINER fn called inside the single `sync_spectrum_people` transaction — already atomic. No change to the `hr.employments` path. **No action** (different table/path). |
| **DATA-HYGIENE / SIGNUP-datamodel** (P2) | cédula backfill + `employee_code`↔`person_sources` link, gated to Group 3. | This plan WRITES the `employee_code`↔`person_sources` spectrum crosswalk (the link those items anticipate) but does NOT touch cédula/identity. Complementary, not blocking. **No conflict.** |
| **PAYROLL-RLS** (P1, PARTIAL) | `payroll.*` policies/grants. | Not touched — the sidecar is `hr.*` (HR-org axis referencing Spectrum codes as text), not `payroll.*`. **No overlap.** |

No unresolved OPEN match blocks the plan. The two re-deferrals (DB-VISION-B retrofit, baseline regen) are recorded above with reasons.

## 13. Assumptions

1. **`hr` is PostgREST-exposed.** `pgrst.db_schemas` read NULL in a direct query, but the live app already calls `.schema('hr')` (`process-notifications`) and v1 calls `core` — both work. If a deploy-time PGRST schema-cache error appears after creating the new fns, run `NOTIFY pgrst, 'reload schema'`. (Assumption: the empirical evidence beats the NULL reading.)
2. **Empty `<GUID>` works for GetEmployee** (validated 2026-06-05, HTTP 200 / 155KB / 0 faults), mirroring v1. The intended vendor auth is still unconfirmed → cron stays OFF (§10).
3. **`Employee_Code` is the stable Spectrum key** and is 1:1 with `hr.people.employee_code` (case-insensitive). Any unmatched actives are flagged for human reconciliation, not auto-created. **Live cold-start match rate (2026-06-05):** 176/182 non-Z records matched; 6 Spectrum actives unmatched (flagged `new_active_unmatched`, not auto-created), confirming the ~1:1 assumption.
4. **`Employee_Name`** (the single composite tag) is used for the flag `name`. (First/Middle/Last are present but `Employee_Name` is the display form.)
5. **`source_system` on the sidecar is plain `text` DEFAULT `'spectrum'`** (NOT the `core.source_system` domain) — per the frozen design, because the table lives in `hr.*` and we do not import the core domain into hr.
6. **One classification row per person is the invariant** (partial UNIQUE) — Spectrum is the single authority for this axis, so there is no multi-source contention on the sidecar (unlike a golden master). The crosswalk (`hr.person_sources`) remains the multi-source seam.

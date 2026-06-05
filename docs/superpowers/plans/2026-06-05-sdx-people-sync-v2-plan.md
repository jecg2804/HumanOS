# Plan — SDX People Sync v2 (Spectrum GetEmployee survivorship, FLAG-ONLY)

**Decisions in scope:** ADR-0032, ADR-0034

Spec: `docs/superpowers/specs/2026-06-05-sdx-people-sync-v2-design.md`. Every task below carries its COMPLETE final code/SQL (build-from-verbatim). Names/types are ground-verified against the live DB + repo (2026-06-05).

Migration number: **089** (last applied = `20260605033913_088_core_land_sdx_definer_rpc.sql`). Filename uses the captured timestamp `20260605003408`.

Execution order: T1 (migration → apply) → T2 (`_shared/sdx.ts`) → ~~T3 (`mapping.ts`)~~ SUPERSEDED (dead code, removed post-review) → T4 (Edge `index.ts`) → T5 (cron route) → T6 (`vercel.ts`) → T7 (tests: route.test.ts vitest + 089 pgTAP) → T8 (types regen) → T9 (CHANGELOG/docs) → gate.

---

## T1 — Migration: sidecar table + 2 functions

**File:** `supabase/migrations/20260605003408_089_hr_employment_classifications_and_spectrum_people_sync.sql`

Apply via `mcp__supabase__apply_migration` (name `089_hr_employment_classifications_and_spectrum_people_sync`) AND save the identical SQL to the repo file. After apply, run `iconsa-rls-validation` + `get_advisors`.

```sql
-- 089_hr_employment_classifications_and_spectrum_people_sync
-- F0.x (ADR-0032 + ADR-0034, SP-0b). People sync v2 = Spectrum GetEmployee survivorship (FLAG-ONLY).
-- Adds: (1) hr.employment_classifications -- SCD-2 sidecar for Spectrum's payroll/labor axis,
--           SEPARATE from hr.employments (HR-org FKs). One current row per person.
--       (2) hr.apply_spectrum_classification(...) -- SCD-2 upsert of the sidecar (SECURITY DEFINER).
--       (3) hr.sync_spectrum_people(...) -- the survivorship txn: crosswalk + enrich + FLAG drift.
-- FLAG-ONLY: never writes hr.people identity, never auto-changes status. Helpers reused (NOT redefined):
--   hr.is_hr_admin / hr.is_supervisor_of / hr.current_person_id / hr.is_president_or_admin /
--   hr.current_app_role / hr.touch_updated_at. RLS mirrors hr.employments exactly.

-- =========================================================================
-- (1) hr.employment_classifications  <- Spectrum GetEmployee (payroll/labor axis)
-- =========================================================================
CREATE TABLE hr.employment_classifications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id        uuid NOT NULL REFERENCES hr.people(id) ON DELETE CASCADE,
  department_code  text,
  occupation       text,
  cost_center      text,
  union_code       text,
  wage_class       text,
  worker_comp_code text,
  trade            text,
  valid_from       date NOT NULL DEFAULT CURRENT_DATE,
  valid_to         date CHECK (valid_to IS NULL OR valid_to >= valid_from),
  is_current       boolean NOT NULL DEFAULT true,
  source_system    text NOT NULL DEFAULT 'spectrum',
  created_from     text NOT NULL DEFAULT 'spectrum_sync',
  deleted_at       timestamptz,
  deleted_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_employment_classifications_current
  ON hr.employment_classifications (person_id)
  WHERE is_current AND deleted_at IS NULL;
CREATE INDEX idx_employment_classifications_person_current
  ON hr.employment_classifications (person_id, is_current);

COMMENT ON TABLE hr.employment_classifications IS
  'SCD-2 sidecar de la clasificacion payroll/labor de Spectrum (GetEmployee). SEPARADA de hr.employments (eje HR-org). Spectrum es la autoridad de este eje (ADR-0032 field_authority; ADR-0034). Una fila vigente por persona (UNIQUE parcial). FLAG-ONLY pipeline: nunca toca identidad ni status de hr.people.';
COMMENT ON COLUMN hr.employment_classifications.id IS 'PK.';
COMMENT ON COLUMN hr.employment_classifications.person_id IS 'FK a hr.people(id), ON DELETE CASCADE. La persona clasificada.';
COMMENT ON COLUMN hr.employment_classifications.department_code IS 'Spectrum Department_Code (DIRECT/INDIRE/OPERAC).';
COMMENT ON COLUMN hr.employment_classifications.occupation IS 'Spectrum Occupation (texto libre).';
COMMENT ON COLUMN hr.employment_classifications.cost_center IS 'Spectrum Cost_Center (MAR/ADM/EQO/REH/MOV/EQS/ING/CIV).';
COMMENT ON COLUMN hr.employment_classifications.union_code IS 'Spectrum Union_Code (SANTRAICO/NONUNION; puede venir vacio).';
COMMENT ON COLUMN hr.employment_classifications.wage_class IS 'Spectrum Wage_Class.';
COMMENT ON COLUMN hr.employment_classifications.worker_comp_code IS 'Spectrum Worker_Comp_Code (DIRECT/INDIR).';
COMMENT ON COLUMN hr.employment_classifications.trade IS 'Spectrum Trade (Calificado/No Calificado/No Sindicalizado).';
COMMENT ON COLUMN hr.employment_classifications.valid_from IS 'Inicio de vigencia SCD-2 (fecha de aparicion del valor en un sync).';
COMMENT ON COLUMN hr.employment_classifications.valid_to IS 'Fin de vigencia SCD-2. NULL = vigente. Se fija a CURRENT_DATE al cerrar.';
COMMENT ON COLUMN hr.employment_classifications.is_current IS 'true = fila vigente. Manejado EXPLICITAMENTE por hr.apply_spectrum_classification (true al insertar, false al cerrar); es el predicado del UNIQUE parcial.';
COMMENT ON COLUMN hr.employment_classifications.source_system IS 'Sistema de origen (texto plano, no el dominio core.source_system). Default spectrum.';
COMMENT ON COLUMN hr.employment_classifications.created_from IS 'Procedencia de la fila (spectrum_sync).';
COMMENT ON COLUMN hr.employment_classifications.deleted_at IS 'Soft-delete. NULL = activo.';
COMMENT ON COLUMN hr.employment_classifications.deleted_by IS 'Actor del soft-delete (si aplica).';
COMMENT ON COLUMN hr.employment_classifications.created_at IS 'Timestamp de creacion de la fila.';
COMMENT ON COLUMN hr.employment_classifications.updated_at IS 'Timestamp de ultima actualizacion (trigger hr.touch_updated_at).';

ALTER TABLE hr.employment_classifications ENABLE ROW LEVEL SECURITY;

-- RLS mirrors hr.employments EXACTLY (one policy per command, all TO authenticated).
CREATE POLICY "employment_classifications_select" ON hr.employment_classifications
  FOR SELECT TO authenticated
  USING (
    person_id = hr.current_person_id()
    OR hr.is_supervisor_of(person_id)
    OR hr.is_hr_admin()
    OR hr.is_president_or_admin()
  );
CREATE POLICY "employment_classifications_insert" ON hr.employment_classifications
  FOR INSERT TO authenticated
  WITH CHECK (hr.is_hr_admin());
CREATE POLICY "employment_classifications_update" ON hr.employment_classifications
  FOR UPDATE TO authenticated
  USING (hr.is_hr_admin())
  WITH CHECK (hr.is_hr_admin());
CREATE POLICY "employment_classifications_delete" ON hr.employment_classifications
  FOR DELETE TO authenticated
  USING (hr.current_app_role() = 'admin');

CREATE TRIGGER touch_updated_at_employment_classifications
  BEFORE UPDATE ON hr.employment_classifications
  FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();

GRANT SELECT ON hr.employment_classifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr.employment_classifications TO service_role;

-- =========================================================================
-- (2) hr.apply_spectrum_classification -- SCD-2 upsert of the sidecar
-- =========================================================================
CREATE OR REPLACE FUNCTION hr.apply_spectrum_classification(
  p_person_id        uuid,
  p_department_code  text,
  p_occupation       text,
  p_cost_center      text,
  p_union_code       text,
  p_wage_class       text,
  p_worker_comp_code text,
  p_trade            text,
  p_batch_id         text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current hr.employment_classifications%ROWTYPE;
  v_new_id  uuid;
  v_changed boolean := false;
BEGIN
  SELECT * INTO v_current
  FROM hr.employment_classifications
  WHERE person_id = p_person_id AND is_current AND deleted_at IS NULL;

  -- No current row: first classification for this person.
  IF NOT FOUND THEN
    INSERT INTO hr.employment_classifications (
      person_id, department_code, occupation, cost_center, union_code,
      wage_class, worker_comp_code, trade, is_current, source_system, created_from
    ) VALUES (
      p_person_id, p_department_code, p_occupation, p_cost_center, p_union_code,
      p_wage_class, p_worker_comp_code, p_trade, true, 'spectrum', 'spectrum_sync'
    )
    RETURNING id INTO v_new_id;
    RETURN v_new_id;
  END IF;

  -- Change detection: any of the 7 fields differs (COALESCE to '' so NULL/empty are equal).
  IF (COALESCE(v_current.department_code,'')  IS DISTINCT FROM COALESCE(p_department_code,''))
     OR (COALESCE(v_current.occupation,'')       IS DISTINCT FROM COALESCE(p_occupation,''))
     OR (COALESCE(v_current.cost_center,'')      IS DISTINCT FROM COALESCE(p_cost_center,''))
     OR (COALESCE(v_current.union_code,'')       IS DISTINCT FROM COALESCE(p_union_code,''))
     OR (COALESCE(v_current.wage_class,'')       IS DISTINCT FROM COALESCE(p_wage_class,''))
     OR (COALESCE(v_current.worker_comp_code,'') IS DISTINCT FROM COALESCE(p_worker_comp_code,''))
     OR (COALESCE(v_current.trade,'')            IS DISTINCT FROM COALESCE(p_trade,''))
  THEN
    v_changed := true;
  END IF;

  IF v_changed THEN
    -- Close the old row EXPLICITLY (valid_to + is_current=false) so the partial UNIQUE frees up.
    UPDATE hr.employment_classifications
    SET valid_to = CURRENT_DATE, is_current = false, updated_at = now()
    WHERE id = v_current.id;

    INSERT INTO hr.employment_classifications (
      person_id, department_code, occupation, cost_center, union_code,
      wage_class, worker_comp_code, trade, is_current, source_system, created_from
    ) VALUES (
      p_person_id, p_department_code, p_occupation, p_cost_center, p_union_code,
      p_wage_class, p_worker_comp_code, p_trade, true, 'spectrum', 'spectrum_sync'
    )
    RETURNING id INTO v_new_id;

    -- audit.log: system actor (actor_id NULL); schema_name/table_name/source_system are NOT NULL.
    INSERT INTO audit.log (
      schema_name, table_name, record_id, action, actor_id, reason, metadata, source_system
    ) VALUES (
      'hr', 'employment_classifications', p_person_id, 'custom', NULL,
      'spectrum_classification_scd2_transition',
      jsonb_build_object(
        'semantic_action', 'spectrum_classification_scd2_transition',
        'batch_id', p_batch_id,
        'person_id', p_person_id,
        'before', jsonb_build_object(
          'department_code', v_current.department_code, 'occupation', v_current.occupation,
          'cost_center', v_current.cost_center, 'union_code', v_current.union_code,
          'wage_class', v_current.wage_class, 'worker_comp_code', v_current.worker_comp_code,
          'trade', v_current.trade),
        'after', jsonb_build_object(
          'department_code', p_department_code, 'occupation', p_occupation,
          'cost_center', p_cost_center, 'union_code', p_union_code,
          'wage_class', p_wage_class, 'worker_comp_code', p_worker_comp_code,
          'trade', p_trade)
      ),
      'spectrum'
    );

    RETURN v_new_id;
  END IF;

  -- No change: touch updated_at only.
  UPDATE hr.employment_classifications SET updated_at = now() WHERE id = v_current.id;
  RETURN v_current.id;
END;
$$;

COMMENT ON FUNCTION hr.apply_spectrum_classification(uuid,text,text,text,text,text,text,text,text) IS
  'SCD-2 upsert del sidecar hr.employment_classifications desde Spectrum. SECURITY DEFINER, search_path=''''. Inserta si no hay vigente; cierra+inserta+audita si algun campo cambia; toca updated_at si no. is_current manejado explicito. EXECUTE service_role-only. ADR-0032 + ADR-0034.';
REVOKE EXECUTE ON FUNCTION hr.apply_spectrum_classification(uuid,text,text,text,text,text,text,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION hr.apply_spectrum_classification(uuid,text,text,text,text,text,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION hr.apply_spectrum_classification(uuid,text,text,text,text,text,text,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION hr.apply_spectrum_classification(uuid,text,text,text,text,text,text,text,text) TO service_role;

-- =========================================================================
-- (3) hr.sync_spectrum_people -- survivorship txn: crosswalk + enrich + FLAG
-- =========================================================================
CREATE OR REPLACE FUNCTION hr.sync_spectrum_people(p_records jsonb, p_batch_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rec            jsonb;
  v_code         text;
  v_name         text;
  v_status       text;
  v_dept         text;
  v_occupation   text;
  v_cost_center  text;
  v_union        text;
  v_wage_class   text;
  v_worker_comp  text;
  v_trade        text;
  v_person_id    uuid;
  v_local_status text;
  v_mapped       text;
  v_matched      integer := 0;
  v_enriched     integer := 0;
  v_skipped      integer := 0;
  v_flags        jsonb := '[]'::jsonb;
  v_skipped_codes jsonb := '[]'::jsonb;
BEGIN
  IF p_records IS NULL OR jsonb_typeof(p_records) <> 'array' THEN
    RETURN jsonb_build_object('matched',0,'enriched',0,'flagged',0,'skipped',0,
                              'flags','[]'::jsonb,'skipped_codes','[]'::jsonb);
  END IF;

  FOR rec IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    v_code := NULLIF(trim(COALESCE(rec->>'Employee_Code','')), '');
    IF v_code IS NULL THEN
      CONTINUE;  -- no code, nothing to resolve
    END IF;
    v_name        := NULLIF(trim(COALESCE(rec->>'Employee_Name','')), '');
    v_status      := upper(COALESCE(rec->>'Employment_Status',''));
    v_dept        := NULLIF(trim(COALESCE(rec->>'Department_Code','')), '');
    v_occupation  := NULLIF(trim(COALESCE(rec->>'Occupation','')), '');
    v_cost_center := NULLIF(trim(COALESCE(rec->>'Cost_Center','')), '');
    v_union       := NULLIF(trim(COALESCE(rec->>'Union_Code','')), '');
    v_wage_class  := NULLIF(trim(COALESCE(rec->>'Wage_Class','')), '');
    v_worker_comp := NULLIF(trim(COALESCE(rec->>'Worker_Comp_Code','')), '');
    v_trade       := NULLIF(trim(COALESCE(rec->>'Trade','')), '');

    -- Z-sentinel: starts with 'Z' AND contains '9999' (ZRIO9999, ZEIS99999). Skip, count, do not flag.
    IF v_code LIKE 'Z%' AND v_code LIKE '%9999%' THEN
      v_skipped := v_skipped + 1;
      v_skipped_codes := v_skipped_codes || to_jsonb(v_code);
      CONTINUE;
    END IF;

    -- Resolve person: (1) existing spectrum crosswalk, else (2) employee_code case-insensitive.
    SELECT person_id INTO v_person_id
    FROM hr.person_sources
    WHERE source_system = 'spectrum' AND external_id = v_code
    LIMIT 1;

    IF v_person_id IS NULL THEN
      SELECT id INTO v_person_id
      FROM hr.people
      WHERE upper(employee_code) = upper(v_code) AND deleted_at IS NULL
      LIMIT 1;
    END IF;

    IF v_person_id IS NOT NULL THEN
      -- Upsert the crosswalk (full record verbatim into external_data).
      INSERT INTO hr.person_sources (person_id, source_system, external_id, external_data, last_synced_at)
      VALUES (v_person_id, 'spectrum', v_code, rec, now())
      ON CONFLICT (source_system, external_id) DO UPDATE
        SET person_id = EXCLUDED.person_id,
            external_data = EXCLUDED.external_data,
            last_synced_at = now(),
            updated_at = now();

      -- Enrich classification (SCD-2 sidecar).
      PERFORM hr.apply_spectrum_classification(
        v_person_id, v_dept, v_occupation, v_cost_center, v_union,
        v_wage_class, v_worker_comp, v_trade, p_batch_id);
      v_enriched := v_enriched + 1;
      v_matched  := v_matched + 1;

      -- Status drift: map Spectrum status -> local; compare to hr.people.status. FLAG only.
      v_mapped := CASE WHEN v_status = 'A' THEN 'Activo' ELSE 'Inactivo' END;
      SELECT status INTO v_local_status FROM hr.people WHERE id = v_person_id;
      IF v_local_status IS DISTINCT FROM v_mapped THEN
        v_flags := v_flags || jsonb_build_object(
          'employee_code', v_code, 'name', v_name, 'reason', 'status_drift',
          'spectrum_value', v_status, 'local_value', v_local_status);
      END IF;

    ELSE
      -- Unmatched. Only ACTIVE unmatched are reconciliation-worthy. FLAG, never create.
      IF v_status = 'A' THEN
        v_flags := v_flags || jsonb_build_object(
          'employee_code', v_code, 'name', v_name, 'reason', 'new_active_unmatched');
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'matched', v_matched,
    'enriched', v_enriched,
    'flagged', jsonb_array_length(v_flags),
    'skipped', v_skipped,
    'flags', v_flags,
    'skipped_codes', v_skipped_codes
  );
END;
$$;

COMMENT ON FUNCTION hr.sync_spectrum_people(jsonb,text) IS
  'Transaccion de survivorship people v2 (Spectrum GetEmployee). SECURITY DEFINER, search_path=''''. Por record: salta Z-sentinels; resuelve persona (crosswalk -> employee_code); upsert hr.person_sources; enriquece clasificacion (SCD-2); FLAGea status_drift y new_active_unmatched. FLAG-ONLY: nunca escribe identidad ni status de hr.people, nunca crea personas. Retorna jsonb {matched,enriched,flagged,skipped,flags,skipped_codes}. EXECUTE service_role-only. ADR-0032 + ADR-0034.';
REVOKE EXECUTE ON FUNCTION hr.sync_spectrum_people(jsonb,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION hr.sync_spectrum_people(jsonb,text) FROM anon;
REVOKE EXECUTE ON FUNCTION hr.sync_spectrum_people(jsonb,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION hr.sync_spectrum_people(jsonb,text) TO service_role;
```

> Note: `hr.person_sources` has `updated_at` (added in mig 054) — the `ON CONFLICT ... DO UPDATE` sets it. Ground-verified the UNIQUE index `person_sources_source_system_external_id_key` on `(source_system, external_id)` exists, so the conflict target is valid.

---

## T2 — Shared SOAP helpers (extracted from v1, generalized)

**File:** `supabase/functions/_shared/sdx.ts` (NEW). Helpers copied verbatim from `sdx-sync/index.ts` lines 51-145, with `envelope` generalized to take an explicit params list + company/auth so v1 is untouched. `_shared` (leading underscore) is bundled into any importer, not deployed as its own function.

```ts
// supabase/functions/_shared/sdx.ts
// Shared Spectrum SDX SOAP helpers, extracted from sdx-sync/index.ts v1 (which stays UNMODIFIED).
// envelope() is generalized over an explicit params list so each function passes its own.
// extractResponses() keeps the regex parse: the SDX server truncates trailing envelope close
// tags on large responses, so a strict XML parser would reject the whole document.

const NS = "http://www.northgate-is.com/proiv/webservices/types";

export function envelope(
  service: string,
  params: string[],
  opts: { company?: string; authId?: string; overrides?: Record<string, string> } = {},
): string {
  const company = opts.company ?? "ICN";
  const authId = opts.authId ?? "API";
  const overrides = opts.overrides ?? {};
  const fields = params
    .map((p) => {
      const val = p === "pCompany_Code" ? company : (overrides[p] ?? "");
      return `      <${p}>${val}</${p}>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${service} xmlns="${NS}">
      <Authorization_ID>${authId}</Authorization_ID>
      <GUID></GUID>
${fields}
    </${service}>
  </soap:Body>
</soap:Envelope>`;
}

export function decodeEntities(s: string): string {
  // XML decode; &amp; LAST so &amp;lt; does not become <.
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");
}

// Extract each <response>...</response> record via regex, tolerant of the SDX server truncating
// trailing envelope close tags on larger responses (each <response> block is intact).
export function extractResponses(text: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const blockRe = /<response>([\s\S]*?)<\/response>/g;
  const fieldRe = /<([A-Za-z_][\w.-]*)>([\s\S]*?)<\/\1>|<([A-Za-z_][\w.-]*)\s*\/>/g;
  let bm: RegExpExecArray | null;
  while ((bm = blockRe.exec(text)) !== null) {
    const rec: Record<string, string> = {};
    let fm: RegExpExecArray | null;
    fieldRe.lastIndex = 0;
    while ((fm = fieldRe.exec(bm[1])) !== null) {
      if (fm[3] !== undefined) rec[fm[3]] = "";
      else rec[fm[1]] = decodeEntities(fm[2]);
    }
    out.push(rec);
  }
  return out;
}

// Retries transient SDX faults (intermittent SOAP-ENV:Server "Error executing Web Service" under load).
export async function callSdx(
  endpointBase: string,
  auth: string,
  service: string,
  params: string[],
  opts: { company?: string; authId?: string; overrides?: Record<string, string> } = {},
  attempt = 1,
): Promise<Record<string, string>[]> {
  const endpoint = `${endpointBase}/${service}`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": endpoint,
        "Authorization": `Basic ${btoa(auth)}`,
      },
      body: envelope(service, params, opts),
    });
    const text = await res.text();
    if (!res.ok || text.includes(":Fault>")) {
      throw new Error(`SDX ${service} HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    return extractResponses(text);
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 400 * attempt));
      return callSdx(endpointBase, auth, service, params, opts, attempt + 1);
    }
    throw e;
  }
}

export const v = (x: unknown): string | null => {
  const t = x === undefined || x === null ? "" : String(x).trim();
  return t === "" ? null : t;
};

export function dt(x: unknown): string | null {
  const t = v(x);
  if (!t) return null;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
}

export async function pmap<T, R>(items: T[], limit: number, fn: (it: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  const worker = async () => {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
```

---

## T3 — Pure mapping module (Deno-global-free; vitest-testable) — SUPERSEDED (do NOT build)

> **SUPERSEDED (post-review remediation):** This task was a mistake. `mapping.ts` was DEAD CODE — `index.ts` never imported it; the Edge fn passes the full record array to `hr.sync_spectrum_people` and the SQL does all per-field work, so the "tested logic == shipped logic" claim below was FALSE. The TS module + its vitest file were deleted. The survivorship logic lives in SQL and is covered by pgTAP (T7a, rewritten). The code block below is kept only as a historical record; do NOT recreate it.

**File:** `supabase/functions/sdx-people-sync/mapping.ts` (NEW). No `Deno.*` at import time so vitest can import it directly. The Edge `index.ts` imports these, so tested logic == shipped logic.

```ts
// supabase/functions/sdx-people-sync/mapping.ts
// Pure people-sync logic (no Deno globals). Imported by index.ts AND by vitest (mapping.test.ts).

export type GetEmployeeRecord = Record<string, string>;

// Z-sentinels: ZRIO9999, ZEIS99999. Rule = starts with 'Z' AND contains '9999'.
// Correctly spares real Z* actives (ZAL576, ZUR647).
export function isZSentinel(employeeCode: string | null | undefined): boolean {
  if (!employeeCode) return false;
  const c = employeeCode.trim().toUpperCase();
  return c.startsWith("Z") && c.includes("9999");
}

// Spectrum Employment_Status -> hr.people.status (only Activo / Inactivo live). A -> Activo; C,S -> Inactivo.
export function mapSpectrumStatus(spectrumStatus: string | null | undefined): "Activo" | "Inactivo" {
  return (spectrumStatus ?? "").trim().toUpperCase() === "A" ? "Activo" : "Inactivo";
}

// True if the mapped Spectrum status differs from the local hr.people.status (drift -> flag).
export function computeStatusDrift(
  spectrumStatus: string | null | undefined,
  localStatus: string | null | undefined,
): boolean {
  return mapSpectrumStatus(spectrumStatus) !== (localStatus ?? null);
}

// Case-insensitive employee_code equality (mirrors upper(employee_code)=upper(code) in SQL).
export function employeeCodeMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toUpperCase() === b.trim().toUpperCase();
}

const norm = (x: string | null | undefined): string | null => {
  const t = (x ?? "").trim();
  return t === "" ? null : t;
};

// The 7 classification args (order matches hr.apply_spectrum_classification after p_person_id).
export interface ClassificationArgs {
  department_code: string | null;
  occupation: string | null;
  cost_center: string | null;
  union_code: string | null;
  wage_class: string | null;
  worker_comp_code: string | null;
  trade: string | null;
}

export function buildClassificationArgs(rec: GetEmployeeRecord): ClassificationArgs {
  return {
    department_code: norm(rec.Department_Code),
    occupation: norm(rec.Occupation),
    cost_center: norm(rec.Cost_Center),
    union_code: norm(rec.Union_Code),
    wage_class: norm(rec.Wage_Class),
    worker_comp_code: norm(rec.Worker_Comp_Code),
    trade: norm(rec.Trade),
  };
}
```

> The SQL fn (T1) is the source of truth for survivorship and re-normalizes each field server-side. The Edge fn passes the FULL record array to the RPC and the SQL does ALL the per-field work — so there is no TS surface that participates in survivorship. (An earlier draft's `mapping.ts` "mirror" was therefore dead code and was removed post-review; the SQL is tested directly by pgTAP, T7a.)

---

## T4 — Edge function `sdx-people-sync/index.ts`

**File:** `supabase/functions/sdx-people-sync/index.ts` (NEW). Default client schema `core` (so `land_sdx`/`sync_runs` are bare); `hr.sync_spectrum_people` via `.schema('hr').rpc(...)`. Params ground-corrected.

```ts
// supabase/functions/sdx-people-sync/index.ts
// sdx-people-sync v2 (PEOPLE): pull Spectrum GetEmployee -> land raw_spectrum.sdx_landing ->
// hr.sync_spectrum_people (survivorship: crosswalk + classification SCD-2 + FLAG drift). FLAG-ONLY:
// never writes hr.people identity, never auto-changes status, never creates people. ADR-0032 + ADR-0034.
//
// SDX auth: HTTP Basic (SDX_AUTH="ICN:API") + empty <GUID> (validated working 2026-06-05; intended
//   vendor auth UNCONFIRMED -> cron stays OFF in vercel.ts).
// Secrets REQUIRED: SDX_ENDPOINT (e.g. https://iconsanet.dexterchaney.com:8482/ws), SDX_AUTH ("ICN:API").
// Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// raw_spectrum NOT exposed -> land via core.land_sdx (SECURITY DEFINER RPC). hr called via .schema('hr').
import { createClient } from "npm:@supabase/supabase-js@2";
import { callSdx } from "../_shared/sdx.ts";

const SDX_ENDPOINT = (Deno.env.get("SDX_ENDPOINT") ?? "").replace(/\/$/, "");
const SDX_AUTH = Deno.env.get("SDX_AUTH") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// GetEmployee param sequence (ground-verified vs WSDL + live 200; the frozen brief's list was WRONG).
// Authorization_ID + GUID precede these (handled by envelope()). pCompany_Code=ICN; rest empty.
const GETEMPLOYEE_PARAMS = [
  "pCompany_Code",
  "pWage_Class",
  "pUnion_Code",
  "pOccupation",
  "pTrade",
  "pStatus_Type",
  "pCost_Center",
  "pSort_By",
];

// Default schema 'core' so land_sdx + sync_runs are bare; hr via explicit .schema('hr').
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: "core" },
});

Deno.serve(async (_req) => {
  if (!SDX_ENDPOINT || !SDX_AUTH) return json({ error: "Missing SDX_ENDPOINT / SDX_AUTH secrets" }, 500);
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "Missing Supabase env" }, 500);

  const batchId = crypto.randomUUID();

  // Open the run record (status running).
  const { data: run } = await supabase
    .from("sync_runs")
    .insert({
      source_system: "spectrum",
      service: "people",
      entity: "hr.person_sources+classifications",
      batch_id: batchId,
      status: "running",
    })
    .select("id")
    .single();
  const runId = run?.id ?? null;

  try {
    // 1. Pull GetEmployee (regex-tolerant parse, retry x3).
    const records = await callSdx(SDX_ENDPOINT, SDX_AUTH, "GetEmployee", GETEMPLOYEE_PARAMS);

    // 2. Land raw verbatim (BRONZE), chunked by 500 like v1.
    for (let i = 0; i < records.length; i += 500) {
      const { error } = await supabase.rpc("land_sdx", {
        p_batch_id: batchId,
        p_service: "GetEmployee",
        p_job_filter: null,
        p_records: records.slice(i, i + 500),
      });
      if (error) throw new Error(`land GetEmployee: ${error.message}`);
    }

    // 3. Survivorship (hr schema, explicit override).
    const { data: result, error: rpcErr } = await supabase
      .schema("hr")
      .rpc("sync_spectrum_people", { p_records: records, p_batch_id: batchId });
    if (rpcErr) throw new Error(`sync_spectrum_people: ${rpcErr.message}`);

    const r = (result ?? {}) as {
      matched?: number; enriched?: number; flagged?: number; skipped?: number;
      flags?: unknown[]; skipped_codes?: unknown[];
    };
    const matched = r.matched ?? 0;
    const enriched = r.enriched ?? 0;
    const flagged = r.flagged ?? 0;

    // 4. Close the run record.
    if (runId) {
      await supabase.from("sync_runs").update({
        status: "success",
        finished_at: new Date().toISOString(),
        rows_read: records.length,
        rows_upserted: matched + enriched,
        rows_flagged: flagged,
        details: r,
      }).eq("id", runId);
    }

    return json({ ok: true, batch_id: batchId, rows_read: records.length, result: r }, 200);
  } catch (e) {
    const msg = (e as Error).message;
    if (runId) {
      await supabase.from("sync_runs").update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error: msg.slice(0, 2000),
      }).eq("id", runId);
    }
    return json({ ok: false, batch_id: batchId, error: msg }, 500);
  }
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
```

> Deploy via `mcp__supabase__deploy_edge_function` (name `sdx-people-sync`), bundling both `index.ts` and the imported `../_shared/sdx.ts`. **Live cold-start run VERIFIED 2026-06-05 (batch `4965244f`):** `sync_runs` people = `success`, matched 176, rows_upserted 352 (176 crosswalk + 176 enrich), rows_flagged 12, skipped 2 (Z-sentinels). rows_read 184, enriched 176.

---

## T5 — Cron route (gate mirror; relays to Edge)

**File:** `src/app/api/cron/sdx-people-sync/route.ts` (NEW). Auth gate copied verbatim from `process-notifications/route.ts`.

```ts
// src/app/api/cron/sdx-people-sync/route.ts
// Vercel Cron worker for Spectrum people sync (v2). Auth gate mirrors process-notifications.
// Relays to the Edge function sdx-people-sync (service_role). The cron is DISABLED in vercel.ts
// until the SDX vendor (Dexter+Chaney / iconsanet) confirms the intended auth model; this route is
// reachable for manual/authorized invocation in the meantime.
//
// ADR-0006 exception: server-only worker, no user session (uses SERVICE_ROLE to invoke the Edge fn).

import { NextResponse } from 'next/server';
import { SUPABASE_URL } from '@/lib/supabase/env';

export async function GET(request: Request) {
  // CRON_SECRET fail-closed: an unset secret would make `Bearer undefined` trivially replicable.
  if (!process.env.CRON_SECRET) {
    console.error('[cron] CRON_SECRET env var no esta seteada — abort');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!isVercelCron && authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error('[cron] SUPABASE_SERVICE_ROLE_KEY missing — cannot invoke edge fn');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/sdx-people-sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json({ invoked: true, edge_status: res.status, edge_body: body }, { status: res.ok ? 200 : 502 });
}
```

> `SUPABASE_URL` is imported from `@/lib/supabase/env` (the same module `admin.ts` uses). The Edge fn `sdx-people-sync` deploys with `verify_jwt`; the service-role bearer satisfies it.

---

## T6 — `vercel.ts` cron entry (COMMENTED OUT)

**File:** `vercel.ts` (EDIT). Add the people-sync cron entry disabled, keeping `process-notifications` active.

Replace:

```ts
  crons: [
    {
      path: '/api/cron/process-notifications',
      schedule: '*/5 * * * *',
    },
  ],
```

with:

```ts
  crons: [
    {
      path: '/api/cron/process-notifications',
      schedule: '*/5 * * * *',
    },
    // DISABLED until the SDX vendor (Dexter+Chaney / iconsanet) confirms the intended auth model.
    // Empty <GUID> works today (validated 2026-06-05) but the intended auth is unconfirmed, so the
    // nightly people sync stays OFF. Uncomment to enable once vendor auth is signed off. ADR-0032 + ADR-0034.
    // {
    //   path: '/api/cron/sdx-people-sync',
    //   schedule: '0 6 * * *', // 06:00 UTC nightly (~01:00 Panama)
    // },
  ],
```

---

## T7 — Tests

### T7a — `supabase/functions/sdx-people-sync/mapping.test.ts` (NEW) — SUPERSEDED (do NOT build)

> **SUPERSEDED (post-review remediation):** This vitest file tested `mapping.ts`, which was dead code (test-theater — it asserted a reimplementation that never shipped). Both files were deleted. The SQL survivorship fns are now covered by real pgTAP in `supabase/tests/database/089_people_sync_v2.test.sql` (runs via `supabase test db`; not yet wired into the `npm run verify` gate — TF-FOUNDATION). The code block below is a historical record only; do NOT recreate it.

```ts
// supabase/functions/sdx-people-sync/mapping.test.ts
import { describe, it, expect } from 'vitest';
import {
  isZSentinel,
  mapSpectrumStatus,
  computeStatusDrift,
  employeeCodeMatch,
  buildClassificationArgs,
} from './mapping';

describe('isZSentinel', () => {
  it('skips the two real sentinels', () => {
    expect(isZSentinel('ZRIO9999')).toBe(true);
    expect(isZSentinel('ZEIS99999')).toBe(true);
  });
  it('does NOT skip real Z* actives', () => {
    expect(isZSentinel('ZAL576')).toBe(false);
    expect(isZSentinel('ZUR647')).toBe(false);
  });
  it('is case-insensitive and trims', () => {
    expect(isZSentinel('  zrio9999 ')).toBe(true);
  });
  it('handles null/empty', () => {
    expect(isZSentinel(null)).toBe(false);
    expect(isZSentinel('')).toBe(false);
  });
});

describe('mapSpectrumStatus', () => {
  it('A -> Activo', () => expect(mapSpectrumStatus('A')).toBe('Activo'));
  it('C -> Inactivo', () => expect(mapSpectrumStatus('C')).toBe('Inactivo'));
  it('S -> Inactivo', () => expect(mapSpectrumStatus('S')).toBe('Inactivo'));
  it('lowercase a -> Activo', () => expect(mapSpectrumStatus('a')).toBe('Activo'));
  it('empty -> Inactivo', () => expect(mapSpectrumStatus('')).toBe('Inactivo'));
});

describe('computeStatusDrift', () => {
  it('no drift when A maps to local Activo', () => {
    expect(computeStatusDrift('A', 'Activo')).toBe(false);
  });
  it('drift when Spectrum C but local Activo', () => {
    expect(computeStatusDrift('C', 'Activo')).toBe(true);
  });
  it('drift when Spectrum A but local Inactivo', () => {
    expect(computeStatusDrift('A', 'Inactivo')).toBe(true);
  });
  it('no drift when S maps to local Inactivo', () => {
    expect(computeStatusDrift('S', 'Inactivo')).toBe(false);
  });
});

describe('employeeCodeMatch', () => {
  it('matches case-insensitively', () => {
    expect(employeeCodeMatch('cuc166', 'CUC166')).toBe(true);
  });
  it('matches with surrounding whitespace', () => {
    expect(employeeCodeMatch(' AVE701 ', 'ave701')).toBe(true);
  });
  it('does not match different codes', () => {
    expect(employeeCodeMatch('AVE701', 'BA323')).toBe(false);
  });
  it('null is never a match (flag-not-create path: unmatched stays unmatched)', () => {
    expect(employeeCodeMatch(null, 'AVE701')).toBe(false);
    expect(employeeCodeMatch('AVE701', undefined)).toBe(false);
  });
});

describe('buildClassificationArgs', () => {
  it('maps the 7 Spectrum fields and normalizes empties to null', () => {
    const rec = {
      Department_Code: 'DIRECT',
      Occupation: 'Soldador',
      Cost_Center: 'MAR',
      Union_Code: '',
      Wage_Class: '  ',
      Worker_Comp_Code: 'INDIR',
      Trade: 'Calificado',
      Employee_Code: 'CUC166',
    };
    expect(buildClassificationArgs(rec)).toEqual({
      department_code: 'DIRECT',
      occupation: 'Soldador',
      cost_center: 'MAR',
      union_code: null,
      wage_class: null,
      worker_comp_code: 'INDIR',
      trade: 'Calificado',
    });
  });
});
```

> Vitest config: SUPERSEDED. This note covered wiring `mapping.test.ts` (under `supabase/functions/**`) into the vitest `include`. That file was deleted (dead code), so no vitest `include` change is needed — the only vitest file for this feature, `route.test.ts`, already lives under `src/**` and is picked up. The SQL fns are covered by pgTAP (`supabase/tests/database/089_people_sync_v2.test.sql`, run via `supabase test db`), which is NOT wired into `npm run verify` yet (TF-FOUNDATION).

### T7b — `src/app/api/cron/sdx-people-sync/route.test.ts` (NEW)

```ts
// src/app/api/cron/sdx-people-sync/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase/env', () => ({ SUPABASE_URL: 'https://test.supabase.co' }));

import { GET } from './route';

function makeReq(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3001/api/cron/sdx-people-sync', { headers });
}

describe('GET /api/cron/sdx-people-sync — auth gate', () => {
  const OLD = { ...process.env };
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.CRON_SECRET = 'secret123';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc-key';
  });
  afterEach(() => {
    process.env = { ...OLD };
  });

  it('500 when CRON_SECRET is unset (fail-closed)', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it('401 without secret or vercel-cron header', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('401 with a wrong bearer', async () => {
    const res = await GET(makeReq({ authorization: 'Bearer nope' }));
    expect(res.status).toBe(401);
  });

  it('200 with x-vercel-cron:1 (relays to edge fn)', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const res = await GET(makeReq({ 'x-vercel-cron': '1' }));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.supabase.co/functions/v1/sdx-people-sync',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('200 with a correct Bearer CRON_SECRET', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const res = await GET(makeReq({ authorization: 'Bearer secret123' }));
    expect(res.status).toBe(200);
  });
});
```

---

## T8 — Regenerate `database.types.ts`

Run `supabase gen types typescript --linked` (multi-schema) so `hr.employment_classifications` + the 2 new fns appear. Commit the regenerated `src/lib/supabase/database.types.ts` in the SAME commit (TYPES-STALE gate). This file is git-tracked and eslint-ignored.

---

## T9 — Docs: CHANGELOG + STATUS

**`docs/CHANGELOG.md`** — add under the active `### Core MDM foundation (SP-0b / ADR-0032)` section:

```markdown
- `[bd] 089_hr_employment_classifications_and_spectrum_people_sync` (F0.x, ADR-0032 + ADR-0034) — people sync v2 (survivorship): NEW `hr.employment_classifications` (SCD-2 sidecar del eje payroll/labor de Spectrum, SEPARADO de hr.employments; UNIQUE parcial 1-vigente-por-persona; RLS espeja hr.employments; COMMENT en tabla+toda columna; trigger touch_updated_at; grants authenticated SELECT / service_role DML) + 2 funciones SECURITY DEFINER search_path='' EXECUTE service_role-only: `hr.apply_spectrum_classification` (SCD-2, is_current explicito, audita transicion con schema_name/table_name) + `hr.sync_spectrum_people` (crosswalk hr.person_sources + enriquecimiento + FLAG status_drift/new_active_unmatched; FLAG-ONLY: nunca escribe identidad/status, nunca crea personas). RLS validada + advisors limpios. Helpers reutilizados (no redefinidos).
- `[edge]` **Edge `sdx-people-sync` v2 (people)** — pull GetEmployee (params ground-corregidos: pCompany_Code/pWage_Class/pUnion_Code/pOccupation/pTrade/pStatus_Type/pCost_Center/pSort_By; GUID vacio) → land raw_spectrum.sdx_landing (core.land_sdx RPC) → hr.sync_spectrum_people → log core.sync_runs. Helpers SOAP extraidos a `supabase/functions/_shared/sdx.ts` (v1 `sdx-sync` SIN tocar). La logica de survivorship vive en SQL (`hr.sync_spectrum_people`); el Edge solo orquesta. **Cold-start VERIFICADA 2026-06-05 (batch `4965244f`):** 184 read, 176 matched/enriched, 2 Z-skipped, 12 flagged; sync_run `success`.
- `[code]` **Cron route `src/app/api/cron/sdx-people-sync/route.ts`** (gate CRON_SECRET/x-vercel-cron, relay al Edge con service_role) + entry en `vercel.ts` **COMENTADO/DESHABILITADO** (cron OFF hasta confirmar auth del vendor SDX). `process-notifications` sigue activo.
- `[test]` `src/app/api/cron/sdx-people-sync/route.test.ts` (gate 500/401/200, vitest) + `supabase/tests/database/089_people_sync_v2.test.sql` (pgTAP de las SCD-2 fns `hr.apply_spectrum_classification` + `hr.sync_spectrum_people`; corre via `supabase test db`, AUN no cableado al gate `npm run verify` — TF-FOUNDATION cablea pgTAP). La survivorship vive en SQL, asi que la cubrimos en SQL (no hay reimplementacion TS).
- `[types]` `database.types.ts` regenerado (incluye `hr.employment_classifications` + 2 fns).
```

**`docs/STATUS.md` §6** — update `CORE-MDM` status note: append "**People sync v2 (089 + Edge sdx-people-sync + cron gated OFF) DONE** — survivorship FLAG-ONLY: crosswalk + classification SCD-2 + drift flags. **Cold-start VERIFIED 2026-06-05 (batch `4965244f`):** 184 read, 176 matched/enriched, 2 Z-skipped, 12 flagged (6 new_active_unmatched + 6 status_drift); sync_run `success`, rows_upserted 352. Falta: F0.3 baseline regen + cron go-live (vendor auth)." Re-defer DB-VISION-B retrofit + AUDIT2B-BASELINE per spec §12 (reasons recorded there).

---

## Self-review checklist (run before claiming done)

- [ ] **Spec coverage:** sidecar table ✓, 2 fns ✓, `_shared/sdx.ts` ✓, Edge `index.ts` ✓, ~~`mapping.ts`~~ removed (dead code, post-review) ✓, cron route ✓, `vercel.ts` disabled entry ✓, tests (`route.test.ts` vitest + `089_people_sync_v2.test.sql` pgTAP) ✓, types regen ✓, CHANGELOG/STATUS ✓. Backlog-gate matches resolved/re-deferred (§12) ✓.
- [ ] **Placeholder scan:** grep the new files for `TODO`, `FIXME`, `<...>`, `placeholder`, `xxx`, `???` — must be zero. All code is final (no sketches).
- [ ] **Type consistency:** Edge client default schema `core` (land_sdx/sync_runs bare) + `.schema('hr').rpc('sync_spectrum_people', ...)`; `onConflict` target `(source_system, external_id)` matches the existing UNIQUE index; `audit.log` INSERT sets the 3 NOT-NULL cols (`schema_name`, `table_name`, `source_system`); fn signatures match the Edge/RPC call args (9-arg classification, 2-arg sync); `RETURNS jsonb`/`RETURNS uuid` match callers.
- [ ] **R1-R27:** writes only to `hr.*` (allowed; no `public.*`/`humanos.*`/`payroll.*`); `auth.users` untouched (R22 n/a); SOP/chain n/a (no approval logic); no time estimates (R8); R27 untouched (no consent/medical write — classification axis is non-PII). FLAG-ONLY honored: no `hr.people` identity/status write.
- [ ] **RLS:** new table `ENABLE ROW LEVEL SECURITY` + 4 policies mirroring `hr.employments` (one per command); run `iconsa-rls-validation` (expect coverage PASS) + `get_advisors` (expect no `rls_disabled`/`rls_enabled_no_policy` for the new table).
- [ ] **COMMENT:** `COMMENT ON TABLE` + `COMMENT ON COLUMN` for ALL 18 columns + `COMMENT ON FUNCTION` on both fns.
- [ ] **No voseo:** all Spanish comments/strings use tú/Panamá forms (no vos/tenés/podés). `npm run lint` anti-voseo guard green.
- [ ] **No hardcoded UUID:** none present (all ids `gen_random_uuid()` / resolved at runtime).
- [ ] **`search_path = ''`:** both SECURITY DEFINER fns set it; all object refs schema-qualified (`hr.*`, `audit.log`).
- [ ] **EXECUTE least-privilege:** both fns REVOKE from public/anon/authenticated + GRANT to `service_role` only (mig 077/088 idiom).
- [ ] **Gate:** `npm run verify` (typecheck + lint + vitest + docs:check + build) green; vitest picks up the new `route.test.ts`; pgTAP (`089_people_sync_v2.test.sql`) runs separately via `supabase test db` (not in the gate yet — TF-FOUNDATION); v1 `sdx-sync/index.ts` byte-identical (unchanged).
- [ ] **Promise:** redeem `<promise>PLAN_COMPLETE</promise>` only when migration applied + Edge deployed + the REAL cold-start `sync_runs` numbers recorded (no invented targets) + gate green + RLS validated + docs in the same commit.
```

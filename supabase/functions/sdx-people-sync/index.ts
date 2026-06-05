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

  // Open the run record (status running). Graceful degradation: if the insert fails, log it and
  // keep going with runId=null (the sync still runs; only the audit row is missing). Do NOT throw.
  const { data: run, error: runErr } = await supabase
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
  if (runErr) console.error(`sync_runs insert failed (runId stays null): ${runErr.message}`);
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

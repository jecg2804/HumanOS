// supabase/functions/sdx-sync/index.ts
// sdx-sync v1 (MASTERS): pull Spectrum SDX -> land raw_spectrum.sdx_landing -> upsert core masters.
// People sync (hr.person_sources + hr.employments survivorship) = v2 (ADR-0032 / SP-0b).
//
// SDX auth: HTTP Basic (SDX_AUTH = "ICN:API") + empty <GUID> (validated working 2026-06-05;
//   a consumed GUID returns 1 empty row, an arbitrary GUID returns 0 -> looks like a session/dedup
//   token. Empty works reliably; confirm intended auth with the Dexter+Chaney/iconsanet vendor).
// Secrets REQUIRED: SDX_ENDPOINT (e.g. https://iconsanet.dexterchaney.com:8482/ws), SDX_AUTH ("ICN:API").
// Auto-injected by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// raw_spectrum is NOT exposed in PostgREST -> landing goes through core.land_sdx (SECURITY DEFINER RPC).
import { createClient } from "npm:@supabase/supabase-js@2";

const SDX_ENDPOINT = (Deno.env.get("SDX_ENDPOINT") ?? "").replace(/\/$/, "");
const SDX_AUTH = Deno.env.get("SDX_AUTH") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const COMPANY = "ICN";
const AUTH_ID = "API";

// Every declared param must be present in the envelope (SDX faults otherwise). pCompany_Code=ICN; rest empty.
const PARAMS: Record<string, string[]> = {
  GetCustomers: ["pCompany_Code", "pStatus"],
  GetEqCostCategory: ["pCompany_Code", "pCost_Category_Type", "pStatus", "pCost_Center", "pSort_By"],
  GetWageCode: ["pCompany_Code", "pWage_Code", "pUnion_Code", "pJob_Number", "pPhase_Code", "pCost_Type", "pSort_By"],
  GetPayType: ["pCompany_Code", "pPay_Type", "pSort_By"],
  GetDedAddon: ["pCompany_Code", "pVol_Deduct_Code", "pDeduct_Type", "pCost_Center", "pSort_By"],
  GetEquipment: ["pCompany_Code", "pEquipment_Type", "pEquipment_Make", "pEquipment_Model", "pYear", "pStatus_Code", "pCost_Center", "pSort_By"],
  GetJob: ["pCompany_Code", "pDivision", "pStatus_Code", "pProject_Manager", "pSuperintendent", "pEstimator", "pCustomer_Code", "pCost_Center", "pSort_By"],
  GetJobDates: ["pCompany_Code", "pDivision", "pStatus_Code", "pProject_Manager", "pSuperintendent", "pEstimator", "pCustomer_Code", "pCost_Center", "pSort_By"],
  GetJobUDF: ["pCompany_Code", "pDivision", "pStatus_Code", "pProject_Manager", "pSuperintendent", "pEstimator", "pCustomer_Code", "pCost_Center"],
  GetPhaseEnhanced: ["pCompany_Code", "pCost_Type", "pJob_Number", "pStatus_Code", "pCost_Center", "pSort_By"],
};

function envelope(service: string, overrides: Record<string, string> = {}): string {
  const fields = PARAMS[service].map((p) => {
    const val = p === "pCompany_Code" ? COMPANY : (overrides[p] ?? "");
    return `      <${p}>${val}</${p}>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${service} xmlns="http://www.northgate-is.com/proiv/webservices/types">
      <Authorization_ID>${AUTH_ID}</Authorization_ID>
      <GUID></GUID>
${fields}
    </${service}>
  </soap:Body>
</soap:Envelope>`;
}

function decodeEntities(s: string): string {
  // XML decode in a single conceptual pass (&amp; LAST so &amp;lt; does not become <).
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");
}

// Extract each <response>...</response> record from the RAW SOAP text via regex, parsing its flat
// fields. This is tolerant of the SDX server's habit of truncating the trailing envelope close tags
// on larger responses (GetEquipment/GetJob/GetJobDates) -- all records are intact, only the tail is
// cut, so a strict XML parser would reject the whole document. Each <response> block is complete.
function extractResponses(text: string): Record<string, any>[] {
  const out: Record<string, any>[] = [];
  const blockRe = /<response>([\s\S]*?)<\/response>/g;
  const fieldRe = /<([A-Za-z_][\w.-]*)>([\s\S]*?)<\/\1>|<([A-Za-z_][\w.-]*)\s*\/>/g;
  let bm: RegExpExecArray | null;
  while ((bm = blockRe.exec(text)) !== null) {
    const rec: Record<string, any> = {};
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

// Retries transient SDX faults/errors (the server intermittently returns a SOAP-ENV:Server
// "Error executing Web Service" fault under sustained concurrent load). Up to 3 attempts.
async function callSdx(service: string, overrides: Record<string, string> = {}, attempt = 1): Promise<Record<string, any>[]> {
  const endpoint = `${SDX_ENDPOINT}/${service}`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": endpoint,
        "Authorization": `Basic ${btoa(SDX_AUTH)}`,
      },
      body: envelope(service, overrides),
    });
    const text = await res.text();
    if (!res.ok || text.includes(":Fault>")) {
      throw new Error(`SDX ${service} HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    return extractResponses(text);
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 400 * attempt));
      return callSdx(service, overrides, attempt + 1);
    }
    throw e;
  }
}

const v = (x: any): string | null => {
  const t = x === undefined || x === null ? "" : String(x).trim();
  return t === "" ? null : t;
};
function dt(x: any): string | null {
  const t = v(x);
  if (!t) return null;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
}
function parseJob(jn: string): { obra_code: string; extra_code: string | null; is_extra: boolean } {
  const m = jn.match(/^(\d+-\d+)(E\d+)$/);
  return m ? { obra_code: m[1], extra_code: m[2], is_extra: true } : { obra_code: jn, extra_code: null, is_extra: false };
}
function udf(rec: Record<string, any>): Record<string, string> | null {
  const o: Record<string, string> = {};
  for (let i = 1; i <= 20; i++) {
    const x = v(rec[`UDF${i}`]);
    if (x) o[`UDF${i}`] = x;
  }
  return Object.keys(o).length ? o : null;
}
async function pmap<T, R>(items: T[], limit: number, fn: (it: T) => Promise<R>): Promise<R[]> {
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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
  db: { schema: "core" },
});

Deno.serve(async (_req) => {
  if (!SDX_ENDPOINT || !SDX_AUTH) return json({ error: "Missing SDX_ENDPOINT / SDX_AUTH secrets" }, 500);
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "Missing Supabase env" }, 500);

  const batchId = crypto.randomUUID();
  const summary: Record<string, any> = {};
  const errors: string[] = [];
  let totalRead = 0;
  let totalUpserted = 0;

  const { data: run } = await supabase
    .from("sync_runs")
    .insert({ source_system: "spectrum", service: "masters", entity: "core.*", batch_id: batchId, status: "running" })
    .select("id")
    .single();
  const runId = run?.id ?? null;

  const land = async (service: string, records: any[], jobFilter: string | null = null) => {
    for (let i = 0; i < records.length; i += 500) {
      const { error } = await supabase.rpc("land_sdx", {
        p_batch_id: batchId,
        p_service: service,
        p_job_filter: jobFilter,
        p_records: records.slice(i, i + 500),
      });
      if (error) throw new Error(`land ${service}: ${error.message}`);
    }
  };
  const upsert = async (table: string, rows: any[], onConflict: string) => {
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from(table).upsert(rows.slice(i, i + 500), { onConflict, ignoreDuplicates: false });
      if (error) throw new Error(`upsert ${table}: ${error.message}`);
    }
    return rows.length;
  };
  const master = async (name: string, fn: () => Promise<{ read: number; upserted: number }>) => {
    try {
      const r = await fn();
      summary[name] = r;
      totalRead += r.read;
      totalUpserted += r.upserted;
    } catch (e) {
      const m = (e as Error).message;
      summary[name] = { error: m };
      errors.push(`${name}: ${m}`);
    }
  };

  await master("customers", async () => {
    const recs = await callSdx("GetCustomers");
    await land("GetCustomers", recs);
    const rows = recs.filter((r) => v(r.Customer_Code)).map((r) => ({
      customer_code: v(r.Customer_Code), name: v(r.Name) ?? v(r.Customer_Code), address_1: v(r.Address_1), address_2: v(r.Address_2),
      city: v(r.City), state: v(r.State), zip_code: v(r.Zip_Code), first_name: v(r.First_Name), last_name: v(r.Last_Name),
      phone_number: v(r.Phone_Number), email: v(r.Email1), price_level_material: v(r.Price_Level_Material), taxable_flag: v(r.Taxable_Flag),
      status: v(r.Status), source_system: "spectrum", deleted_at: null,
    }));
    return { read: recs.length, upserted: await upsert("customers", rows, "customer_code") };
  });

  await master("eq_cost_categories", async () => {
    const recs = await callSdx("GetEqCostCategory");
    await land("GetEqCostCategory", recs);
    const rows = recs.filter((r) => v(r.Cost_Category_Code)).map((r) => ({
      cost_category_code: v(r.Cost_Category_Code), description: v(r.Cost_Category_Description), cost_category_type: v(r.Cost_Category_Type),
      status: v(r.Status), cost_center: v(r.Cost_Center), source_system: "spectrum", deleted_at: null,
    }));
    return { read: recs.length, upserted: await upsert("eq_cost_categories", rows, "cost_category_code") };
  });

  await master("wage_codes", async () => {
    const recs = await callSdx("GetWageCode");
    await land("GetWageCode", recs);
    const rows = recs.filter((r) => v(r.Wage_Code)).map((r) => ({
      wage_code: v(r.Wage_Code), union_code: v(r.Union_Code), short_description: v(r.Short_Description), full_description: v(r.Full_Description),
      worker_comp_code: v(r.Worker_Comp_Code), effective_date: dt(r.Effective_Date), source_system: "spectrum", deleted_at: null,
    }));
    return { read: recs.length, upserted: await upsert("wage_codes", rows, "wage_code") };
  });

  await master("pay_types", async () => {
    const recs = await callSdx("GetPayType");
    await land("GetPayType", recs);
    const rows = recs.filter((r) => v(r.Pay_Type)).map((r) => ({
      pay_type: v(r.Pay_Type), description: v(r.Pay_Type_Desc), source_system: "spectrum", deleted_at: null,
    }));
    return { read: recs.length, upserted: await upsert("pay_types", rows, "pay_type") };
  });

  await master("deductions_addons", async () => {
    const recs = await callSdx("GetDedAddon");
    await land("GetDedAddon", recs);
    const rows = recs.filter((r) => v(r.Vol_Deduct_Code)).map((r) => ({
      vol_deduct_code: v(r.Vol_Deduct_Code), description: v(r.Vol_Deduct_Description), deduct_type: v(r.Deduct_Type),
      calc_method: v(r.Calc_Method), source_system: "spectrum", deleted_at: null,
    }));
    return { read: recs.length, upserted: await upsert("deductions_addons", rows, "vol_deduct_code") };
  });

  await master("equipment", async () => {
    const recs = await callSdx("GetEquipment");
    await land("GetEquipment", recs);
    const rows = recs.filter((r) => v(r.Equipment_Code)).map((r) => ({
      equipment_code: v(r.Equipment_Code), equipment_type: v(r.Equipment_Type), description: v(r.Description), equipment_status: v(r.Equipment_Status),
      equipment_year: v(r.Year), equipment_make: v(r.Equipment_Make), equipment_model: v(r.Equipment_Model), owned_flag: v(r.Owned_Flag),
      license_number: v(r.License_Number), serial_number: v(r.Serial_Number), division_code: v(r.Division_Code), cost_center: v(r.Cost_Center),
      source_system: "spectrum", deleted_at: null,
    }));
    return { read: recs.length, upserted: await upsert("equipment", rows, "equipment_code") };
  });

  await master("jobs", async () => {
    const [jobRecs, dateRecs, udfRecs] = await Promise.all([callSdx("GetJob"), callSdx("GetJobDates"), callSdx("GetJobUDF")]);
    await land("GetJob", jobRecs);
    await land("GetJobDates", dateRecs);
    await land("GetJobUDF", udfRecs);
    const dByJob = new Map(dateRecs.map((r) => [v(r.Job_Number), r]));
    const uByJob = new Map(udfRecs.map((r) => [v(r.Job_Number), r]));
    const { data: custs } = await supabase.from("customers").select("id, customer_code");
    const custMap = new Map((custs ?? []).map((c: any) => [c.customer_code, c.id]));
    const rows = jobRecs.filter((r) => v(r.Job_Number)).map((r) => {
      const jn = v(r.Job_Number)!;
      const pj = parseJob(jn);
      const d: any = dByJob.get(jn) ?? {};
      const u: any = uByJob.get(jn);
      const cc = v(r.Customer_Code);
      return {
        job_number: jn, obra_code: pj.obra_code, extra_code: pj.extra_code, is_extra: pj.is_extra, parent_job_id: null,
        job_description: v(r.Job_Description), customer_id: cc ? custMap.get(cc) ?? null : null, customer_code: cc,
        status_code: v(r.Status_Code), cost_center: v(r.Cost_Center), division: v(r.Division), address_1: v(r.Address_1), address_2: v(r.Address_2),
        city: v(r.City), state: v(r.State), zip_code: v(r.Zip_Code), certified_flag: v(r.Certified_Flag), work_state_tax_code: v(r.Work_State_Tax_Code),
        contract_number: v(r.Contract_Number), project_manager_code: v(r.Project_Manager), superintendent_code: v(r.Superintendent), estimator_code: v(r.Estimator),
        create_date: dt(d.Create_Date), est_start_date: dt(d.Est_Start_Date), est_complete_date: dt(d.Est_Complete_Date),
        projected_complete_date: dt(d.Projected_Complete_Date), start_date: dt(d.Start_Date), complete_date: dt(d.Complete_Date),
        udf: u ? udf(u) : null, source_system: "spectrum", deleted_at: null,
      };
    });
    const up = await upsert("jobs", rows, "job_number");
    // Resolve parent_job_id for extras (grouped by obra; orphans whose base is absent stay NULL).
    const { data: allJobs } = await supabase.from("jobs").select("id, job_number, obra_code, is_extra");
    const baseByObra = new Map((allJobs ?? []).filter((j: any) => !j.is_extra).map((j: any) => [j.obra_code, j.id]));
    const obrasWithExtras = [...new Set((allJobs ?? []).filter((j: any) => j.is_extra).map((j: any) => j.obra_code))];
    let orphans = 0;
    for (const obra of obrasWithExtras) {
      const baseId = baseByObra.get(obra);
      if (!baseId) { orphans++; continue; }
      const { error } = await supabase.from("jobs").update({ parent_job_id: baseId }).eq("obra_code", obra).eq("is_extra", true);
      if (error) throw new Error(`jobs parent ${obra}: ${error.message}`);
    }
    summary._jobs_orphan_obras = orphans;
    return { read: jobRecs.length, upserted: up };
  });

  await master("phases", async () => {
    const { data: jobs } = await supabase.from("jobs").select("id, job_number");
    let read = 0;
    let up = 0;
    const failed: string[] = [];
    const res = await pmap(jobs ?? [], 3, async (job: any) => {
      try {
        const recs = await callSdx("GetPhaseEnhanced", { pJob_Number: job.job_number });
        await land("GetPhaseEnhanced", recs, job.job_number);
        const byCode = new Map<string, any>(); // dedup to (job, phase_code); structural fields constant per phase_code
        for (const r of recs) {
          const pc = v(r.Phase_Code);
          if (pc && !byCode.has(pc)) byCode.set(pc, r);
        }
        const rows = [...byCode.values()].map((r) => ({
          job_id: job.id, phase_code: v(r.Phase_Code), description: v(r.Description), status_code: v(r.Status_Code),
          unit_of_measure: v(r.Unit_of_Measure), cost_center: v(r.Cost_Center), price_method_code: v(r.Price_Method_Code),
          start_date: dt(r.Start_Date), end_date: dt(r.End_Date), complete_date: dt(r.Complete_Date), comment: v(r.Comment),
          source_system: "spectrum", deleted_at: null,
        }));
        const n = await upsert("phases", rows, "job_id,phase_code");
        return { read: recs.length, up: n };
      } catch (e) {
        failed.push(`${job.job_number}: ${(e as Error).message.slice(0, 80)}`);
        return { read: 0, up: 0 };
      }
    });
    for (const r of res) {
      read += r.read;
      up += r.up;
    }
    if (failed.length) summary._phases_failed_jobs = failed;
    return { read, upserted: up };
  });

  const status = errors.length ? (totalUpserted > 0 ? "partial" : "failed") : "success";
  if (runId) {
    await supabase.from("sync_runs").update({
      status, finished_at: new Date().toISOString(), rows_read: totalRead, rows_upserted: totalUpserted, rows_flagged: 0,
      error: errors.length ? errors.join(" | ").slice(0, 2000) : null, details: summary,
    }).eq("id", runId);
  }
  return json({ ok: errors.length === 0, batch_id: batchId, status, totalRead, totalUpserted, errors, summary }, errors.length ? 207 : 200);
});

function json(obj: any, status = 200): Response {
  return new Response(JSON.stringify(obj, null, 2), { status, headers: { "Content-Type": "application/json" } });
}

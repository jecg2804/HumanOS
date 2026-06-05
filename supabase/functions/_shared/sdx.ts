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

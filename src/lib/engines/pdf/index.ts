// PdfEngine (the 6th engine). Pure: rebuilds the expediente PDF from a ticket's snapshot (form_data,
// ADR-0003) + its stamped approvals (R7) -- exactly what IT-01 needs. No DB access here; the route
// handler loads the data and passes it in (engines stay pure + testable). Uses pdf-lib standard fonts
// (Helvetica), so no fontkit/custom-font asset is needed; WinAnsi covers Spanish (we sanitize stray
// glyphs defensively so PDF generation can never crash on odd input from Spectrum-sourced data).
//
// This is a complete, ICONSA-branded expediente (Navy/Gold, all snapshot fields + all R7 stamps +
// status). It is NOT a pixel-exact reproduction of the 2012 paper scan -- that exact-layout template
// is a rendering swap on top of this same engine + data, flagged where the SOP fidelity (Cat A) needs
// the scan. Audit-legal only: "Aprobacion registrada", never a certified e-signature (Documenso v1.1).

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

type RGBColor = ReturnType<typeof rgb>;

export interface ExpedienteField {
  label: string;
  value: string;
}
export interface ExpedienteStep {
  label: string;
  decision: string;
  stamp: string | null;
  comments: string | null;
}
export interface ExpedienteData {
  typeName: string;
  ticketNumber: string;
  status: string;
  requesterName: string;
  createdAt: string; // display date
  sopReference?: string | null;
  fields: ExpedienteField[];
  steps: ExpedienteStep[];
}

const NAVY = rgb(0x1b / 255, 0x3a / 255, 0x5c / 255);
const GOLD = rgb(0xf0 / 255, 0xa5 / 255, 0x00 / 255);
const GRAY = rgb(0.4, 0.4, 0.4);
const INK = rgb(0.1, 0.1, 0.1);
const RULE = rgb(0.8, 0.8, 0.8);
const WHITE = rgb(1, 1, 1);

/** Make text WinAnsi-safe (Helvetica): normalize smart punctuation, drop anything unencodable. */
function sanitize(s: string): string {
  return (s ?? '')
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '?');
}

interface LineOpts {
  size?: number;
  bold?: boolean;
  color?: RGBColor;
  indent?: number;
  gap?: number;
}

export async function renderExpediente(data: ExpedienteData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28;
  const H = 841.89; // A4
  const MARGIN = 50;
  const CONTENT_W = W - MARGIN * 2;

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - MARGIN;

  const newPage = () => {
    page = doc.addPage([W, H]);
    y = H - MARGIN;
  };
  const ensure = (need: number) => {
    if (y - need < MARGIN) newPage();
  };

  const wrap = (text: string, f: PDFFont, size: number, maxW: number): string[] => {
    const words = sanitize(text).split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const trial = cur ? `${cur} ${w}` : w;
      if (cur && f.widthOfTextAtSize(trial, size) > maxW) {
        lines.push(cur);
        cur = w;
      } else {
        cur = trial;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  };

  const line = (text: string, opts: LineOpts = {}) => {
    const size = opts.size ?? 10;
    const f = opts.bold ? bold : font;
    const indent = opts.indent ?? 0;
    const x = MARGIN + indent;
    const lh = size + 4;
    for (const ln of wrap(text, f, size, CONTENT_W - indent)) {
      ensure(lh);
      page.drawText(ln, { x, y: y - size, size, font: f, color: opts.color ?? INK });
      y -= lh;
    }
    if (opts.gap) y -= opts.gap;
  };

  const hr = () => {
    ensure(10);
    page.drawLine({ start: { x: MARGIN, y }, end: { x: W - MARGIN, y }, thickness: 0.5, color: RULE });
    y -= 10;
  };

  // ---- Header band (page 1) ----
  page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: NAVY });
  page.drawText('ICONSA - HumanOS', { x: MARGIN, y: H - 38, size: 16, font: bold, color: WHITE });
  page.drawText(sanitize(data.typeName), { x: MARGIN, y: H - 58, size: 11, font, color: GOLD });
  y = H - 70 - 22;

  line(data.ticketNumber, { bold: true, size: 13, color: NAVY });
  line(`Estado: ${data.status}    Solicitante: ${data.requesterName}    Fecha: ${data.createdAt}`, {
    size: 9,
    color: GRAY,
    gap: 2,
  });
  if (data.sopReference) line(`Formulario SOP: ${data.sopReference}`, { size: 9, color: GRAY });
  hr();

  // ---- Detalle (snapshot, ADR-0003) ----
  line('Detalle de la solicitud', { bold: true, size: 12, color: NAVY, gap: 4 });
  for (const f of data.fields) line(`${f.label}: ${f.value}`, { size: 10 });
  y -= 6;
  hr();

  // ---- Cadena de aprobacion (R7 stamps) ----
  line('Cadena de aprobacion', { bold: true, size: 12, color: NAVY, gap: 4 });
  line('Firma del Solicitante - Enviada', { bold: true, size: 10 });
  line(data.requesterName, { size: 9, color: GRAY, indent: 12, gap: 4 });
  for (const s of data.steps) {
    line(`${s.label} - ${s.decision}`, { bold: true, size: 10 });
    if (s.stamp) line(s.stamp, { size: 9, color: GRAY, indent: 12 });
    if (s.comments) line(`"${s.comments}"`, { size: 9, color: GRAY, indent: 12 });
    y -= 4;
  }
  y -= 6;
  hr();

  line(
    'Aprobacion registrada (sello digital de auditoria). NO es una firma electronica certificada.',
    { size: 8, color: GRAY }
  );

  return doc.save();
}

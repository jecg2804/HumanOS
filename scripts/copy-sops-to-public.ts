import { readdirSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'Docs/SOPs, Formularios y Documentos';
const DST = 'public/sops';

mkdirSync(DST, { recursive: true });

const files = readdirSync(SRC).filter((f) => f.toLowerCase().endsWith('.pdf'));
const index: Record<string, string> = {};

for (const f of files) {
  const sanitized = f.replace(/\s+/g, '_').replace(/[(),]/g, '');
  copyFileSync(join(SRC, f), join(DST, sanitized));

  // Extrae sop_reference del nombre. Formatos comunes:
  //   "IC-RH-F-05-03 Solicitud de Vacaciones.pdf" → "ICRHF0503"
  //   "IC-RH-D-02 Condiciones..."                  → "ICRHD02"
  //   "IC-RH-PO-05 Acciones..."                    → "ICRHPO05"
  const m = f.match(/^IC-([A-Z]{2})-([A-Z]+)-?(\d+)(?:-(\d+))?/);
  if (m) {
    const part4 = m[4] ?? '';
    const code = `IC${m[1]}${m[2]}${m[3]}${part4}`;
    index[code] = `/sops/${sanitized}`;
  }
}

writeFileSync(join(DST, 'index.json'), JSON.stringify(index, null, 2));
console.log(`Copied ${files.length} PDFs, indexed ${Object.keys(index).length}`);

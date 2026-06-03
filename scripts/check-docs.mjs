// scripts/check-docs.mjs
// Docs drift guard (foundation audit root-cause fix). Fails the build on:
//   (1) broken relative links / @imports inside MAINTAINED .md files, and
//   (2) a second "live state" doc existing outside docs/STATUS.md.
// Scope = OUR maintained docs. Excluded (not our maintenance surface): _archive/,
// docs/superpowers/ (frozen specs+plans), .claude/skills/ (third-party), and dated
// audit reports (AUDITORIA*/FOUNDATION-AUDIT*). Dependency-free; runs locally + in CI.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, basename } from 'node:path';

const ROOT = process.cwd();
const SKIP = new Set(['node_modules', '.next', '.git', '.vercel', 'coverage', 'test-results', 'playwright-report', 'dist', 'build']);
const EXCLUDE = /(^|[\\/])(_archive|superpowers)[\\/]|(^|[\\/])\.claude[\\/]skills[\\/]|(AUDITORIA|FOUNDATION-AUDIT)/;
const STATE_OK = new Set(['CLAUDE.md', 'AGENTS.md', 'PROJECT_CONSTITUTION.md']);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, acc);
    else if (name.toLowerCase().endsWith('.md')) acc.push(full);
  }
  return acc;
}

const docs = walk(ROOT).filter((f) => !EXCLUDE.test(relative(ROOT, f)));
const broken = [];
const linkRe = /\[[^\]]*\]\(([^)\s]+)/g;
const importRe = /(?:^|\s)@([A-Za-z0-9_][\w./-]*\.md)\b/g;

for (const file of docs) {
  const text = readFileSync(file, 'utf8');
  const dir = dirname(file);
  const check = (raw, kind, base) => {
    let t = (raw || '').trim();
    if (!t || /^(https?:|mailto:|tel:|#)/.test(t)) return;
    t = t.split('#')[0].split('?')[0];
    if (!t) return;
    if (!existsSync(resolve(base, t))) broken.push({ file: relative(ROOT, file), link: t, kind });
  };
  let m;
  while ((m = linkRe.exec(text))) check(m[1], 'link', dir);
  while ((m = importRe.exec(text))) check(m[1], '@import', ROOT);
}

const stateDocs = [];
for (const file of docs) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (rel === 'docs/STATUS.md' || STATE_OK.has(basename(file))) continue;
  const head = readFileSync(file, 'utf8').slice(0, 700).toLowerCase();
  if (/estado vivo|el .{0,4}nico doc.{0,12}estado|qu. estamos haciendo \/ qu. falta/.test(head)) {
    stateDocs.push(rel);
  }
}

let failed = false;
if (broken.length) {
  failed = true;
  console.error(`\n[docs-check] ${broken.length} broken doc reference(s):`);
  for (const b of broken) console.error(`  ${b.file}  ->  ${b.link}  (${b.kind})`);
}
if (stateDocs.length) {
  failed = true;
  console.error(`\n[docs-check] second live-state doc detected (only docs/STATUS.md allowed):`);
  for (const s of stateDocs) console.error(`  ${s}`);
}
if (!failed) console.log('[docs-check] OK - no broken docs links; single state doc.');
process.exit(failed ? 1 : 0);

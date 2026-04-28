import Link from 'next/link';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServerClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FORM_HELP, isP1Code } from '@/lib/forms/registry';

export const metadata = { title: 'Ayuda — HumanOS' };

type RequestTypeRow = {
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  sop_reference: string | null;
  approval_chain: string[];
  is_active: boolean;
};

async function loadSopIndex(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(join(process.cwd(), 'public', 'sops', 'index.json'), 'utf-8');
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export default async function AyudaPage() {
  const supa = await createServerClient();
  const [{ data: types }, sopIndex] = await Promise.all([
    supa
      .from('request_types')
      .select('code, name, description, category, sop_reference, approval_chain, is_active')
      .eq('is_active', true)
      .order('category')
      .order('code'),
    loadSopIndex(),
  ]);

  const grouped = groupByCategory((types ?? []) as RequestTypeRow[]);

  return (
    <div className="space-y-8 max-w-5xl">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold">Ayuda</h1>
        <p className="text-neutral-500 mt-1 text-sm md:text-base max-w-2xl">
          Aquí encuentras todos los formularios que Recursos Humanos maneja, qué necesitas para
          llenarlos, y quién los aprueba.
        </p>
      </header>

      <Callout
        title="Sobre Horas Extras"
        body="La autorización de Horas Extras para horas YA TRABAJADAS se hace dentro de Acción de Personal (post-facto, para que entren a planilla). La solicitud de autorización previa para trabajar horas extras estará disponible próximamente."
      />

      {grouped.map((group) => (
        <section key={group.category} className="space-y-3">
          <h2 className="text-lg font-semibold uppercase tracking-wide text-neutral-700">
            {group.category}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.items.map((t) => (
              <TypeCard key={t.code} type={t} sopIndex={sopIndex} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TypeCard({
  type,
  sopIndex,
}: {
  type: RequestTypeRow;
  sopIndex: Record<string, string>;
}) {
  const isP1 = isP1Code(type.code);
  const help = isP1 ? FORM_HELP[type.code as keyof typeof FORM_HELP] : null;
  const sopUrl = type.sop_reference ? sopIndex[type.sop_reference] : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{type.name}</CardTitle>
          {isP1 ? (
            <Badge style={{ background: '#1A7F5A', color: 'white' }}>Disponible</Badge>
          ) : (
            <Badge variant="outline">Próximamente</Badge>
          )}
        </div>
        {type.description && (
          <p className="text-sm text-neutral-500 mt-1">{type.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {help && (
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Qué necesitas</p>
            <ul className="list-disc ml-5 space-y-0.5">
              {help.qué_necesitas.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Quién aprueba</p>
          <p>{help?.chain_legible ?? readableP2Chain(type.approval_chain)}</p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          {isP1 ? (
            <Link
              href={`/solicitudes/nueva/${type.code.toLowerCase()}`}
              className="inline-flex items-center px-3 py-1.5 rounded text-sm text-white"
              style={{ background: '#1B3A5C' }}
            >
              Iniciar solicitud
            </Link>
          ) : (
            <span className="text-sm text-neutral-400 italic">Iniciar solicitud (próximamente)</span>
          )}
          {sopUrl && (
            <a href={sopUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">
              Ver SOP
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Callout({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="border-l-4 p-4 rounded text-sm"
      style={{ borderColor: '#F5A623', background: '#FEF6E7' }}
    >
      <p className="font-semibold mb-1">{title}</p>
      <p className="text-neutral-700">{body}</p>
    </div>
  );
}

function groupByCategory(rows: RequestTypeRow[]): Array<{ category: string; items: RequestTypeRow[] }> {
  const map = new Map<string, RequestTypeRow[]>();
  for (const r of rows) {
    const cat = r.category ?? 'Otros';
    const arr = map.get(cat) ?? [];
    arr.push(r);
    map.set(cat, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => ({ category, items }));
}

const ROLE_LABELS_SHORT: Record<string, string> = {
  supervisor_directo: 'Tu jefe',
  hr_oficial: 'Rocío (RRHH)',
  hr_planilla: 'Milagros (Planillas)',
  hr_gerente: 'Samantha (Gerente RRHH)',
  presidencia: 'Rodrigo (Presidencia)',
  supervisor: 'Tu jefe',
  hr_admin: 'RRHH',
  admin: 'Presidencia',
};

function readableP2Chain(chain: string[]): string {
  return chain.map((r) => ROLE_LABELS_SHORT[r] ?? r).join(' → ') || 'Sin aprobación requerida';
}

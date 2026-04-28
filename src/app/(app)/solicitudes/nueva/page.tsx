import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isP1Code } from '@/lib/forms/registry';

export const metadata = { title: 'Nueva solicitud — HumanOS' };

type Row = {
  code: string;
  name: string;
  description: string | null;
  category: string | null;
};

export default async function NuevaSolicitudPage() {
  const supa = await createServerClient();
  const { data: types } = await supa
    .from('request_types')
    .select('code, name, description, category')
    .eq('is_active', true)
    .order('category')
    .order('name');

  const rows = (types ?? []) as Row[];

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold">Nueva solicitud</h1>
        <p className="text-neutral-500 mt-1 text-sm md:text-base">
          Selecciona el tipo de solicitud que necesitas crear.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((t) => (
          <TypeCard key={t.code} type={t} />
        ))}
      </div>
    </div>
  );
}

function TypeCard({ type }: { type: Row }) {
  const isP1 = isP1Code(type.code);
  const inner = (
    <Card className={isP1 ? 'hover:border-neutral-400 transition cursor-pointer h-full' : 'opacity-60 h-full'}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{type.name}</CardTitle>
          {isP1 ? (
            <Badge style={{ background: '#1A7F5A', color: 'white' }}>Disponible</Badge>
          ) : (
            <Badge variant="outline">Próximamente</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-sm text-neutral-600">
        {type.description ?? type.category ?? ''}
      </CardContent>
    </Card>
  );

  if (!isP1) return inner;
  return (
    <Link href={`/solicitudes/nueva/${type.code.toLowerCase()}`} className="block">
      {inner}
    </Link>
  );
}

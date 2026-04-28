import { createServerClient } from '@/lib/supabase/server';
import { DirectoryClient, type DirectoryRow } from './DirectoryClient';

export const metadata = { title: 'Directorio — HumanOS' };

export default async function DirectorioPage() {
  const supa = await createServerClient();
  const { data } = await supa
    .from('people')
    .select('id, code, name, position, job_title, department, office, email, phone, photo_url')
    .eq('status', 'Activo')
    .order('name');

  const rows = (data ?? []) as DirectoryRow[];

  const departments = uniqueSorted(rows.map((r) => r.department));
  const offices = uniqueSorted(rows.map((r) => r.office));

  return (
    <div className="space-y-4 max-w-6xl">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold">Directorio</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          {rows.length} {rows.length === 1 ? 'empleado activo' : 'empleados activos'}.
        </p>
      </header>
      <DirectoryClient rows={rows} departments={departments} offices={offices} />
    </div>
  );
}

function uniqueSorted(values: Array<string | null>): string[] {
  const set = new Set<string>();
  for (const v of values) if (v) set.add(v);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

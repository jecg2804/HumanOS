'use client';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone } from 'lucide-react';

export type DirectoryRow = {
  id: string;
  code: string;
  name: string;
  position: string | null;
  job_title: string | null;
  department: string | null;
  office: string | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
};

export function DirectoryClient({
  rows,
  departments,
  offices,
}: {
  rows: DirectoryRow[];
  departments: string[];
  offices: string[];
}) {
  const [search, setSearch] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());
  const [selectedOffices, setSelectedOffices] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (selectedDepts.size > 0 && !(r.department && selectedDepts.has(r.department))) return false;
      if (selectedOffices.size > 0 && !(r.office && selectedOffices.has(r.office))) return false;
      if (!q) return true;
      const hay = [r.name, r.code, r.email, r.department, r.position, r.job_title]
        .filter((x): x is string => Boolean(x))
        .map((s) => s.toLowerCase())
        .join(' ');
      return hay.includes(q);
    });
  }, [rows, search, selectedDepts, selectedOffices]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar por nombre, código, email, departamento…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <FilterPills
        label="Departamento"
        options={departments}
        selected={selectedDepts}
        onToggle={(d) => toggleSet(setSelectedDepts, d)}
      />
      {offices.length > 1 && (
        <FilterPills
          label="Oficina"
          options={offices}
          selected={selectedOffices}
          onToggle={(o) => toggleSet(setSelectedOffices, o)}
        />
      )}

      <p className="text-xs text-neutral-500">
        {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((p) => (
          <PersonCard key={p.id} p={p} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-8">
          No hay empleados que coincidan con los filtros.
        </p>
      )}
    </div>
  );
}

function PersonCard({ p }: { p: DirectoryRow }) {
  const initials = p.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <Card>
      <CardContent className="flex gap-3 p-4">
        <div
          className="h-12 w-12 shrink-0 rounded-full flex items-center justify-center font-semibold text-sm"
          style={{ background: '#1B3A5C', color: '#F5A623' }}
        >
          {initials || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{p.name}</p>
          <p className="text-xs text-neutral-500 truncate">
            {p.position ?? p.job_title ?? '—'}
            {p.department && <span> · {p.department}</span>}
          </p>
          {p.email && (
            <p className="text-xs text-neutral-600 mt-1 flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 shrink-0" />
              <a href={`mailto:${p.email}`} className="hover:underline truncate">
                {p.email}
              </a>
            </p>
          )}
          {p.phone && (
            <p className="text-xs text-neutral-600 flex items-center gap-1">
              <Phone className="h-3 w-3 shrink-0" />
              {p.phone}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FilterPills({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (o: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.has(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className="px-2.5 py-1 rounded-full text-xs border transition"
              style={{
                background: active ? '#1B3A5C' : 'white',
                color: active ? 'white' : '#122740',
                borderColor: active ? '#1B3A5C' : '#d4d4d8',
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function toggleSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });
}

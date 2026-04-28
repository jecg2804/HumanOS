import Link from 'next/link';
import { getMe } from '@/lib/auth/getMe';
import { createServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Mi Perfil — HumanOS' };

export default async function PerfilPage() {
  const me = await getMe();
  const supa = await createServerClient();

  // Fetch full row (me ya tiene la base, pero queremos asegurar todos los campos visibles).
  const { data: full } = await supa.from('people').select('*').eq('id', me.id).single();
  const p = full ?? me;

  let supervisorName: string | null = null;
  if (me.supervisor_id) {
    const { data: sup } = await supa
      .from('people')
      .select('name')
      .eq('id', me.supervisor_id)
      .maybeSingle();
    supervisorName = sup?.name ?? null;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Mi Perfil</h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Tus datos como aparecen en el expediente de Recursos Humanos.
          </p>
        </div>
        <Link
          href="/solicitudes/nueva/actualizacion_datos"
          className="text-sm px-3 py-1.5 rounded text-white"
          style={{ background: '#1B3A5C' }}
        >
          Actualizar datos
        </Link>
      </header>

      <Section title="Identidad">
        <Field label="Nombre" value={p.name} />
        <Field label="Código ICONSA" value={p.code} />
        {p.cedula && <Field label="Cédula" value={p.cedula} />}
        {p.date_of_birth && <Field label="Fecha de nacimiento" value={formatDate(p.date_of_birth)} />}
        {p.nationality && <Field label="Nacionalidad" value={p.nationality} />}
        {p.gender && <Field label="Género" value={p.gender} />}
      </Section>

      <Section title="Contacto">
        {p.email && <Field label="Email" value={p.email} />}
        {p.phone && <Field label="Teléfono / Celular" value={p.phone} />}
        {p.address && <Field label="Dirección" value={p.address} />}
        {p.city && <Field label="Ciudad" value={p.city} />}
        {p.country && <Field label="País" value={p.country} />}
        {p.emergency_contact_name && (
          <Field label="Contacto de emergencia" value={`${p.emergency_contact_name}${p.emergency_contact_phone ? ` · ${p.emergency_contact_phone}` : ''}`} />
        )}
      </Section>

      <Section title="Laboral">
        {p.department && <Field label="Departamento" value={p.department} />}
        {p.position && <Field label="Cargo" value={p.position} />}
        {p.job_title && p.job_title !== p.position && <Field label="Título" value={p.job_title} />}
        {p.office && <Field label="Oficina" value={p.office} />}
        {p.hire_date && <Field label="Fecha de ingreso" value={formatDate(p.hire_date)} />}
        {supervisorName && <Field label="Supervisor" value={supervisorName} />}
        <Field label="Estado" value={p.status} />
      </Section>

      <Section title="Otros">
        {p.marital_status && <Field label="Estado civil" value={p.marital_status} />}
        {p.num_kids != null && <Field label="Dependientes" value={String(p.num_kids)} />}
        {p.education && <Field label="Educación" value={p.education} />}
        {p.blood_type && <Field label="Tipo de sangre" value={p.blood_type} />}
      </Section>

      <p className="text-xs text-neutral-500">
        Para cambiar tus datos, usa el formulario de{' '}
        <Link href="/solicitudes/nueva/actualizacion_datos" className="underline">
          Actualización de Datos
        </Link>
        .
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const items = filterTruthyChildren(children);
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base uppercase tracking-wide text-neutral-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">{items}</dl>
      </CardContent>
    </Card>
  );
}

function filterTruthyChildren(children: React.ReactNode): React.ReactNode[] {
  const arr = Array.isArray(children) ? children : [children];
  return arr.filter((c): c is React.ReactNode => c !== null && c !== undefined && c !== false);
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-500 mb-0.5">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatDate(s: string): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

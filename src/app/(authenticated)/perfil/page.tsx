import Image from 'next/image';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAvatarSignedUrl } from '@/lib/storage/avatars';

export default async function PerfilPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <p>No autenticado</p>;

  const { data: person } = await supabase
    .schema('hr')
    .from('people')
    .select(
      `id, full_name, preferred_name, national_id, employee_code, photo_url,
       employment:employments!inner(
         hire_date,
         position:positions(title),
         department:org_units(name),
         office:locations(name),
         supervisor:people!supervisor_id(full_name),
         employment_type:employment_types(short_name)
       )`
    )
    .eq('auth_id', user.id)
    .eq('employment.is_current', true)
    .maybeSingle();

  if (!person) return <p>Perfil no encontrado</p>;

  let avatarUrl: string | null = null;
  if (person.photo_url) {
    try {
      avatarUrl = await getAvatarSignedUrl(supabase, person.photo_url);
    } catch {
      // Render without avatar if signed URL fails
    }
  }

  const employmentRaw = Array.isArray(person.employment)
    ? person.employment[0]
    : person.employment;
  const employment = employmentRaw as unknown as {
    hire_date: string | null;
    position: { title: string } | null;
    department: { name: string } | null;
    office: { name: string } | null;
    supervisor: { full_name: string } | null;
    employment_type: { short_name: string } | null;
  } | null;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Mi perfil</h1>
      <p className="text-gray-600 text-sm mt-1">
        Bienvenido a HumanOS. Si algo está incorrecto, contacta a Recursos Humanos.
      </p>
      <div className="bg-white rounded-lg shadow mt-6 p-6 flex gap-6 items-start">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={person.full_name}
            width={96}
            height={96}
            unoptimized
            className="w-24 h-24 rounded-full object-cover"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200" />
        )}
        <dl className="flex-1 space-y-2 text-sm">
          <Row label="Nombre" value={person.full_name} />
          <Row label="Cédula" value={person.national_id ?? '—'} />
          <Row label="Código de empleado" value={person.employee_code ?? '—'} />
          <Row label="Cargo" value={employment?.position?.title ?? '—'} />
          <Row label="Departamento" value={employment?.department?.name ?? '—'} />
          <Row label="Ubicación" value={employment?.office?.name ?? '—'} />
          <Row label="Supervisor" value={employment?.supervisor?.full_name ?? 'Sin asignar'} />
          <Row label="Fecha de ingreso" value={employment?.hire_date ?? '—'} />
          <Row
            label="Tipo de contrato"
            value={employment?.employment_type?.short_name ?? '—'}
          />
        </dl>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b last:border-0 py-2">
      <dt className="text-gray-600">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

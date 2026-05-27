import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EmployeeForm } from '@/components/admin/employees/EmployeeForm';
import { RegenerateInviteButton } from '@/components/admin/employees/RegenerateInviteButton';

export default async function EditarEmpleadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [person, positions, departments, offices, supervisors, employmentTypes, latestInvite] =
    await Promise.all([
      supabase
        .schema('hr')
        .from('people')
        .select(
          `id, full_name, national_id, employee_code, review_notes, needs_review,
           employments!inner(
             position_id, position_text, department_id, department_text,
             office_id, office_text, supervisor_id, hire_date, app_role,
             employment_type_id, is_current
           )`
        )
        .eq('id', id)
        .eq('employments.is_current', true)
        .maybeSingle(),
      supabase
        .schema('hr')
        .from('positions')
        .select('id, title')
        .eq('is_active', true)
        .order('title'),
      supabase
        .schema('hr')
        .from('org_units')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
      supabase
        .schema('hr')
        .from('locations')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
      supabase
        .schema('hr')
        .from('people')
        .select('id, full_name')
        .eq('status', 'Activo')
        .order('full_name'),
      supabase
        .schema('hr')
        .from('employment_types')
        .select('id, short_name')
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .schema('hr')
        .from('invite_codes')
        .select('delivery_target, code, expires_at, consumed_at')
        .eq('person_id', id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (!person.data) return <p>Empleado no encontrado</p>;
  const employmentRaw = (person.data as unknown as {
    employments?: Array<{
      position_id: string | null;
      position_text: string | null;
      department_id: string | null;
      department_text: string | null;
      office_id: string | null;
      office_text: string | null;
      supervisor_id: string | null;
      hire_date: string | null;
      app_role: 'employee' | 'hr_admin' | 'president' | 'admin' | null;
      employment_type_id: string | null;
    }>;
  }).employments;
  const employment = employmentRaw?.[0];

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Editar: {person.data.full_name}</h1>
      {person.data.needs_review && (
        <div className="bg-[#FEF3C7] border border-[#B45309] rounded p-4 mb-4">
          <h2 className="font-bold text-[#B45309]">Necesita revisión</h2>
          <pre className="text-sm whitespace-pre-wrap mt-2">{person.data.review_notes}</pre>
        </div>
      )}
      <EmployeeForm
        mode="edit"
        defaultValues={{
          person_id: person.data.id,
          full_name: person.data.full_name,
          national_id: person.data.national_id ?? '',
          employee_code: person.data.employee_code ?? '',
          position_id: employment?.position_id ?? '',
          position_text: employment?.position_text ?? '',
          department_id: employment?.department_id ?? '',
          department_text: employment?.department_text ?? '',
          office_id: employment?.office_id ?? '',
          office_text: employment?.office_text ?? '',
          supervisor_id: employment?.supervisor_id ?? '',
          hire_date: employment?.hire_date ?? '',
          app_role: employment?.app_role ?? 'employee',
          employment_type_id: employment?.employment_type_id ?? '',
          delivery_target: '',
        }}
        positions={positions.data?.map((p) => ({ id: p.id, label: p.title })) ?? []}
        departments={departments.data?.map((d) => ({ id: d.id, label: d.name })) ?? []}
        offices={offices.data?.map((o) => ({ id: o.id, label: o.name })) ?? []}
        supervisors={supervisors.data?.map((s) => ({ id: s.id, label: s.full_name })) ?? []}
        employmentTypes={
          employmentTypes.data?.map((t) => ({ id: t.id, label: t.short_name })) ?? []
        }
      />
      {latestInvite.data && !latestInvite.data.consumed_at && (
        <div className="mt-6 border-t pt-4">
          <h2 className="font-bold mb-2">Invitación pendiente</h2>
          <p className="text-sm">
            Código: <span className="font-mono">{latestInvite.data.code}</span>
          </p>
          <p className="text-sm">Entregado a: {latestInvite.data.delivery_target}</p>
          <p className="text-sm">
            Vence: {new Date(latestInvite.data.expires_at).toLocaleString()}
          </p>
          <div className="mt-2">
            <RegenerateInviteButton
              personId={id}
              deliveryTarget={latestInvite.data.delivery_target ?? ''}
            />
          </div>
        </div>
      )}
    </main>
  );
}

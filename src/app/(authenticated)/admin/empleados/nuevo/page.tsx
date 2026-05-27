import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EmployeeForm } from '@/components/admin/employees/EmployeeForm';

export default async function NuevoEmpleadoPage() {
  const supabase = await createSupabaseServerClient();
  const [positions, departments, offices, supervisors, employmentTypes] = await Promise.all([
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
  ]);

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Nuevo empleado</h1>
      <EmployeeForm
        mode="create"
        positions={positions.data?.map((p) => ({ id: p.id, label: p.title })) ?? []}
        departments={departments.data?.map((d) => ({ id: d.id, label: d.name })) ?? []}
        offices={offices.data?.map((o) => ({ id: o.id, label: o.name })) ?? []}
        supervisors={supervisors.data?.map((s) => ({ id: s.id, label: s.full_name })) ?? []}
        employmentTypes={
          employmentTypes.data?.map((t) => ({ id: t.id, label: t.short_name })) ?? []
        }
      />
    </main>
  );
}

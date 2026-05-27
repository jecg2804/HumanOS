import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EmployeeList, type EmployeeListItem } from '@/components/admin/employees/EmployeeList';

export default async function AdminEmpleadosPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .schema('hr')
    .from('people')
    .select(
      `id, full_name, national_id, employee_code, needs_review, review_notes,
       employments!inner(
         is_current,
         position:positions(title),
         department:org_units(name),
         position_text, department_text
       )`
    )
    .eq('employments.is_current', true)
    .eq('status', 'Activo')
    .order('full_name');

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    full_name: string;
    national_id: string | null;
    employee_code: string | null;
    needs_review: boolean;
    review_notes: string | null;
    employments:
      | Array<{
          position: { title: string } | null;
          department: { name: string } | null;
          position_text: string | null;
          department_text: string | null;
        }>
      | null;
  }>;

  const employees: EmployeeListItem[] = rows.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    national_id: p.national_id,
    employee_code: p.employee_code,
    needs_review: p.needs_review,
    review_notes: p.review_notes,
    position: p.employments?.[0]?.position?.title ?? p.employments?.[0]?.position_text ?? null,
    department:
      p.employments?.[0]?.department?.name ?? p.employments?.[0]?.department_text ?? null,
  }));

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Empleados</h1>
      <EmployeeList employees={employees} />
    </main>
  );
}

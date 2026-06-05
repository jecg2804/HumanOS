import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/solicitudes/StatusBadge';

// Ticket list. RLS (requests.can_view_ticket) decides what each person sees: requesters see their own,
// approvers see assigned, hr_admin sees all. We just select + order; the policy does the filtering.
export default async function SolicitudesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <p className="p-6">No autenticado</p>;

  const { data: tickets, error } = await supabase
    .schema('requests')
    .from('tickets')
    .select('id, ticket_number, status, created_at, requester_id, type:types(name, code)')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Solicitudes</h1>
          <p className="text-gray-600 text-sm mt-1">Tus solicitudes y las que requieren tu acción.</p>
        </div>
        <Link
          href="/solicitudes/nueva/vacaciones"
          className="bg-navy-500 text-white py-2.5 px-5 rounded-md font-medium hover:bg-navy-600"
        >
          Solicitar vacaciones
        </Link>
      </div>

      {error && (
        <p role="alert" className="text-red-600 text-sm mt-6">
          No se pudieron cargar las solicitudes.
        </p>
      )}

      {!error && (!tickets || tickets.length === 0) ? (
        <div className="bg-white rounded-lg shadow mt-6 p-8 text-center text-gray-500">
          Aún no tienes solicitudes. Crea la primera con &ldquo;Solicitar vacaciones&rdquo;.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow mt-6 divide-y">
          {(tickets ?? []).map((t) => {
            const type = (Array.isArray(t.type) ? t.type[0] : t.type) as
              | { name: string; code: string }
              | null;
            return (
              <Link
                key={t.id}
                href={`/solicitudes/${t.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-navy-700">{type?.name ?? 'Solicitud'}</p>
                  <p className="text-xs text-gray-500 font-mono">{t.ticket_number}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">
                    {new Date(t.created_at).toLocaleDateString('es-PA')}
                  </span>
                  <StatusBadge status={t.status} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

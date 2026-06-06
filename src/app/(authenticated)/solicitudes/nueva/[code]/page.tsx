import { getVacacionesFormContext, submitVacaciones } from '@/lib/engines/vacaciones/actions';
import { NuevaSolicitudForm } from '@/components/solicitudes/NuevaSolicitudForm';

// New-request route. Generic by `code`; VACACIONES is the first wired type (the rest plug in as their
// form_schema + actions ship — ADR-0015). The server resolves the schema + profile/computed prefill and
// hands submitVacaciones to the client form.
export default async function NuevaSolicitudPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = code.toUpperCase();

  if (normalized !== 'VACACIONES') {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-navy-500">Solicitud no disponible</h1>
        <p className="text-gray-600 text-sm mt-2">
          El formulario &ldquo;{code}&rdquo; aún no está disponible. Por ahora puedes solicitar
          tus vacaciones.
        </p>
      </main>
    );
  }

  const ctx = await getVacacionesFormContext();
  if (!ctx.ok || !ctx.schema) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-navy-500">No se pudo cargar el formulario</h1>
        <p role="alert" className="text-red-600 text-sm mt-2">
          {ctx.message}
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-navy-500">{ctx.typeName}</h1>
      <p className="text-gray-600 text-sm mt-1">
        Los datos de tu perfil ya están prellenados (no se piden de nuevo). Completa solo lo nuevo a
        esta solicitud.
      </p>
      <div className="bg-white rounded-lg shadow mt-6 p-6">
        <NuevaSolicitudForm
          typeName={ctx.typeName ?? 'Solicitud'}
          schema={ctx.schema}
          prefill={ctx.prefill ?? {}}
          supervisorName={ctx.supervisorName ?? null}
          defaultSupervisorId={ctx.defaultSupervisorId ?? null}
          allowSupervisorOverride={ctx.allowSupervisorOverride ?? false}
          supervisors={ctx.supervisors ?? []}
          onSubmit={submitVacaciones}
        />
      </div>
    </main>
  );
}

import type { VacacionesData } from '@/lib/forms/schemas/vacaciones';

export function VacacionesDetail({ data }: { data: VacacionesData }) {
  return (
    <dl className="space-y-3 text-sm">
      <Field label="Pago de vacaciones" value={data.pago_vacaciones} />
      <Field label="Tiempo solicitado" value={data.tiempo_solicitado} />
      <div>
        <dt className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Rangos</dt>
        <dd>
          <ul className="list-disc ml-5 space-y-0.5">
            {data.desglose.map((r, i) => (
              <li key={i}>
                {formatDate(r.desde)} → {formatDate(r.hasta)}
              </li>
            ))}
          </ul>
        </dd>
      </div>
      {data.observaciones && (
        <Field label="Observaciones" value={data.observaciones} />
      )}
    </dl>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-500 mb-1">{label}</dt>
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

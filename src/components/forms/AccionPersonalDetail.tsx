import type { AccionPersonalData } from '@/lib/forms/schemas/accion-personal';
import { Badge } from '@/components/ui/badge';

type Props = {
  data: AccionPersonalData;
  empleado_objeto_name?: string;
};

export function AccionPersonalDetail({ data, empleado_objeto_name }: Props) {
  return (
    <dl className="space-y-3 text-sm">
      <div>
        <dt className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
          Sub-tipo
        </dt>
        <dd>
          <Badge variant="secondary" className="text-sm h-6 px-2.5">
            {data.sub_tipo}
          </Badge>
        </dd>
      </div>
      <Field
        label="Empleado objeto"
        value={empleado_objeto_name ?? data.empleado_objeto_id}
      />
      <div>
        <dt className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
          Observaciones
        </dt>
        <dd className="whitespace-pre-wrap">{data.observaciones}</dd>
      </div>
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

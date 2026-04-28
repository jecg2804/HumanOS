import {
  type PrestamoData,
  PRESTAMO_LIMITE_ESTANDAR,
} from '@/lib/forms/schemas/prestamo';
import { Badge } from '@/components/ui/badge';

export function PrestamoDetail({ data }: { data: PrestamoData }) {
  const escalado = data.monto_solicitado > PRESTAMO_LIMITE_ESTANDAR;

  return (
    <dl className="space-y-3 text-sm">
      <div>
        <dt className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
          Monto solicitado
        </dt>
        <dd className="flex items-center gap-2">
          <span>${formatMonto(data.monto_solicitado)}</span>
          {escalado && (
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-900"
            >
              Escalada a Presidencia (&gt;${PRESTAMO_LIMITE_ESTANDAR} según
              IC-RH-D-02)
            </Badge>
          )}
        </dd>
      </div>
      <Field
        label="Descuento por bisemana"
        value={`$${formatMonto(data.descuento_propuesto)}`}
      />
      <div>
        <dt className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
          Motivo
        </dt>
        <dd className="whitespace-pre-wrap">{data.motivo}</dd>
      </div>
      <Field
        label="Aceptó cláusula de descuento de liquidación"
        value="Sí"
      />
    </dl>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatMonto(n: number): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0.00';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

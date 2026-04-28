import type { ActualizacionDatosData } from '@/lib/forms/schemas/actualizacion-datos';

type DetailData = ActualizacionDatosData & { _changes?: string[] };

const PATH_LABELS: Record<string, string> = {
  'direccion.calle_barriada': 'Calle / barriada',
  'direccion.apartamento_casa_no': 'Apartamento / casa No.',
  telefono_casa: 'Teléfono de casa',
  celular_personal: 'Celular personal',
  estado_civil: 'Estado civil',
  pareja: 'Datos de pareja',
  'pareja.nombre': 'Nombre de pareja',
  'pareja.telefono': 'Teléfono de pareja',
  dependientes: 'Dependientes',
};

function labelForPath(path: string): string {
  if (PATH_LABELS[path]) return PATH_LABELS[path];
  // Match prefix labels like 'dependientes.0.nombre' -> 'Dependientes'
  for (const key of Object.keys(PATH_LABELS)) {
    if (path.startsWith(`${key}.`)) return PATH_LABELS[key];
  }
  return path;
}

export function ActualizacionDatosDetail({ data }: { data: DetailData }) {
  const changes = data._changes ?? [];
  const changedLabels = Array.from(new Set(changes.map(labelForPath)));

  const tienePareja =
    data.pareja &&
    (data.estado_civil === 'Casado(a)' || data.estado_civil === 'Unido(a)');

  return (
    <div className="space-y-5 text-sm">
      {changedLabels.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1">
            Campos modificados
          </p>
          <p className="text-sm">{changedLabels.join(', ')}.</p>
        </div>
      )}

      <Section title="Dirección">
        <Field label="Calle / barriada" value={data.direccion.calle_barriada} />
        {data.direccion.apartamento_casa_no && (
          <Field
            label="Apartamento / casa No."
            value={data.direccion.apartamento_casa_no}
          />
        )}
      </Section>

      <Section title="Teléfonos">
        {data.telefono_casa && (
          <Field label="Teléfono de casa" value={data.telefono_casa} />
        )}
        <Field label="Celular personal" value={data.celular_personal} />
      </Section>

      <Section title="Estado civil">
        <Field label="Estado" value={data.estado_civil} />
        {tienePareja && data.pareja && (
          <>
            <Field label="Nombre de pareja" value={data.pareja.nombre} />
            <Field label="Teléfono de pareja" value={data.pareja.telefono} />
          </>
        )}
      </Section>

      <Section title="Dependientes">
        {data.dependientes.length === 0 ? (
          <p className="text-neutral-600">Sin dependientes registrados.</p>
        ) : (
          <ul className="list-disc ml-5 space-y-0.5">
            {data.dependientes.map((d, i) => (
              <li key={i}>
                {d.nombre} — {d.parentesco}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-wide text-neutral-500 font-semibold">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-500 mb-0.5">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

import {
  type ReclamoPagoData,
  RECLAMO_CATEGORIAS,
} from '@/lib/forms/schemas/reclamo-pago';

type Attachment = {
  name: string;
  url: string;
  mime: string;
  size: number;
};

type Props = {
  data: ReclamoPagoData;
  attachments?: Attachment[];
};

function formatDate(s: string): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-PA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return Number.isInteger(n)
    ? n.toString()
    : n.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function computeDiferencia(
  empleado: number | null,
  supervisor: number | null,
): number | null {
  if (empleado === null && supervisor === null) return null;
  return (empleado ?? 0) - (supervisor ?? 0);
}

function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

export function ReclamoPagoDetail({ data, attachments = [] }: Props) {
  // Indexar la tabla por categoría para tolerar orden diferente.
  const filaPorCategoria = new Map(data.tabla.map((f) => [f.categoria, f]));

  return (
    <div className="space-y-5 text-sm">
      <div>
        <dt className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
          Período en disputa
        </dt>
        <dd>
          {formatDate(data.periodo.desde)} → {formatDate(data.periodo.hasta)}
        </dd>
      </div>

      <div>
        <dt className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
          Detalle del reclamo
        </dt>
        <dd>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-medium">Categoría</th>
                  <th className="py-2 px-2 font-medium text-right">
                    Empleado
                  </th>
                  <th className="py-2 px-2 font-medium text-right">
                    Supervisor
                  </th>
                  <th className="py-2 pl-2 font-medium text-right">
                    Diferencia
                  </th>
                </tr>
              </thead>
              <tbody>
                {RECLAMO_CATEGORIAS.map((cat) => {
                  const fila = filaPorCategoria.get(cat);
                  const empleado = fila?.empleado ?? null;
                  const supervisor = fila?.supervisor ?? null;
                  // Preferir el valor almacenado si existe, sino calcular.
                  const diferencia =
                    fila?.diferencia ??
                    computeDiferencia(empleado, supervisor);
                  return (
                    <tr key={cat} className="border-b last:border-0">
                      <td className="py-2 pr-3">{cat}</td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {formatNumber(empleado)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {formatNumber(supervisor)}
                      </td>
                      <td className="py-2 pl-2 text-right tabular-nums font-medium">
                        {formatNumber(diferencia)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </dd>
      </div>

      <div>
        <dt className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
          Descripción
        </dt>
        <dd className="whitespace-pre-wrap">{data.descripcion}</dd>
      </div>

      {attachments.length > 0 && (
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
            Adjuntos
          </dt>
          <dd>
            <ul className="space-y-1.5">
              {attachments.map((a, i) => (
                <li key={`${a.name}-${i}`}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded border border-neutral-200 bg-neutral-50 px-3 py-1.5 hover:bg-neutral-100"
                  >
                    <span
                      aria-hidden="true"
                      className="text-base leading-none"
                    >
                      {isImageMime(a.mime) ? '🖼️' : '📄'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate underline">
                        {a.name}
                      </span>
                      <span className="block text-xs text-neutral-600">
                        {formatBytes(a.size)}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';

export type KPITypeBreakdown = {
  type_name: string;
  type_icon: string | null;
  count: number;
};

export type AdminKPIs = {
  pendientesMias: number;
  semana: number;
  vencidas: number;
  weekStartIso: string;
  topTypes: KPITypeBreakdown[];
};

type CardLinkProps = {
  href: string;
  title: string;
  value: number | string;
  hint?: string;
  badgeColor?: string;
};

function KPICard({ href, title, value, hint, badgeColor }: CardLinkProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-400 transition flex flex-col gap-2"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500 font-medium">
          {title}
        </p>
        {badgeColor && Number(value) > 0 ? (
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: badgeColor }}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <p
        className="text-3xl font-semibold"
        style={{ color: badgeColor && Number(value) > 0 ? badgeColor : '#1B3A5C' }}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
    </Link>
  );
}

export function AdminKPICards({ kpis }: { kpis: AdminKPIs }) {
  const maxTypeCount = kpis.topTypes.reduce((acc, t) => Math.max(acc, t.count), 0);

  return (
    <div className="grid gap-3 md:gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <KPICard
          href="/admin?pendientes=mias"
          title="Pendientes mías"
          value={kpis.pendientesMias}
          hint="Aprobaciones esperando tu decisión"
          badgeColor="#B45309"
        />
        <KPICard
          href={`/admin?desde=${encodeURIComponent(kpis.weekStartIso)}`}
          title="Esta semana"
          value={kpis.semana}
          hint="Solicitudes enviadas desde el lunes"
        />
        <KPICard
          href="/admin?vencidas=1"
          title="Vencidas"
          value={kpis.vencidas}
          hint="Más de 5 días sin resolver"
          badgeColor="#C0392B"
        />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-neutral-500 font-medium mb-3">
          Activas por tipo
        </p>
        {kpis.topTypes.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay solicitudes activas.</p>
        ) : (
          <ul className="space-y-2">
            {kpis.topTypes.map((t) => {
              const widthPct = maxTypeCount > 0 ? (t.count / maxTypeCount) * 100 : 0;
              return (
                <li key={t.type_name} className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5 w-44 shrink-0 truncate">
                    {t.type_icon ? <span aria-hidden="true">{t.type_icon}</span> : null}
                    <span className="truncate">{t.type_name}</span>
                  </span>
                  <div className="flex-1 h-2 bg-neutral-100 rounded">
                    <div
                      className="h-2 rounded"
                      style={{ width: `${widthPct}%`, background: '#1B3A5C' }}
                    />
                  </div>
                  <span className="w-8 text-right tabular-nums text-neutral-700">
                    {t.count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

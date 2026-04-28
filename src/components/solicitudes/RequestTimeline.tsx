import { ROLE_LABEL, isApprovalRole } from '@/lib/approvals/roles';
import type { ApprovalDecision } from '@/types/database';

export type TimelineApproval = {
  id: string;
  step_order: number;
  role_required: string | null;
  approver_name: string;
  decision: ApprovalDecision | null;
  decided_at: string | null;
  comments: string | null;
};

type Props = {
  approvals: TimelineApproval[];
  requesterName: string;
  createdAt: string;
};

function formatDateTime(s: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-PA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dotColor(decision: ApprovalDecision | null): string {
  switch (decision) {
    case 'Aprobada':
      return '#1A7F5A';
    case 'Rechazada':
      return '#C0392B';
    case 'Solicita Info':
      return '#B45309';
    default:
      return '#0A6EBD';
  }
}

function decisionLabel(decision: ApprovalDecision | null): string {
  if (!decision || decision === 'Pendiente') return 'Pendiente';
  return decision;
}

function roleLabel(role: string | null): string {
  if (!role) return '';
  if (isApprovalRole(role)) return ROLE_LABEL[role];
  return role;
}

export function RequestTimeline({ approvals, requesterName, createdAt }: Props) {
  const sorted = [...approvals].sort((a, b) => a.step_order - b.step_order);

  return (
    <ol className="relative space-y-6">
      {/* Created node (neutral) */}
      <li className="relative pl-8">
        <span
          className="absolute left-0 top-1 inline-block h-4 w-4 rounded-full border-2 border-white"
          style={{ background: '#5A6272' }}
          aria-hidden="true"
        />
        <span
          className="absolute left-2 top-5 bottom-[-1.5rem] w-px bg-neutral-200"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium">Solicitud creada</p>
          <p className="text-xs text-neutral-500 mt-0.5">por {requesterName}</p>
          <p className="text-xs text-neutral-500">{formatDateTime(createdAt)}</p>
        </div>
      </li>

      {sorted.map((a, idx) => {
        const isLast = idx === sorted.length - 1;
        return (
          <li key={a.id} className="relative pl-8">
            <span
              className="absolute left-0 top-1 inline-block h-4 w-4 rounded-full border-2 border-white"
              style={{ background: dotColor(a.decision) }}
              aria-hidden="true"
            />
            {!isLast && (
              <span
                className="absolute left-2 top-5 bottom-[-1.5rem] w-px bg-neutral-200"
                aria-hidden="true"
              />
            )}
            <div>
              <p className="text-sm font-medium">{a.approver_name}</p>
              {a.role_required && (
                <p className="text-xs text-neutral-500 mt-0.5">
                  {roleLabel(a.role_required)}
                </p>
              )}
              <p className="text-xs mt-1">
                <span
                  className="font-medium"
                  style={{ color: dotColor(a.decision) }}
                >
                  {decisionLabel(a.decision)}
                </span>
                {a.decided_at && (
                  <span className="text-neutral-500"> · {formatDateTime(a.decided_at)}</span>
                )}
              </p>
              {a.comments && (
                <p className="mt-2 text-sm bg-neutral-50 border border-neutral-200 rounded px-3 py-2 whitespace-pre-wrap">
                  {a.comments}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

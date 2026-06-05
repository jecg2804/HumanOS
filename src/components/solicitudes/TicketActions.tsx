'use client';
// Role-resolved action panel on the ticket detail. The page decides WHICH action the viewer may take
// (current approval gate vs a pending processing step); this renders it and calls the server action.
// The RPCs re-validate authoritatively (R5, S1 ordering, role) — if the UI offers something the RPC
// rejects, the error is surfaced, never a silent bad write.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { actOnApproval, processStep } from '@/lib/engines/vacaciones/actions';

export type TicketActionMode =
  | { kind: 'gate' }
  | { kind: 'process'; roleKind: 'received' | 'processed'; label: string };

export function TicketActions({
  ticketId,
  mode,
}: {
  ticketId: string;
  mode: TicketActionMode;
}) {
  const router = useRouter();
  const [comments, setComments] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        router.refresh();
        return;
      }
      setMessage(res.message ?? 'No se pudo completar la acción.');
    });
  };

  if (mode.kind === 'process') {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => run(() => processStep({ ticketId, roleKind: mode.roleKind }))}
          disabled={pending}
          className="bg-navy-500 text-white py-2.5 px-5 rounded-md font-medium disabled:opacity-50"
        >
          {pending ? 'Procesando…' : mode.label}
        </button>
        {message && (
          <p role="alert" className="text-sm text-red-600">
            {message}
          </p>
        )}
      </div>
    );
  }

  // Approval gate.
  return (
    <div className="space-y-3">
      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="Comentario (opcional)"
        rows={2}
        disabled={pending}
        className="w-full p-3 border rounded"
        aria-label="Comentario de la decisión"
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() =>
            run(() => actOnApproval({ ticketId, decision: 'Aprobada', comments: comments || undefined }))
          }
          disabled={pending}
          className="bg-green-700 text-white py-2.5 px-5 rounded-md font-medium disabled:opacity-50"
        >
          {pending ? '…' : 'Aprobar'}
        </button>
        <button
          type="button"
          onClick={() =>
            run(() => actOnApproval({ ticketId, decision: 'Rechazada', comments: comments || undefined }))
          }
          disabled={pending}
          className="bg-red-700 text-white py-2.5 px-5 rounded-md font-medium disabled:opacity-50"
        >
          {pending ? '…' : 'Rechazar'}
        </button>
      </div>
      {message && (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}

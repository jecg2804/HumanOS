'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { applyActDatosAction } from '@/lib/approvals/apply-act-datos';
import { decideApprovalAction } from '@/lib/approvals/decide';
import type { AppRole, RequestStatus } from '@/types/database';

export type RequestActionsContext = {
  request: {
    id: string;
    status: RequestStatus;
    requester_id: string;
    type_code: string;
  };
  me: {
    id: string;
    role: AppRole;
  };
  myPendingApprovalId: string | null;
};

export function RequestActions({ ctx }: { ctx: RequestActionsContext }) {
  const { request, me, myPendingApprovalId } = ctx;

  const isRequester = request.requester_id === me.id;
  const isHr = me.role === 'hr_admin';
  const canApply =
    isHr && request.status === 'Aprobada' && request.type_code === 'ACTUALIZACION_DATOS';
  const canDecide = myPendingApprovalId !== null;

  if (!canApply && !canDecide) {
    if (isRequester && request.status === 'Borrador') {
      return <p className="text-sm text-neutral-500">Acciones de borrador próximamente.</p>;
    }
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canDecide && myPendingApprovalId && (
        <DecideButtons approvalId={myPendingApprovalId} />
      )}
      {canApply && <ApplyButton requestId={request.id} />}
    </div>
  );
}

function DecideButtons({ approvalId }: { approvalId: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState<null | 'Aprobada' | 'Rechazada'>(null);
  const [comments, setComments] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!open) return;
    setError(null);
    const decision = open;
    startTransition(async () => {
      try {
        await decideApprovalAction({ approvalId, decision, comments });
        setOpen(null);
        setComments('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al decidir');
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen('Aprobada')} disabled={isPending}>
        Aprobar
      </Button>
      <Button variant="outline" onClick={() => setOpen('Rechazada')} disabled={isPending}>
        Rechazar
      </Button>
      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{open === 'Aprobada' ? 'Aprobar solicitud' : 'Rechazar solicitud'}</DialogTitle>
            <DialogDescription>
              {open === 'Aprobada'
                ? 'Confirma la aprobación. Puedes agregar un comentario opcional.'
                : 'Indica el motivo del rechazo. El solicitante recibirá tu comentario.'}
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            placeholder={open === 'Aprobada' ? 'Comentario (opcional)' : 'Motivo del rechazo'}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={isPending || (open === 'Rechazada' && comments.trim().length < 5)}
            >
              {isPending ? 'Procesando…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ApplyButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function apply() {
    setError(null);
    startTransition(async () => {
      try {
        await applyActDatosAction(requestId);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al aplicar');
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={isPending} style={{ background: '#1A7F5A' }}>
        Aplicar al expediente
      </Button>
      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar cambios al expediente</DialogTitle>
            <DialogDescription>
              Esto actualizará el perfil del empleado en <code>humanos.people</code> con los nuevos
              datos: dirección, celular, estado civil y número de dependientes. Los detalles de
              pareja y dependientes individuales se conservan en el historial de la solicitud pero
              no se aplican al expediente.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={apply} disabled={isPending} style={{ background: '#1A7F5A' }}>
              {isPending ? 'Aplicando…' : 'Confirmar y aplicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  step: number;
  totalSteps: number;
  children: React.ReactNode;
  onCancel: () => void;
  showCancel?: boolean;
}

export function WizardLayout({ step, totalSteps, children, onCancel, showCancel = true }: Props) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const router = useRouter();
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // FE-3 a11y: while the cancel-confirmation dialog is open, trap Tab inside it, close on Escape,
  // and restore focus to whatever was focused before (the "Cancelar y reiniciar" trigger).
  useEffect(() => {
    if (!confirmingCancel) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[0]?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmingCancel(false);
        return;
      }
      if (e.key === 'Tab' && focusables && focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [confirmingCancel]);

  const pct = Math.round((step / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-500 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-bold">HumanOS · Configuración inicial</div>
          <div className="text-xs opacity-80">
            Paso {step} de {totalSteps}
          </div>
        </div>
        {showCancel && (
          <button
            onClick={() => setConfirmingCancel(true)}
            className="text-sm underline hover:opacity-80"
          >
            Cancelar y reiniciar
          </button>
        )}
      </header>
      <div
        className="h-2 bg-gray-200"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso del onboarding: paso ${step} de ${totalSteps}`}
      >
        <div
          className="h-full bg-gold-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <main className="max-w-2xl mx-auto p-6">{children}</main>
      {confirmingCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="bg-white rounded-lg p-6 max-w-md"
          >
            <h2 id={titleId} className="text-lg font-bold">¿Salir del onboarding?</h2>
            <p className="text-sm text-gray-600 mt-2">
              Perderás todo el progreso. Tendrás que iniciar desde el primer paso la próxima vez.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setConfirmingCancel(false)}
                className="px-4 py-2 border rounded"
              >
                Continuar
              </button>
              <button
                onClick={() => {
                  onCancel();
                  router.push('/');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Sí, salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

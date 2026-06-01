'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/observability/report';

// FE-2: global error boundary (App Router). Must be a Client Component.
// Catches render/runtime errors in the segment below it and reports them.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { where: 'app/error.tsx', digest: error.digest });
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-navy-700">Algo salió mal</h1>
      <p className="text-sm text-neutral-500 max-w-md">
        Ocurrió un error inesperado. Puedes reintentar; si persiste, contacta a Recursos Humanos.
      </p>
      <button
        onClick={reset}
        className="mt-2 inline-block bg-navy-500 text-white px-5 py-2.5 rounded-md font-medium"
      >
        Reintentar
      </button>
    </main>
  );
}

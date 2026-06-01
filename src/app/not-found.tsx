import Link from 'next/link';

// FE-2: global 404 boundary (App Router). Renders for unmatched routes.
export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-bold text-navy-500">404</p>
      <h1 className="text-xl font-semibold text-navy-700">Página no encontrada</h1>
      <p className="text-sm text-neutral-500 max-w-md">
        La página que buscas no existe o fue movida.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 inline-block bg-navy-500 text-white px-5 py-2.5 rounded-md font-medium"
      >
        Volver al inicio
      </Link>
    </main>
  );
}

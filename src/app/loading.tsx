// FE-2: global loading boundary (App Router). Shown during route transitions
// while server components stream.
export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <span
        className="size-8 rounded-full border-4 border-navy-100 border-t-navy-500 animate-spin"
        aria-hidden="true"
      />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

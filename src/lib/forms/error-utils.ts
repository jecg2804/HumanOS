import type { FieldErrors, FieldValues } from 'react-hook-form';

/**
 * Recolecta todos los mensajes de error de un objeto de errores de React Hook Form,
 * caminando recursivamente por estructuras anidadas (objects + arrays). Devuelve
 * mensajes únicos en el orden en que aparecen.
 */
export function collectErrorMessages<T extends FieldValues>(
  errors: FieldErrors<T>,
): string[] {
  const out: string[] = [];
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    if (typeof obj.message === 'string') out.push(obj.message);
    for (const k of Object.keys(obj)) {
      if (k !== 'message' && k !== 'ref' && k !== 'type') walk(obj[k]);
    }
  }
  walk(errors);
  return Array.from(new Set(out));
}

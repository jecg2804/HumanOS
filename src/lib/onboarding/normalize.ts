export function normalizeNationalId(input: string): string {
  return input.trim().replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

export function normalizePhone(input: string): string {
  const stripped = input.replace(/[^\d+]/g, '');
  if (stripped.startsWith('+507') && stripped.length === 12) return stripped;
  if (/^\d{8}$/.test(stripped)) return `+507${stripped}`;
  throw new Error('Teléfono inválido. Usa formato +507XXXXXXXX o 8 dígitos.');
}

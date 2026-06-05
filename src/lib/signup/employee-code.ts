/**
 * SIGNUP-formula (ADR-0036 / PO-06) -- mirror TS PURO de la parte determinista del generador de
 * employee_code que vive en SQL (hr.generate_employee_code, migracion 091).
 *
 * Esto NO toca la base de datos. Solo cubre la derivacion determinista:
 *   employee_code base = 3 letras del apellido paterno (sin acentos, UPPER) + 3 ultimos digitos de la cedula.
 *   Ejemplo PO-06: apellido "CUCALON", cedula "8-930-2166" -> "CUC166".
 *
 * La resolucion de COLISIONES (bump determinista del ultimo char contra upper(employee_code)) vive
 * SOLO en SQL, porque necesita leer hr.people y el indice people_code_ci_unique es la garantia real
 * de unicidad. Aqui solo se prueba la formula base + la normalizacion -- la parte pura y testeable.
 *
 * El apellido es PARAMETRO (guardrail #11: nunca se deriva de full_name). Lo aporta el form hr_admin.
 */

/**
 * Normaliza un apellido a sus letras A-Z utiles: quita acentos/diacriticos del espanol, descarta
 * todo lo que no sea A-Z (espacios, guiones, apostrofes, digitos, caracteres no-espanoles) y pasa a
 * mayusculas. Espejo del translate() + regexp_replace() de la funcion SQL.
 */
export function normalizeSurnameLetters(apellido: string): string {
  // Mapa de diacriticos del espanol (vocales acentuadas/dieresis + n con tilde + c cedilla),
  // identico al translate() de hr.generate_employee_code. Decompone via NFD y luego elimina las
  // marcas combinantes residuales para cubrir cualquier acento que el mapa no liste.
  const stripped = apellido
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // quita marcas diacriticas combinantes
  return stripped.replace(/[^A-Za-z]/g, '').toUpperCase();
}

/**
 * Extrae los ultimos 3 digitos de una cedula, descartando guiones, espacios y letras de pasaporte.
 * Espejo del regexp_replace(p_national_id, '\D', '', 'g') + right(...,3) de la funcion SQL.
 */
export function lastThreeCedulaDigits(nationalId: string): string {
  const digits = nationalId.replace(/\D/g, '');
  return digits.slice(-3);
}

/**
 * Deriva el employee_code BASE (sin resolver colisiones). Lanza si el apellido no aporta al menos 3
 * letras utiles o si la cedula no aporta al menos 3 digitos -- las mismas precondiciones que el RAISE
 * de la funcion SQL (ERRCODE 22023). El bump de colision NO se aplica aqui (es responsabilidad del SQL).
 *
 * @param apellidoPaterno apellido paterno (parametro hr_admin; nunca derivado de full_name)
 * @param nationalId cedula tal cual la captura el form (con o sin guiones)
 * @returns el codigo base de 6 caracteres, ej. "CUC166"
 */
export function deriveEmployeeCodeBase(apellidoPaterno: string, nationalId: string): string {
  const letters = normalizeSurnameLetters(apellidoPaterno ?? '');
  if (letters.length < 3) {
    throw new Error(
      `apellido_paterno requiere al menos 3 letras utiles (recibido: ${apellidoPaterno})`,
    );
  }
  const digits = lastThreeCedulaDigits(nationalId ?? '');
  if (digits.length < 3) {
    throw new Error(`national_id requiere al menos 3 digitos (recibido: ${nationalId})`);
  }
  return `${letters.slice(0, 3)}${digits}`;
}

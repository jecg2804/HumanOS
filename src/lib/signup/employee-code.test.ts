import { describe, it, expect } from 'vitest';
import {
  normalizeSurnameLetters,
  lastThreeCedulaDigits,
  deriveEmployeeCodeBase,
} from './employee-code';

// SIGNUP-formula (ADR-0036 / PO-06). Cobertura del mirror TS PURO de la derivacion base de employee_code.
// La resolucion de colisiones (bump contra upper(employee_code)) vive solo en SQL (migracion 091) y se
// prueba con pgTAP -- aqui solo la parte pura (normalizacion + formula base), sin tocar la base de datos.

describe('normalizeSurnameLetters', () => {
  it('deja un apellido limpio en mayusculas', () => {
    expect(normalizeSurnameLetters('CUCALON')).toBe('CUCALON');
    expect(normalizeSurnameLetters('cucalon')).toBe('CUCALON');
  });

  it('quita acentos del espanol (vocales + n con tilde + dieresis)', () => {
    expect(normalizeSurnameLetters('Núñez')).toBe('NUNEZ');
    expect(normalizeSurnameLetters('Vásquez')).toBe('VASQUEZ');
    expect(normalizeSurnameLetters('Ábrego')).toBe('ABREGO');
    expect(normalizeSurnameLetters('Ñandú')).toBe('NANDU');
    expect(normalizeSurnameLetters('Güínez')).toBe('GUINEZ');
  });

  it('descarta espacios, guiones, apostrofes y digitos', () => {
    expect(normalizeSurnameLetters("  o'brien-")).toBe('OBRIEN');
    expect(normalizeSurnameLetters('De La Cruz')).toBe('DELACRUZ');
    // conserva TODAS las letras (la cedula '2' se descarta, pero 'do' permanece);
    // tomar solo las 3 primeras es trabajo de deriveEmployeeCodeBase, no de la normalizacion.
    expect(normalizeSurnameLetters('Saldaña 2do')).toBe('SALDANADO');
  });

  it('devuelve cadena vacia cuando no hay letras utiles', () => {
    expect(normalizeSurnameLetters('  -- 123 ')).toBe('');
    expect(normalizeSurnameLetters('')).toBe('');
  });
});

describe('lastThreeCedulaDigits', () => {
  it('toma los ultimos 3 digitos descartando guiones', () => {
    expect(lastThreeCedulaDigits('8-930-2166')).toBe('166');
    expect(lastThreeCedulaDigits('08-888-1234')).toBe('234');
  });

  it('descarta letras de pasaporte y espacios', () => {
    expect(lastThreeCedulaDigits('PE-9-55-8842')).toBe('842');
    expect(lastThreeCedulaDigits('  4 77 9001 ')).toBe('001');
  });

  it('devuelve menos de 3 cuando no hay suficientes digitos', () => {
    expect(lastThreeCedulaDigits('ab')).toBe('');
    expect(lastThreeCedulaDigits('1-2')).toBe('12');
  });
});

describe('deriveEmployeeCodeBase', () => {
  it('genera el codigo PO-06 canonico (CUCALON + 8-930-2166 -> CUC166)', () => {
    expect(deriveEmployeeCodeBase('CUCALON', '8-930-2166')).toBe('CUC166');
  });

  it('normaliza acentos de apellidos panamenos', () => {
    expect(deriveEmployeeCodeBase('Núñez', '08-888-1234')).toBe('NUN234');
    expect(deriveEmployeeCodeBase('Vásquez', 'PE-9-55-8842')).toBe('VAS842');
    expect(deriveEmployeeCodeBase('Ábrego', '8-1-2200')).toBe('ABR200');
    expect(deriveEmployeeCodeBase('Ñandú', '700')).toBe('NAN700');
  });

  it('toma solo las primeras 3 letras utiles de un apellido compuesto', () => {
    expect(deriveEmployeeCodeBase('De La Cruz', '1239')).toBe('DEL239');
    expect(deriveEmployeeCodeBase("  o'brien-", '12345')).toBe('OBR345');
  });

  it('acepta el limite exacto de 3 digitos de cedula', () => {
    expect(deriveEmployeeCodeBase('Ñandú', '700')).toBe('NAN700');
  });

  it('lanza si el apellido no aporta al menos 3 letras utiles', () => {
    expect(() => deriveEmployeeCodeBase('Ng', '8-930-2166')).toThrow(/al menos 3 letras/);
    expect(() => deriveEmployeeCodeBase('  - ', '8-930-2166')).toThrow(/al menos 3 letras/);
    expect(() => deriveEmployeeCodeBase('', '123')).toThrow(/al menos 3 letras/);
  });

  it('lanza si la cedula no aporta al menos 3 digitos', () => {
    expect(() => deriveEmployeeCodeBase('CUCALON', '8-9')).toThrow(/al menos 3 digitos/);
    expect(() => deriveEmployeeCodeBase('CUCALON', 'PE-ab')).toThrow(/al menos 3 digitos/);
    expect(() => deriveEmployeeCodeBase('CUCALON', '')).toThrow(/al menos 3 digitos/);
  });

  it('coincide con la funcion SQL para nombres del dominio espanol/Panama', () => {
    // Paridad con hr.generate_employee_code (migracion 091), verificada contra la BD live 2026-06-05.
    // La unica divergencia conocida es en caracteres NO espanoles (ej. la g-breve turca), fuera del
    // dominio de cedula-holders panamenos: el SQL los descarta enteros, NFD los reduce a su base latina.
    // El generador autoritativo es el SQL; este mirror es para preview/validacion del lado del cliente.
    const dominio: ReadonlyArray<[string, string, string]> = [
      ['CUCALON', '8-930-2166', 'CUC166'],
      ['Núñez', '08-888-1234', 'NUN234'],
      ['Vásquez', 'PE-9-55-8842', 'VAS842'],
      ['Ábrego', '8-1-2200', 'ABR200'],
      ['Ñandú', '700', 'NAN700'],
    ];
    for (const [apellido, cedula, esperado] of dominio) {
      expect(deriveEmployeeCodeBase(apellido, cedula)).toBe(esperado);
    }
  });
});

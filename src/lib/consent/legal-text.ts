// Ley 81 (R27) aviso de privacidad + consentimiento. BORRADOR - PENDIENTE DE REVISION LEGAL.
// Fuente unica de verdad: el texto renderizado en Step6Consent y el legal_version
// guardado en hr.consent salen de aqui, para que no puedan divergir.
// legal_version se incrementa SOLO si cambia el texto aprobado (no reusar version
// para copy distinto). Ver docs/superpowers/specs/2026-06-05-sec-consent-ley81-design.md.

export const LEY81_CONSENT_VERSION = 'ley81-onboarding-v1';

/**
 * Aviso de privacidad y consentimiento Ley 81 de 2019 (Panama).
 * Espanol neutro Panama, sin voseo (solo tu / tienes / puedes).
 * BORRADOR - PENDIENTE DE REVISION LEGAL.
 */
export const LEY81_AVISO_TITULO =
  'Aviso de privacidad y consentimiento (Ley 81 de 2019)';

export const LEY81_AVISO_BORRADOR_BADGE = 'BORRADOR - PENDIENTE DE REVISION LEGAL';

/** Parrafos del aviso, en orden de despliegue. */
export const LEY81_AVISO_PARRAFOS: ReadonlyArray<{
  heading: string | null;
  body: string;
}> = [
  {
    heading: null,
    body: 'Ingenieria Continental, S.A. (ICONSA), como responsable del tratamiento, recolecta y trata tus datos personales conforme a la Ley 81 de 26 de marzo de 2019 sobre Proteccion de Datos Personales de la Republica de Panama y su reglamento (Decreto Ejecutivo 285 de 2021).',
  },
  {
    heading: 'Que datos tratamos y para que?',
    body: 'Recopilamos tus datos de identificacion, contacto, direccion, contacto de emergencia e informacion medica con la finalidad de gestionar tu relacion laboral, cumplir obligaciones legales y laborales, y poder asistirte ante una emergencia. No usaremos tus datos para fines distintos a los aqui declarados.',
  },
  {
    heading: 'Datos sensibles (salud).',
    body: 'Tu informacion medica (tipo de sangre, alergias, condiciones, medicamentos, aseguradora, numero de CSS) es un dato sensible. La Ley 81 exige tu consentimiento previo, expreso e informado para tratarla. Solo tu y el personal de Recursos Humanos autorizado pueden acceder a ella.',
  },
  {
    heading: 'Tus derechos.',
    body: 'En cualquier momento puedes solicitar el acceso, la rectificacion, la cancelacion o la oposicion al tratamiento de tus datos (derechos ARCO), asi como revocar este consentimiento, escribiendo a Recursos Humanos. La revocacion no afecta la licitud del tratamiento previo.',
  },
  {
    heading: 'Conservacion.',
    body: 'Conservamos tus datos mientras dure la relacion laboral y, posteriormente, solo por el plazo que exijan las obligaciones legales aplicables; cumplido ese plazo se eliminan o anonimizan.',
  },
  {
    heading: null,
    body: 'Al marcar las casillas siguientes, declaras que has leido y comprendido este aviso y otorgas tu consentimiento libre, informado y expreso.',
  },
];

/**
 * Texto de cada casilla de consentimiento, mapeado al scope de hr.consent.
 * Tres casillas separadas, no-bundled, ninguna pre-marcada (granular: la Ley 81
 * prohibe el bundling para datos de salud, por eso el scope medical va aparte).
 */
export const LEY81_CHECKBOXES: ReadonlyArray<{
  /** Llave timestamped en WizardState (espejo de ack_*_at). */
  stateKey: 'consent_data_processing_at' | 'consent_emergency_at' | 'consent_medical_at';
  /** Scope que escribe hr.complete_onboarding_writes -> hr.consent. */
  scope: 'data_processing' | 'emergency_contact' | 'medical';
  /** Etiqueta visible. Marca con `**...**` la frase a resaltar (renderizada como <strong>). */
  label: string;
}> = [
  {
    stateKey: 'consent_data_processing_at',
    scope: 'data_processing',
    label:
      'Otorgo mi consentimiento para el tratamiento de mis datos personales conforme a este aviso.',
  },
  {
    stateKey: 'consent_emergency_at',
    scope: 'emergency_contact',
    label:
      'Otorgo mi consentimiento para el tratamiento de los datos de mi **contacto de emergencia**.',
  },
  {
    stateKey: 'consent_medical_at',
    scope: 'medical',
    label:
      'Otorgo mi consentimiento expreso para el tratamiento de mi **informacion medica** con fines de emergencia y gestion laboral.',
  },
];

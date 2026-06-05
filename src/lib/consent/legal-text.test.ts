import { describe, it, expect } from 'vitest';
import {
  LEY81_CONSENT_VERSION,
  LEY81_AVISO_TITULO,
  LEY81_AVISO_BORRADOR_BADGE,
  LEY81_AVISO_PARRAFOS,
  LEY81_CHECKBOXES,
} from './legal-text';
import {
  initialState,
  wizardReducer,
  type WizardState,
} from '@/components/onboarding/WizardReducer';

// SEC-CONSENT (ADR-0035 / R27 Ley 81). Pure consent-logic coverage:
//  - legal-text.ts is the single source of truth (version pinned, no voseo, the
//    three required scopes present + mapped to wizard state keys).
//  - the action's consent param mapping: wizard timestamp state -> the boolean
//    params completeOnboardingAction passes to hr.complete_onboarding_writes,
//    derived from the LEY81_CHECKBOXES stateKey mapping (the real contract the
//    Step10 -> action wiring follows, spec §5g) + the pinned legal_version.

const SCOPES_THIS_SLICE = ['data_processing', 'emergency_contact', 'medical'] as const;

/**
 * Mirror of the action's consent param mapping (spec §5f/§5g): for each consent
 * checkbox, a non-null timestamp in WizardState means the box was marked -> the
 * boolean param is true; consent_legal_version is always the pinned version so the
 * persisted legal_version cannot drift from the rendered copy. Driven by the real
 * LEY81_CHECKBOXES stateKey->scope mapping (no hardcoded keys).
 */
function mapConsentParams(state: WizardState) {
  const byScope = (scope: (typeof SCOPES_THIS_SLICE)[number]): boolean => {
    const cb = LEY81_CHECKBOXES.find((c) => c.scope === scope);
    if (!cb) throw new Error(`missing checkbox for scope ${scope}`);
    return !!state[cb.stateKey];
  };
  return {
    consent_data_processing: byScope('data_processing'),
    consent_emergency: byScope('emergency_contact'),
    consent_medical: byScope('medical'),
    consent_legal_version: LEY81_CONSENT_VERSION,
  };
}

describe('LEY81 consent legal-text (source of truth)', () => {
  it('pins a content-versioned legal_version string', () => {
    expect(LEY81_CONSENT_VERSION).toBe('ley81-onboarding-v1');
    expect(LEY81_CONSENT_VERSION).toMatch(/^ley81-/);
  });

  it('is flagged as draft pending legal review', () => {
    expect(LEY81_AVISO_BORRADOR_BADGE).toMatch(/BORRADOR/);
    expect(LEY81_AVISO_BORRADOR_BADGE).toMatch(/REVISION LEGAL/i);
  });

  it('cites Ley 81 de 2019 in the title', () => {
    expect(LEY81_AVISO_TITULO).toMatch(/Ley 81 de 2019/);
  });

  it('names ICONSA as responsable + covers sensitive health + ARCO rights', () => {
    const fullText = LEY81_AVISO_PARRAFOS.map((p) => `${p.heading ?? ''} ${p.body}`).join(' ');
    expect(fullText).toMatch(/ICONSA/);
    expect(fullText.toLowerCase()).toMatch(/sensible/);
    expect(fullText).toMatch(/ARCO/);
  });

  it('exposes exactly the three required consent checkboxes for this slice', () => {
    expect(LEY81_CHECKBOXES).toHaveLength(3);
    const scopes = LEY81_CHECKBOXES.map((c) => c.scope).sort();
    expect(scopes).toEqual([...SCOPES_THIS_SLICE].sort());
  });

  it('does NOT bundle photo_image (sensitive consent stays granular)', () => {
    const scopes = LEY81_CHECKBOXES.map((c) => c.scope);
    expect(scopes).not.toContain('photo_image');
  });

  it('maps each checkbox to a distinct WizardState consent timestamp key', () => {
    const keys = LEY81_CHECKBOXES.map((c) => c.stateKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key in initialState).toBe(true);
    }
  });

  it('checkbox labels + body are neutral-Panama, no voseo', () => {
    const text = [
      ...LEY81_CHECKBOXES.map((c) => c.label),
      ...LEY81_AVISO_PARRAFOS.map((p) => p.body),
    ].join(' ');
    // anti-voseo (R6 / H9): reject argentine voseo forms (accented vowel marks vos
    // vs tú: "tenés/podés/debés" vs "tienes/puedes/debes"; "aceptá/otorgá" vs
    // "acepta/otorga"). Must not false-positive on the correct tú forms.
    expect(text).not.toMatch(/\b(tenés|podés|debés|querés|aceptá|otorgá|registrá|verificá)\b/iu);
    // tú-form present.
    expect(text.toLowerCase()).toMatch(/\b(tus|tu|puedes)\b/u);
  });
});

describe('consent param mapping (wizard state -> action params, spec §5g)', () => {
  it('all three consents given -> all booleans true + pinned legal_version', () => {
    const ts = '2026-06-05T12:00:00.000Z';
    const state: WizardState = {
      ...initialState,
      consent_data_processing_at: ts,
      consent_emergency_at: ts,
      consent_medical_at: ts,
    };
    expect(mapConsentParams(state)).toEqual({
      consent_data_processing: true,
      consent_emergency: true,
      consent_medical: true,
      consent_legal_version: 'ley81-onboarding-v1',
    });
  });

  it('initialState (no consent) -> all booleans false', () => {
    const params = mapConsentParams(initialState);
    expect(params.consent_data_processing).toBe(false);
    expect(params.consent_emergency).toBe(false);
    expect(params.consent_medical).toBe(false);
    // version is always sent regardless of checkbox state.
    expect(params.consent_legal_version).toBe('ley81-onboarding-v1');
  });

  it('missing medical timestamp -> consent_medical false (would fail the RPC guard)', () => {
    const ts = '2026-06-05T12:00:00.000Z';
    const state: WizardState = {
      ...initialState,
      consent_data_processing_at: ts,
      consent_emergency_at: ts,
      consent_medical_at: null,
    };
    const params = mapConsentParams(state);
    expect(params.consent_medical).toBe(false);
    expect(params.consent_data_processing).toBe(true);
    expect(params.consent_emergency).toBe(true);
  });
});

describe('wizardReducer consent ACK', () => {
  it('initialState has the three consent timestamps null (no pre-marcado)', () => {
    expect(initialState.consent_data_processing_at).toBeNull();
    expect(initialState.consent_emergency_at).toBeNull();
    expect(initialState.consent_medical_at).toBeNull();
  });

  it('ACK on a consent key sets its timestamp (reuses the timestamped mechanism)', () => {
    const ts = '2026-06-05T12:00:00.000Z';
    const next = wizardReducer(initialState, {
      type: 'ACK',
      key: 'consent_medical_at',
      at: ts,
    });
    expect(next.consent_medical_at).toBe(ts);
    // other consents untouched.
    expect(next.consent_emergency_at).toBeNull();
    expect(next.consent_data_processing_at).toBeNull();
  });

  it('ACK sets each consent key independently', () => {
    const ts = '2026-06-05T12:00:00.000Z';
    let s = wizardReducer(initialState, { type: 'ACK', key: 'consent_data_processing_at', at: ts });
    s = wizardReducer(s, { type: 'ACK', key: 'consent_emergency_at', at: ts });
    s = wizardReducer(s, { type: 'ACK', key: 'consent_medical_at', at: ts });
    expect(s.consent_data_processing_at).toBe(ts);
    expect(s.consent_emergency_at).toBe(ts);
    expect(s.consent_medical_at).toBe(ts);
  });
});

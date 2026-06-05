'use client';
import { useState, useId } from 'react';
import { ConsentSchema } from '@/lib/onboarding/validation';
import {
  LEY81_AVISO_TITULO,
  LEY81_AVISO_BORRADOR_BADGE,
  LEY81_AVISO_PARRAFOS,
  LEY81_CHECKBOXES,
} from '@/lib/consent/legal-text';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

/**
 * SEC-CONSENT (ADR-0035 / R27 Ley 81) - paso de consentimiento explícito.
 * Va ANTES de los pasos que capturan datos sensibles (emergencia/médicos).
 * Clona Step9Acknowledgments: heading navy, cards de checkbox, botón navy,
 * error role="alert". Las tres casillas son requeridas para avanzar
 * (los pasos de datos siguen siendo opcionales).
 */
export function Step6Consent({ state, dispatch }: Props) {
  const [error, setError] = useState<string | null>(null);
  const avisoId = useId();

  const handleNext = () => {
    const r = ConsentSchema.safeParse({
      consent_data_processing: !!state.consent_data_processing_at,
      consent_emergency: !!state.consent_emergency_at,
      consent_medical: !!state.consent_medical_at,
    });
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Debes otorgar los consentimientos para continuar');
      return;
    }
    setError(null);
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-navy-500">Consentimiento de datos personales</h1>
      <p className="text-gray-700">
        Antes de continuar, lee el aviso de privacidad y otorga tu consentimiento. Es un requisito de
        la Ley 81 de 2019 (Protección de Datos Personales de Panamá).
      </p>

      <article
        id={avisoId}
        className="max-h-72 overflow-y-auto border rounded-md p-4 bg-gray-50 space-y-3 text-sm text-gray-700"
      >
        <div>
          <h2 className="font-semibold text-navy-500">{LEY81_AVISO_TITULO}</h2>
          <p className="text-xs font-medium text-gold-700 mt-1">{LEY81_AVISO_BORRADOR_BADGE}</p>
        </div>
        {LEY81_AVISO_PARRAFOS.map((p, i) => (
          <p key={i}>
            {p.heading && <span className="font-medium text-navy-500">{p.heading} </span>}
            {p.body}
          </p>
        ))}
      </article>

      {LEY81_CHECKBOXES.map((cb) => (
        <label
          key={cb.stateKey}
          className="flex items-start gap-3 p-4 border rounded-md cursor-pointer"
        >
          <input
            type="checkbox"
            checked={!!state[cb.stateKey]}
            aria-describedby={avisoId}
            onChange={(e) =>
              dispatch({
                type: 'ACK',
                key: cb.stateKey,
                at: e.target.checked ? new Date().toISOString() : '',
              })
            }
            className="mt-1"
          />
          <div>
            <p className="text-sm text-gray-700">{renderConsentLabel(cb.label)}</p>
          </div>
        </label>
      ))}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => dispatch({ type: 'PREV_STEP' })}
          className="px-4 py-2 border rounded"
        >
          Atrás
        </button>
        <button onClick={handleNext} className="flex-1 bg-navy-500 text-white py-3 rounded-md">
          Continuar
        </button>
      </div>
    </section>
  );
}

/** Renderiza una etiqueta con segmentos `**resaltados**` como <strong>. */
function renderConsentLabel(label: string): React.ReactNode {
  return label.split(/(\*\*[^*]+\*\*)/g).map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**')) {
      return <strong key={i}>{seg.slice(2, -2)}</strong>;
    }
    return <span key={i}>{seg}</span>;
  });
}

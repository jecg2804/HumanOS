'use client';
import { useState } from 'react';
import { Step6Schema } from '@/lib/onboarding/validation';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function Step6Emergency({ state, dispatch }: Props) {
  const [error, setError] = useState<string | null>(null);
  const update = (key: keyof typeof state.emergency, value: string) =>
    dispatch({ type: 'SET_NESTED', section: 'emergency', key, value });

  const handleNext = () => {
    const r = Step6Schema.safeParse(state.emergency);
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setError(null);
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Contacto de emergencia</h1>
      <p className="text-gray-700">
        ¿A quién debemos contactar en caso de emergencia? Esta información solo es visible para
        RRHH y para ti.
      </p>
      <FormField
        label="Nombre completo"
        value={state.emergency.contact_name}
        onChange={(v) => update('contact_name', v)}
      />
      <FormField
        label="Parentesco"
        value={state.emergency.relationship}
        onChange={(v) => update('relationship', v)}
        placeholder="madre, esposa, hermano…"
      />
      <FormField
        label="Teléfono principal"
        value={state.emergency.phone}
        onChange={(v) => update('phone', v)}
        placeholder="+50761234567"
        type="tel"
      />
      <FormField
        label="Teléfono alternativo (opcional)"
        value={state.emergency.phone_alt}
        onChange={(v) => update('phone_alt', v)}
        type="tel"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => dispatch({ type: 'PREV_STEP' })}
          className="px-4 py-2 border rounded"
        >
          Atrás
        </button>
        <button
          onClick={handleNext}
          className="flex-1 bg-[#1B3A5C] text-white py-3 rounded-md"
        >
          Continuar
        </button>
      </div>
    </section>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 border rounded-md"
      />
    </div>
  );
}

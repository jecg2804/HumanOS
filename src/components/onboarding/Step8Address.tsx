'use client';
import { useState } from 'react';
import { Step8Schema } from '@/lib/onboarding/validation';
import type { WizardState, WizardAction } from './WizardReducer';

const PROVINCES = [
  'Bocas del Toro',
  'Chiriquí',
  'Coclé',
  'Colón',
  'Darién',
  'Herrera',
  'Los Santos',
  'Panamá',
  'Panamá Oeste',
  'Veraguas',
  'Comarca Emberá',
  'Comarca Guna Yala',
  'Comarca Ngäbe-Buglé',
];

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function Step8Address({ state, dispatch }: Props) {
  const [error, setError] = useState<string | null>(null);
  const update = (key: keyof typeof state.address, value: string) =>
    dispatch({ type: 'SET_NESTED', section: 'address', key, value });

  const handleNext = () => {
    const r = Step8Schema.safeParse(state.address);
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setError(null);
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Tu dirección</h1>
      <p className="text-gray-700">Dónde vives actualmente.</p>
      <input
        placeholder="Calle, casa, apartamento"
        value={state.address.street}
        onChange={(e) => update('street', e.target.value)}
        className="w-full p-3 border rounded"
      />
      <input
        placeholder="Barrio o corregimiento"
        value={state.address.neighborhood}
        onChange={(e) => update('neighborhood', e.target.value)}
        className="w-full p-3 border rounded"
      />
      <input
        placeholder="Ciudad"
        value={state.address.city}
        onChange={(e) => update('city', e.target.value)}
        className="w-full p-3 border rounded"
      />
      <div>
        <label className="block text-sm font-medium mb-1">Provincia</label>
        <select
          value={state.address.province}
          onChange={(e) => update('province', e.target.value)}
          className="w-full p-3 border rounded"
        >
          <option value="">Selecciona provincia…</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <input
        placeholder="Código postal (opcional)"
        value={state.address.postal_code}
        onChange={(e) => update('postal_code', e.target.value)}
        className="w-full p-3 border rounded"
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

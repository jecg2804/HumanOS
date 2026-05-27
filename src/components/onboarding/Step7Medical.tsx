'use client';
import { useState } from 'react';
import { Step7Schema } from '@/lib/onboarding/validation';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

const BLOOD_TYPES = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function Step7Medical({ state, dispatch }: Props) {
  const [error, setError] = useState<string | null>(null);
  const update = (key: string, value: string) =>
    dispatch({ type: 'SET_NESTED', section: 'medical', key, value });

  const handleNext = () => {
    const r = Step7Schema.safeParse(state.medical);
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setError(null);
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Información médica</h1>
      <p className="text-gray-700">
        Todos los campos son opcionales. Esta información es muy sensible y solo accesible por ti
        y RRHH. Útil en caso de emergencia.
      </p>
      <div>
        <label className="block text-sm font-medium mb-1">Tipo de sangre</label>
        <select
          value={state.medical.blood_type ?? ''}
          onChange={(e) => update('blood_type', e.target.value)}
          className="w-full p-3 border rounded"
        >
          {BLOOD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t || 'No especificado'}
            </option>
          ))}
        </select>
      </div>
      <textarea
        placeholder="Alergias"
        value={state.medical.allergies ?? ''}
        onChange={(e) => update('allergies', e.target.value)}
        className="w-full p-3 border rounded"
        rows={2}
      />
      <textarea
        placeholder="Condiciones crónicas (diabetes, hipertensión, asma…)"
        value={state.medical.chronic_conditions ?? ''}
        onChange={(e) => update('chronic_conditions', e.target.value)}
        className="w-full p-3 border rounded"
        rows={2}
      />
      <textarea
        placeholder="Medicamentos actuales"
        value={state.medical.current_medications ?? ''}
        onChange={(e) => update('current_medications', e.target.value)}
        className="w-full p-3 border rounded"
        rows={2}
      />
      <input
        placeholder="Nombre del médico de cabecera"
        value={state.medical.doctor_name ?? ''}
        onChange={(e) => update('doctor_name', e.target.value)}
        className="w-full p-3 border rounded"
      />
      <input
        placeholder="Teléfono del médico"
        value={state.medical.doctor_phone ?? ''}
        onChange={(e) => update('doctor_phone', e.target.value)}
        className="w-full p-3 border rounded"
      />
      <input
        placeholder="Aseguradora"
        value={state.medical.medical_insurance_provider ?? ''}
        onChange={(e) => update('medical_insurance_provider', e.target.value)}
        className="w-full p-3 border rounded"
      />
      <input
        placeholder="Número de póliza"
        value={state.medical.medical_insurance_number ?? ''}
        onChange={(e) => update('medical_insurance_number', e.target.value)}
        className="w-full p-3 border rounded"
      />
      <input
        placeholder="CSS"
        value={state.medical.css_number ?? ''}
        onChange={(e) => update('css_number', e.target.value)}
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

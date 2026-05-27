'use client';
import { useState } from 'react';
import type { WizardState, WizardAction, ProfilePreview } from './WizardReducer';
import { HayErrorModal } from './HayErrorModal';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  preview: ProfilePreview;
}

export function Step5Confirm({ state, dispatch, preview }: Props) {
  const [showErrorModal, setShowErrorModal] = useState(false);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Confirma tus datos</h1>
      <p className="text-gray-700">
        Verifica que los datos registrados en HumanOS sean correctos. Si algo está incorrecto,
        reporta el error a RRHH.
      </p>
      <dl className="bg-white border rounded-md divide-y">
        <Row label="Nombre completo" value={preview.full_name} />
        <Row label="Cargo" value={preview.position} />
        <Row label="Departamento" value={preview.department} />
        <Row label="Supervisor" value={preview.supervisor_name ?? 'Sin asignar'} />
        <Row label="Ubicación" value={preview.office} />
        <Row label="Fecha de ingreso" value={preview.hire_date} />
        <Row label="Tipo de contrato" value={preview.employment_type} />
      </dl>
      {state.validated?.existing_multi_app_user && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
          Detectamos que ya tienes cuenta de ICONSA registrada con{' '}
          <strong>{state.validated.existing_email_masked}</strong>. Tu contraseña actual sigue
          válida y la usarás también para HumanOS.
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => dispatch({ type: 'PREV_STEP' })}
          className="px-4 py-2 border rounded"
        >
          Atrás
        </button>
        <button
          onClick={() => setShowErrorModal(true)}
          className="px-4 py-2 border border-red-300 text-red-700 rounded"
        >
          Hay un error
        </button>
        <button
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
          className="flex-1 bg-[#1B3A5C] text-white py-3 rounded-md font-medium"
        >
          Todo correcto, continuar
        </button>
      </div>
      {showErrorModal && (
        <HayErrorModal
          state={state}
          dispatch={dispatch}
          onClose={() => setShowErrorModal(false)}
        />
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between p-3">
      <dt className="text-gray-600">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

'use client';
import { useReducer, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { wizardReducer, initialState } from '@/components/onboarding/WizardReducer';
import { WizardLayout } from '@/components/onboarding/WizardLayout';
import { Step1Code } from '@/components/onboarding/Step1Code';
import { Step2Identity } from '@/components/onboarding/Step2Identity';
import { Step3Identifier } from '@/components/onboarding/Step3Identifier';
import { Step4Password } from '@/components/onboarding/Step4Password';
import { Step5Confirm } from '@/components/onboarding/Step5Confirm';
import { Step6Emergency } from '@/components/onboarding/Step6Emergency';
import { Step7Medical } from '@/components/onboarding/Step7Medical';
import { Step8Address } from '@/components/onboarding/Step8Address';
import { Step9Acknowledgments } from '@/components/onboarding/Step9Acknowledgments';
import { Step10PhotoConfirm } from '@/components/onboarding/Step10PhotoConfirm';

export function Wizard({ initialCode }: { initialCode: string }) {
  const [state, dispatch] = useReducer(wizardReducer, {
    ...initialState,
    code: initialCode.toUpperCase(),
  });
  const router = useRouter();

  useEffect(() => {
    if (state.pausedDueToCriticalError) {
      router.push('/onboarding/error-reported');
    }
  }, [state.pausedDueToCriticalError, router]);

  const renderStep = () => {
    if (!state.validated && state.step >= 4) {
      return <p className="text-red-600">Estado inválido. Reinicia el onboarding.</p>;
    }
    switch (state.step) {
      case 1:
        return <Step1Code state={state} dispatch={dispatch} />;
      case 2:
        return <Step2Identity state={state} dispatch={dispatch} />;
      case 3:
        return <Step3Identifier state={state} dispatch={dispatch} />;
      case 4:
        return <Step4Password state={state} dispatch={dispatch} />;
      case 5:
        return (
          <Step5Confirm
            state={state}
            dispatch={dispatch}
            preview={state.validated!.preview}
          />
        );
      case 6:
        return <Step6Emergency state={state} dispatch={dispatch} />;
      case 7:
        return <Step7Medical state={state} dispatch={dispatch} />;
      case 8:
        return <Step8Address state={state} dispatch={dispatch} />;
      case 9:
        return <Step9Acknowledgments state={state} dispatch={dispatch} />;
      case 10:
        return <Step10PhotoConfirm state={state} dispatch={dispatch} />;
      default:
        return null;
    }
  };

  return (
    <WizardLayout
      step={state.step}
      totalSteps={10}
      onCancel={() => dispatch({ type: 'RESET' })}
    >
      {renderStep()}
    </WizardLayout>
  );
}

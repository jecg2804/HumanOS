'use client';

export interface ProfilePreview {
  full_name: string;
  position: string;
  department: string;
  supervisor_name: string | null;
  office: string;
  hire_date: string;
  employment_type: string;
}

export interface ValidatedContext {
  person_id: string;
  display_name: string;
  invite_id: string;
  normalized_target: string;
  target_field: 'email' | 'phone';
  preview: ProfilePreview;
  // Batch 3 NEW.A: HMAC token for reportOnboardingErrorAction validation.
  // Multi-app detection (existing_multi_app_user/existing_email_masked) was
  // removed — those leaked a cross-app enumeration oracle. Detection now
  // happens silently inside completeOnboardingAction.
  token: string;
}

export interface WizardState {
  step: number;
  validated: ValidatedContext | null;
  code: string;
  cedula: string;
  employee_code: string;
  delivery_target: string;
  password: string;
  emergency: {
    contact_name: string;
    relationship: string;
    phone: string;
    phone_alt: string;
  };
  medical: Record<string, string>;
  address: {
    street: string;
    neighborhood: string;
    city: string;
    province: string;
    postal_code: string;
  };
  ack_ethics_at: string | null;
  ack_child_labor_at: string | null;
  photo_path: string | null;
  pausedDueToCriticalError: boolean;
}

export const initialState: WizardState = {
  step: 1,
  validated: null,
  code: '',
  cedula: '',
  employee_code: '',
  delivery_target: '',
  password: '',
  emergency: { contact_name: '', relationship: '', phone: '', phone_alt: '' },
  medical: {},
  address: { street: '', neighborhood: '', city: '', province: '', postal_code: '' },
  ack_ethics_at: null,
  ack_child_labor_at: null,
  photo_path: null,
  pausedDueToCriticalError: false,
};

export type WizardAction =
  | { type: 'SET_FIELD'; key: keyof WizardState; value: WizardState[keyof WizardState] }
  | { type: 'SET_NESTED'; section: 'emergency' | 'address' | 'medical'; key: string; value: string }
  | {
      type: 'VALIDATED';
      payload: ValidatedContext;
      code: string;
      cedula: string;
      employee_code: string;
      delivery_target: string;
    }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO'; step: number }
  | { type: 'SET_PHOTO'; path: string }
  | { type: 'ACK'; key: 'ack_ethics_at' | 'ack_child_labor_at'; at: string }
  | { type: 'PAUSE_CRITICAL_ERROR' }
  | { type: 'RESET' };

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.key]: action.value };
    case 'SET_NESTED':
      return {
        ...state,
        [action.section]: { ...state[action.section], [action.key]: action.value },
      };
    case 'VALIDATED':
      // Batch 3 NEW.A: always advance to step 4 (password). Previous skip-to-5
      // shortcut for multi-app users leaked existence info; tradeoff accepted
      // per audit. Password step now shown to all; multi-app merge silent
      // in completeOnboardingAction.
      return {
        ...state,
        validated: action.payload,
        code: action.code,
        cedula: action.cedula,
        employee_code: action.employee_code,
        delivery_target: action.delivery_target,
        step: 4,
      };
    case 'NEXT_STEP':
      return { ...state, step: Math.min(state.step + 1, 10) };
    case 'PREV_STEP':
      return { ...state, step: Math.max(state.step - 1, 1) };
    case 'GO_TO':
      return { ...state, step: action.step };
    case 'SET_PHOTO':
      return { ...state, photo_path: action.path };
    case 'ACK':
      return { ...state, [action.key]: action.at };
    case 'PAUSE_CRITICAL_ERROR':
      return { ...state, pausedDueToCriticalError: true };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

'use client';

export interface ValidatedContext {
  person_id: string;
  display_name: string;
  invite_id: string;
  existing_multi_app_user: boolean;
  existing_email_masked: string | null;
  normalized_target: string;
  target_field: 'email' | 'phone';
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
      return {
        ...state,
        validated: action.payload,
        code: action.code,
        cedula: action.cedula,
        employee_code: action.employee_code,
        delivery_target: action.delivery_target,
        step: action.payload.existing_multi_app_user ? 5 : 4,
      };
    case 'NEXT_STEP': {
      let next = state.step + 1;
      if (next === 4 && state.validated?.existing_multi_app_user) next = 5;
      return { ...state, step: Math.min(next, 10) };
    }
    case 'PREV_STEP': {
      let prev = state.step - 1;
      if (prev === 4 && state.validated?.existing_multi_app_user) prev = 3;
      return { ...state, step: Math.max(prev, 1) };
    }
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

'use client';
import { useActionState, useState } from 'react';
import { CatalogComboboxField } from './CatalogComboboxField';
import {
  createEmployeeAction,
  updateEmployeeAction,
} from '@/lib/admin/employees-actions';

interface CatalogOption {
  id: string;
  label: string;
}

export interface EmployeeFormValues {
  person_id?: string;
  full_name: string;
  national_id: string;
  employee_code: string;
  position_id: string;
  position_text: string;
  department_id: string;
  department_text: string;
  office_id: string;
  office_text: string;
  supervisor_id: string;
  hire_date: string;
  app_role: 'employee' | 'hr_admin' | 'president' | 'admin';
  employment_type_id: string;
  delivery_target: string;
}

interface Props {
  mode: 'create' | 'edit';
  defaultValues?: Partial<EmployeeFormValues>;
  positions: CatalogOption[];
  departments: CatalogOption[];
  offices: CatalogOption[];
  supervisors: CatalogOption[];
  employmentTypes: CatalogOption[];
}

type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: unknown;
};
const initialState: FormState = { ok: false };

const initialValues: EmployeeFormValues = {
  full_name: '',
  national_id: '',
  employee_code: '',
  position_id: '',
  position_text: '',
  department_id: '',
  department_text: '',
  office_id: '',
  office_text: '',
  supervisor_id: '',
  hire_date: '',
  app_role: 'employee',
  employment_type_id: '',
  delivery_target: '',
};

export function EmployeeForm({
  mode,
  defaultValues,
  positions,
  departments,
  offices,
  supervisors,
  employmentTypes,
}: Props) {
  const [values, setValues] = useState<EmployeeFormValues>({
    ...initialValues,
    ...defaultValues,
  });
  const action = mode === 'create' ? createEmployeeAction : updateEmployeeAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const set = <K extends keyof EmployeeFormValues>(k: K, v: EmployeeFormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      {mode === 'edit' && (
        <input type="hidden" name="person_id" value={values.person_id ?? ''} />
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Nombre completo"
          name="full_name"
          value={values.full_name}
          onChange={(v) => set('full_name', v)}
          required
        />
        <Field
          label="Cédula"
          name="national_id"
          value={values.national_id}
          onChange={(v) => set('national_id', v)}
          required
        />
        <Field
          label="Código de empleado (opcional)"
          name="employee_code"
          value={values.employee_code}
          onChange={(v) => set('employee_code', v.toUpperCase())}
        />
        <Field
          label="Fecha de ingreso"
          name="hire_date"
          type="date"
          value={values.hire_date}
          onChange={(v) => set('hire_date', v)}
          required
        />
      </div>

      <CatalogComboboxField
        label="Cargo"
        options={positions}
        selectedId={values.position_id}
        freeText={values.position_text}
        onSelectId={(id) => {
          set('position_id', id);
          set('position_text', '');
        }}
        onFreeText={(t) => {
          set('position_text', t);
          set('position_id', '');
        }}
      />
      <input type="hidden" name="position_id" value={values.position_id} />
      <input type="hidden" name="position_text" value={values.position_text} />

      <CatalogComboboxField
        label="Departamento"
        options={departments}
        selectedId={values.department_id}
        freeText={values.department_text}
        onSelectId={(id) => {
          set('department_id', id);
          set('department_text', '');
        }}
        onFreeText={(t) => {
          set('department_text', t);
          set('department_id', '');
        }}
      />
      <input type="hidden" name="department_id" value={values.department_id} />
      <input type="hidden" name="department_text" value={values.department_text} />

      <CatalogComboboxField
        label="Ubicación"
        options={offices}
        selectedId={values.office_id}
        freeText={values.office_text}
        onSelectId={(id) => {
          set('office_id', id);
          set('office_text', '');
        }}
        onFreeText={(t) => {
          set('office_text', t);
          set('office_id', '');
        }}
      />
      <input type="hidden" name="office_id" value={values.office_id} />
      <input type="hidden" name="office_text" value={values.office_text} />

      <div>
        <label className="block text-sm font-medium mb-1">
          Supervisor (NULL = Gerencia General)
        </label>
        <select
          name="supervisor_id"
          value={values.supervisor_id}
          onChange={(e) => set('supervisor_id', e.target.value)}
          className="w-full p-3 border rounded"
        >
          <option value="">Sin asignar (escala a Gerencia)</option>
          {supervisors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de contrato</label>
          <select
            name="employment_type_id"
            value={values.employment_type_id}
            onChange={(e) => set('employment_type_id', e.target.value)}
            required
            className="w-full p-3 border rounded"
          >
            <option value="">Selecciona…</option>
            {employmentTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Rol HumanOS</label>
          <select
            name="app_role"
            value={values.app_role}
            onChange={(e) =>
              set('app_role', e.target.value as EmployeeFormValues['app_role'])
            }
            className="w-full p-3 border rounded"
          >
            <option value="employee">Empleado</option>
            <option value="hr_admin">RRHH (hr_admin)</option>
            <option value="president">Gerencia General (president)</option>
            <option value="admin">Admin técnico</option>
          </select>
        </div>
      </div>

      {mode === 'create' && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Correo o teléfono para entregar el código de invitación
          </label>
          <p className="text-xs text-gray-500 mb-1">
            Si la persona ya tiene cuenta en MovimientOS, usa el MISMO correo/teléfono que tiene
            ahí. No improvises uno nuevo.
          </p>
          <input
            name="delivery_target"
            value={values.delivery_target}
            onChange={(e) => set('delivery_target', e.target.value)}
            placeholder="ejemplo@iconsanet.com o +50761234567"
            className="w-full p-3 border rounded"
            required
          />
        </div>
      )}

      {state.errors && (
        <ul className="text-sm text-red-600">
          {Object.entries(state.errors).map(([k, v]) => (
            <li key={k}>
              {k}: {v?.[0]}
            </li>
          ))}
        </ul>
      )}
      {state.message && <p className="text-sm text-red-600">{state.message}</p>}
      {state.ok && !!state.data && mode === 'create' && (
        <div className="bg-green-50 border border-green-200 rounded p-4 text-sm">
          Empleado creado. Código de invitación:{' '}
          <strong className="font-mono">
            {(state.data as { invite_code: string }).invite_code}
          </strong>
          <br />
          Envíalo a {(state.data as { delivery_target: string }).delivery_target}.
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-[#1B3A5C] text-white py-3 px-6 rounded-md font-medium disabled:opacity-50"
      >
        {pending
          ? 'Guardando…'
          : mode === 'create'
          ? 'Crear empleado + invite'
          : 'Guardar cambios'}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full p-3 border rounded"
      />
    </div>
  );
}

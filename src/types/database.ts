export type RequestStatus =
  | 'Borrador'
  | 'Enviada'
  | 'En Revisión'
  | 'Aprobada'
  | 'Rechazada'
  | 'Completada'
  | 'Cancelada';

export type ApprovalDecision =
  | 'Pendiente'
  | 'Aprobada'
  | 'Rechazada'
  | 'Solicita Info';

export type AppRole = 'employee' | 'supervisor' | 'hr_admin';

export type Person = {
  id: string;
  auth_id: string | null;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  job_title: string | null;
  office: string | null;
  status: string;
  app_role: string | null;
  supervisor_id: string | null;
  cedula: string | null;
  hire_date: string | null;
  date_of_birth: string | null;
  marital_status: string | null;
  num_kids: number | null;
  address: string | null;
  city: string | null;
  country: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  photo_url: string | null;
};

export type RequestType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  sop_reference: string | null;
  approval_chain: string[];
  requires_approval: boolean;
  icon: string | null;
  is_active: boolean;
};

export type Request = {
  id: string;
  request_number: string | null;
  type_id: string;
  requester_id: string;
  status: RequestStatus;
  form_data: Record<string, unknown>;
  attachments: Array<{ name: string; url: string; mime: string; size: number }>;
  date_submitted: string | null;
  date_resolved: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RequestApproval = {
  id: string;
  request_id: string;
  approver_id: string;
  step_order: number;
  role_required: string | null;
  decision: ApprovalDecision | null;
  comments: string | null;
  decided_at: string | null;
};

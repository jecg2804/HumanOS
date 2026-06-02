-- 055_approvals_updated_at_and_seq_authz
-- requests.approvals updated_at hygiene + SEC-SEQ (lock down next_sequence authZ).

-- (1) requests.approvals: updated_at. R5 (anti-self-approval) vive en el ApprovalEngine (codigo),
--     NO como CHECK BD (approvals no tiene requester_id; CHECK cross-tabla es SQL invalido). business-rules R5.
ALTER TABLE requests.approvals ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
COMMENT ON COLUMN requests.approvals.updated_at IS
  'Ultima modificacion server-authoritative (trigger hr.touch_updated_at). Comparador LWW para sync futuro.';
CREATE OR REPLACE TRIGGER touch_updated_at BEFORE UPDATE ON requests.approvals
  FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();

-- (2) SEC-SEQ: nadie debe quemar la numeracion directamente. next_sequence ya es SECURITY DEFINER
--     (search_path=''); el path legitimo (create_ticket RPC, Group 4) la llama internamente.
--     Validado: no hay rpc('next_sequence') en src/, requests.tickets = 0 filas -> revoke seguro.
REVOKE EXECUTE ON FUNCTION requests.next_sequence(text) FROM authenticated;

-- (3) requests.sequences: deny-all RLS (RLS on, 0 policies) INTENCIONAL -> acceso unico via el bumper
--     SECURITY DEFINER. El advisor rls_enabled_no_policy (INFO) es falso positivo aqui.
COMMENT ON TABLE requests.sequences IS
  'Contadores de numeracion (HUM-YYYY-NNNN). Deny-all RLS intencional: acceso unico via requests.next_sequence() SECURITY DEFINER. NO agregar policy permisiva.';

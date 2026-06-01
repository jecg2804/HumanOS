-- 047_create_leave_ledger.sql
-- DB-VISION foundational migration (ratified 2026-05-29 by James). Time-off accrual ledger.
-- Resolves the VACACIONES "dias disponibles" computed field, which has no backing data today.
-- ALL NEW objects in hr.* (R1-compliant). No existing table altered; MovimientOS (public.*) untouched.
-- Pattern: policy (rules) + assignment (policy<->employee) + ledger (append-only facts) + balances (projection).
-- Balance is a PROJECTION of the ledger, never hand-edited. Corrections are compensating rows, never UPDATE/DELETE.

-- ============ 1. hr.leave_policies (catalog / SOR) ============
create table hr.leave_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  unit text not null default 'days' check (unit in ('days','hours')),
  accrual_method text not null check (accrual_method in ('lump_sum','periodic','hourly','unlimited')),
  accrual_frequency text check (accrual_frequency in ('daily','weekly','biweekly','monthly','annual')),
  accrual_rate numeric check (accrual_rate is null or accrual_rate >= 0),
  max_balance_cap numeric check (max_balance_cap is null or max_balance_cap >= 0),
  carryover_limit numeric check (carryover_limit is null or carryover_limit >= 0),
  carryover_expiry_months integer check (carryover_expiry_months is null or carryover_expiry_months >= 0),
  allow_negative_balance boolean not null default false,
  reset_negative_on_carryover boolean not null default false,
  proration_rule text,
  employment_type_id uuid references hr.employment_types(id) on delete restrict,
  is_active boolean not null default true,
  source_system text not null default 'humanos',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table hr.leave_policies is 'Leave/time-off policy rules (vacaciones, permisos). SOR for accrual config. DB-VISION 2026-05-29. employment_type_id NULL = applies to all contract types.';
comment on column hr.leave_policies.unit is 'days|hours. One unit per policy (no mixing).';
comment on column hr.leave_policies.accrual_method is 'lump_sum|periodic|hourly|unlimited.';
comment on column hr.leave_policies.accrual_rate is 'Units accrued per accrual_frequency period.';
comment on column hr.leave_policies.max_balance_cap is 'Max balance; NULL = uncapped.';
comment on column hr.leave_policies.carryover_limit is 'Max units carried to next year; NULL = unlimited.';
comment on column hr.leave_policies.employment_type_id is 'FK hr.employment_types; NULL = applies to all. Panama vacaciones rules differ by contract type.';
comment on column hr.leave_policies.source_system is 'Row provenance: humanos|payday|manual_entry.';
comment on column hr.leave_policies.deleted_at is 'Soft-delete (no hard deletes, DB-VISION). NULL = active.';

create index idx_leave_policies_active on hr.leave_policies (is_active) where deleted_at is null;
create trigger touch_leave_policies before update on hr.leave_policies for each row execute function hr.touch_updated_at();

alter table hr.leave_policies enable row level security;
create policy leave_policies_select_all on hr.leave_policies for select to authenticated using (deleted_at is null);
create policy leave_policies_write_admin on hr.leave_policies for all to authenticated using (hr.is_hr_admin()) with check (hr.is_hr_admin());

-- ============ 2. hr.leave_assignments (policy <-> employee) ============
create table hr.leave_assignments (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references hr.people(id) on delete cascade,
  policy_id uuid not null references hr.leave_policies(id) on delete restrict,
  accrual_start_date date not null,
  valid_from date not null default current_date,
  valid_to date,
  is_active boolean not null default true,
  source_system text not null default 'humanos',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_to >= valid_from)
);
comment on table hr.leave_assignments is 'Binds a leave policy to an employee. DB-VISION 2026-05-29.';
comment on column hr.leave_assignments.accrual_start_date is 'When accrual begins (must be >= hire date; enforced in app/RPC layer).';
comment on column hr.leave_assignments.source_system is 'Row provenance.';
comment on column hr.leave_assignments.deleted_at is 'Soft-delete. NULL = active.';

create unique index uq_leave_assignment_active on hr.leave_assignments (person_id, policy_id) where is_active and deleted_at is null;
create index idx_leave_assignments_person on hr.leave_assignments (person_id) where deleted_at is null;
create trigger touch_leave_assignments before update on hr.leave_assignments for each row execute function hr.touch_updated_at();

alter table hr.leave_assignments enable row level security;
create policy leave_assignments_select on hr.leave_assignments for select to authenticated
  using (deleted_at is null and (person_id = hr.current_person_id() or hr.is_supervisor_of(person_id) or hr.is_hr_admin()));
create policy leave_assignments_write_admin on hr.leave_assignments for all to authenticated
  using (hr.is_hr_admin()) with check (hr.is_hr_admin());

-- ============ 3. hr.leave_ledger (append-only facts -- THE gap) ============
create table hr.leave_ledger (
  id uuid primary key default gen_random_uuid(), -- TODO: swap to uuidv7() on PG18 (zero data migration, append-heavy)
  assignment_id uuid not null references hr.leave_assignments(id) on delete restrict,
  kind text not null check (kind in ('accrual','grant','usage','carryover_in','carryover_expiry','adjustment','payout','reversal')),
  amount numeric not null, -- signed: + adds, - consumes
  balance_after numeric not null, -- running net balance through this row (point-in-time reconstruction)
  event_date date not null, -- business date, SEPARATE from created_at (system date)
  source_ticket_id uuid references requests.tickets(id) on delete set null,
  reversal_of_id uuid references hr.leave_ledger(id) on delete restrict,
  note text,
  source_system text not null default 'humanos',
  created_by uuid references hr.people(id) on delete set null,
  created_at timestamptz not null default now()
);
comment on table hr.leave_ledger is 'Append-only leave transaction ledger (SOURCE OF TRUTH). DB-VISION 2026-05-29. Corrections = compensating rows (kind=reversal), never UPDATE/DELETE. No updated_at/deleted_at by design (immutable, matches audit.log/requests.approvals convention).';
comment on column hr.leave_ledger.amount is 'Signed units: + accrual/grant, - usage/payout.';
comment on column hr.leave_ledger.balance_after is 'Running net balance (sum of amounts through this row).';
comment on column hr.leave_ledger.event_date is 'Business date of the event (separate from created_at system date; clean for offline reconciliation).';
comment on column hr.leave_ledger.source_ticket_id is 'Approved requests.tickets row that produced this entry (usage/payout).';
comment on column hr.leave_ledger.reversal_of_id is 'For kind=reversal: the ledger row being reversed.';

create index idx_leave_ledger_assignment on hr.leave_ledger (assignment_id, event_date);

alter table hr.leave_ledger enable row level security;
create policy leave_ledger_select on hr.leave_ledger for select to authenticated
  using (exists (select 1 from hr.leave_assignments a where a.id = leave_ledger.assignment_id
    and (a.person_id = hr.current_person_id() or hr.is_supervisor_of(a.person_id) or hr.is_hr_admin())));
-- INSERT/UPDATE/DELETE: no policy = denied for end users. Writes only via hr.post_leave_ledger_entry (SECURITY DEFINER).

-- ============ 4. hr.leave_balances (projection) ============
create table hr.leave_balances (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references hr.leave_assignments(id) on delete cascade,
  accrued numeric not null default 0,
  used numeric not null default 0,
  pending numeric not null default 0,
  available numeric not null default 0, -- accrued - used - pending (the "dias disponibles" value)
  as_of timestamptz not null default now(),
  source_system text not null default 'humanos',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table hr.leave_balances is 'Read-optimized projection of hr.leave_ledger per assignment. Maintained by hr.post_leave_ledger_entry RPC, never hand-edited. DB-VISION 2026-05-29.';
comment on column hr.leave_balances.available is 'accrued - used - pending = the "dias disponibles" value the VACACIONES form reads (source: computed).';
comment on column hr.leave_balances.pending is 'Approved-but-future + in-flight ticket reservations (managed by the ticket layer).';

create trigger touch_leave_balances before update on hr.leave_balances for each row execute function hr.touch_updated_at();

alter table hr.leave_balances enable row level security;
create policy leave_balances_select on hr.leave_balances for select to authenticated
  using (exists (select 1 from hr.leave_assignments a where a.id = leave_balances.assignment_id
    and (a.person_id = hr.current_person_id() or hr.is_supervisor_of(a.person_id) or hr.is_hr_admin())));
-- Written only by the ledger RPC (no direct write policy).

-- ============ 5. RPC: hr.post_leave_ledger_entry (the only sanctioned writer) ============
create or replace function hr.post_leave_ledger_entry(
  p_assignment_id uuid,
  p_kind text,
  p_amount numeric,
  p_event_date date default current_date,
  p_source_ticket_id uuid default null,
  p_note text default null
) returns hr.leave_ledger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_policy hr.leave_policies%rowtype;
  v_prev_available numeric;
  v_pending numeric;
  v_new_balance numeric;
  v_new_accrued numeric;
  v_new_used numeric;
  v_ledger hr.leave_ledger;
begin
  -- AuthZ: only hr_admin posts entries for now. Group 4 ApprovalEngine integration will extend
  -- this (e.g. a system/approved-ticket path) -- documented, intentionally restrictive until then.
  if not hr.is_hr_admin() then
    raise exception 'not authorized: only hr_admin may post leave ledger entries';
  end if;

  -- resolve policy via the assignment
  select p.* into v_policy
  from hr.leave_assignments a join hr.leave_policies p on p.id = a.policy_id
  where a.id = p_assignment_id and a.deleted_at is null;
  if not found then
    raise exception 'leave assignment % not found or inactive', p_assignment_id;
  end if;

  -- lock (or create) the balance row
  insert into hr.leave_balances (assignment_id) values (p_assignment_id)
    on conflict (assignment_id) do nothing;
  select available, pending into v_prev_available, v_pending
  from hr.leave_balances where assignment_id = p_assignment_id for update;

  v_new_balance := coalesce(v_prev_available, 0) + p_amount;

  -- validations
  if p_amount < 0 and not v_policy.allow_negative_balance and v_new_balance < 0 then
    raise exception 'leave balance would go negative (%) and policy % disallows it', v_new_balance, v_policy.code;
  end if;
  if p_amount > 0 and v_policy.max_balance_cap is not null and v_new_balance > v_policy.max_balance_cap then
    raise exception 'leave balance % exceeds cap % for policy %', v_new_balance, v_policy.max_balance_cap, v_policy.code;
  end if;

  -- append the immutable ledger row
  insert into hr.leave_ledger (assignment_id, kind, amount, balance_after, event_date, source_ticket_id, note, created_by)
  values (p_assignment_id, p_kind, p_amount, v_new_balance, p_event_date, p_source_ticket_id, p_note, hr.current_person_id())
  returning * into v_ledger;

  -- recompute the projection from the ledger (correct + simple at MVP volume)
  select coalesce(sum(amount) filter (where amount > 0), 0),
         coalesce(-sum(amount) filter (where amount < 0), 0)
    into v_new_accrued, v_new_used
  from hr.leave_ledger where assignment_id = p_assignment_id;

  update hr.leave_balances
    set accrued = v_new_accrued,
        used = v_new_used,
        available = v_new_accrued - v_new_used - coalesce(pending, 0),
        as_of = now()
  where assignment_id = p_assignment_id;

  return v_ledger;
end;
$$;
comment on function hr.post_leave_ledger_entry is 'Atomically append a leave ledger row + refresh the balance projection. SECURITY DEFINER (controlled write, bypasses RLS); validates negative-balance + cap per policy; authZ hr_admin-only for now. The ONLY sanctioned writer of hr.leave_ledger / hr.leave_balances. DB-VISION 2026-05-29.';

revoke all on function hr.post_leave_ledger_entry(uuid,text,numeric,date,uuid,text) from public;
grant execute on function hr.post_leave_ledger_entry(uuid,text,numeric,date,uuid,text) to authenticated;

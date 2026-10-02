-- Solar ERP — Phase B Module 11 (Project Workflow).
--
-- `projects` existed since Phase A with a 5-stage placeholder status
-- (DRAFT/APPROVED/INSTALLATION_STARTED/INSTALLATION_COMPLETE/CANCELLED)
-- and no application code touching it. This widens it to the real
-- fulfillment pipeline the brief describes: Quotation -> Approval ->
-- Deposit -> Inventory Reservation -> Installation -> Final Payment ->
-- Completed. "Inventory Reservation" isn't its own status — it's a side
-- effect Module 7 will hook onto the DEPOSIT_PAID/INSTALLATION_STARTED
-- transitions inside update_project_status(), not a pipeline stage staff
-- see.
--
-- `requests` already has its own longer-lived pipeline (new_lead ..
-- completed, see 20260101000003 + crm/assets/js/status.js) used before a
-- project exists. Rather than duplicate or replace it, a project's status
-- changes mirror onto the linked request's status where there's a clear
-- equivalent (see update_project_status below) — staff keep working the
-- Requests list they already know, and it stays accurate automatically
-- instead of needing double data entry.

alter table public.projects
  drop constraint projects_status_check,
  add constraint projects_status_check check (status in (
    'DRAFT','QUOTATION_SENT','APPROVED','DEPOSIT_PAID',
    'INSTALLATION_STARTED','INSTALLATION_COMPLETE','FINAL_PAYMENT_PENDING',
    'COMPLETED','CANCELLED'
  ));

alter table public.projects
  add column quotation_sent_at       timestamptz,
  add column deposit_paid_at         timestamptz,
  add column installation_complete_at timestamptz,
  add column final_payment_at        timestamptz;
-- approved_at/installation_started_at/cancelled_at already existed
-- (Phase A). completed_at already existed too — it now means the new
-- terminal COMPLETED status (project fully closed), not installation
-- finishing, which is installation_complete_at above.

-- Append-only status/note history for a project, same guarantee
-- timeline_events already gives requests (reject_timeline_mutation is
-- generic — not request-specific — so it's reused as-is here).
create table public.project_timeline_events (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  at          timestamptz not null default now(),
  type        text not null check (type in ('created','status','note')),
  status      text,
  from_status text,
  note_text   text,
  event_user  text not null default ''
);
create index project_timeline_events_project_id_idx on public.project_timeline_events (project_id);

create trigger project_timeline_events_no_update
  before update on public.project_timeline_events
  for each row execute function public.reject_timeline_mutation();
create trigger project_timeline_events_no_delete
  before delete on public.project_timeline_events
  for each row execute function public.reject_timeline_mutation();

alter table public.project_timeline_events enable row level security;
create policy project_timeline_events_select_staff on public.project_timeline_events
  for select to authenticated using (public.is_active_staff());
-- No write policy, same reasoning as timeline_events: only the RPCs
-- below may insert, so every entry is guaranteed to come from an actual
-- tracked mutation.

-- ── convert_request_to_project ──────────────────────────────────────
-- Seeds material_cost/selling_price from the request's system.packagePrice
-- (whatever the customer was quoted — live-priced package or formula
-- tier, Module 2/3 already computed it). package_id links only if
-- system.packageId happens to be a real packages.id (Module 3 packages,
-- not a formula-tier string like "essential") — left null otherwise, the
-- Quotation Engine (Module 10) can still attach one manually later.
create or replace function public.convert_request_to_project(p_request_id text)
returns public.projects
language plpgsql
security definer set search_path = public
as $$
declare
  v_request public.requests;
  v_project public.projects;
  v_package_id uuid;
  v_price numeric;
begin
  if not public.is_active_staff() then
    raise exception 'Your account is inactive — contact an admin.';
  end if;

  select * into v_request from public.requests where id = p_request_id;
  if not found then raise exception 'Request % not found', p_request_id; end if;

  if exists (select 1 from public.projects where request_id = p_request_id) then
    raise exception 'Request % already has a project', p_request_id;
  end if;

  select id into v_package_id from public.packages where id::text = (v_request.system ->> 'packageId');
  v_price := coalesce((v_request.system ->> 'packagePrice')::numeric, 0);

  insert into public.projects (request_id, package_id, status, selling_price, assigned_sales_id)
  values (p_request_id, v_package_id, 'DRAFT', v_price, auth.uid())
  returning * into v_project;

  insert into public.project_timeline_events (project_id, type, status, event_user)
  values (v_project.id, 'created', 'DRAFT', public.current_staff_name());

  return v_project;
end;
$$;

grant execute on function public.convert_request_to_project(text) to authenticated;

-- ── update_project_status ───────────────────────────────────────────
create or replace function public.update_project_status(p_project_id uuid, p_new_status text, p_note text default null)
returns public.projects
language plpgsql
security definer set search_path = public
as $$
declare
  v_project    public.projects;
  v_old_status text;
  v_mirror     text;
begin
  if not public.is_active_staff() then
    raise exception 'Your account is inactive — contact an admin.';
  end if;

  select * into v_project from public.projects where id = p_project_id for update;
  if not found then raise exception 'Project not found'; end if;
  if v_project.status = p_new_status then return v_project; end if;

  v_old_status := v_project.status;

  update public.projects set
    status = p_new_status,
    approved_at              = case when p_new_status = 'APPROVED' then now() else approved_at end,
    quotation_sent_at        = case when p_new_status = 'QUOTATION_SENT' then now() else quotation_sent_at end,
    deposit_paid_at          = case when p_new_status = 'DEPOSIT_PAID' then now() else deposit_paid_at end,
    installation_started_at  = case when p_new_status = 'INSTALLATION_STARTED' then now() else installation_started_at end,
    installation_complete_at = case when p_new_status = 'INSTALLATION_COMPLETE' then now() else installation_complete_at end,
    final_payment_at         = case when p_new_status = 'FINAL_PAYMENT_PENDING' then now() else final_payment_at end,
    completed_at             = case when p_new_status = 'COMPLETED' then now() else completed_at end,
    cancelled_at             = case when p_new_status = 'CANCELLED' then now() else cancelled_at end
  where id = p_project_id
  returning * into v_project;

  insert into public.project_timeline_events (project_id, type, status, from_status, note_text, event_user)
  values (p_project_id, 'status', p_new_status, v_old_status, p_note, public.current_staff_name());

  -- Mirror onto the linked request's own pipeline where there's a clear
  -- equivalent (see file header) — best-effort, never blocks the project
  -- update if the request is missing/already terminal.
  v_mirror := case p_new_status
    when 'QUOTATION_SENT' then 'quotation_sent'
    when 'DEPOSIT_PAID' then 'deposit_paid'
    when 'INSTALLATION_STARTED' then 'installation_scheduled'
    when 'INSTALLATION_COMPLETE' then 'installed'
    when 'COMPLETED' then 'completed'
    when 'CANCELLED' then 'cancelled'
    else null
  end;
  if v_mirror is not null then
    update public.requests set status = v_mirror where id = v_project.request_id and status is distinct from v_mirror;
    if found then
      insert into public.timeline_events (request_id, type, status, event_user)
      values (v_project.request_id, 'status', v_mirror, 'Project: ' || p_new_status);
    end if;
  end if;

  return v_project;
end;
$$;

grant execute on function public.update_project_status(uuid, text, text) to authenticated;

-- Solar ERP — CRM Requests (Phase 1/2, unchanged shape/behavior, now
-- Postgres-backed instead of localStorage). This is "existing
-- functionality" per Phase A's brief — everything here must reproduce
-- assets/js/crm-store.js exactly, just on a real database.

create sequence public.request_id_seq;

create or replace function public.next_request_id()
returns text
language sql
as $$
  select 'SOL-' || lpad(nextval('public.request_id_seq')::text, 6, '0');
$$;

create table public.requests (
  id             text primary key default public.next_request_id(),
  status         text not null default 'new_lead' check (status in (
                   'new_lead','contacted','qualified','quotation_sent','negotiation',
                   'deposit_paid','installation_scheduled','installed','completed','cancelled'
                 )),
  lang           text not null default 'ar' check (lang in ('ar','en')),

  -- Mirrors the exact nested shape CRMStore has always produced —
  -- customer-detail.js/requests.js/report.js/edit-request.js need no
  -- rewrite, only their data-fetching moves from localStorage to Supabase.
  customer  jsonb not null,
  recipient jsonb,
  property  jsonb not null,
  system    jsonb not null,

  notes          text not null default '',
  assigned_sales text not null default '',
  branch         text,
  priority       text not null default 'medium' check (priority in ('low','medium','high','urgent')),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger requests_set_updated_at
  before update on public.requests
  for each row execute function public.set_updated_at();

create index requests_status_idx on public.requests (status);

-- Append-only audit trail of every change to a request — status moves,
-- notes, and per-field edits (module 2 of the CRM brief). Never updated
-- or deleted from application code, only inserted into.
create table public.timeline_events (
  id          uuid primary key default gen_random_uuid(),
  request_id  text not null references public.requests (id) on delete cascade,
  at          timestamptz not null default now(),
  type        text not null check (type in ('created','status','note','field')),
  status      text,   -- type = 'status' | 'created'
  from_status text,   -- type = 'status'
  note_text   text,   -- type = 'note'
  action      text,   -- type = 'field'
  field       text,   -- type = 'field'
  before_val  text,   -- type = 'field'
  after_val   text,   -- type = 'field'
  event_user  text not null default ''
);

create index timeline_events_request_id_idx on public.timeline_events (request_id);

-- Immutability: timeline rows may only ever be inserted, matching the
-- "never overwrite history" rule — enforced here, not just by convention.
create or replace function public.reject_timeline_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'timeline_events is append-only — % is not allowed', tg_op;
end;
$$;

create trigger timeline_events_no_update
  before update on public.timeline_events
  for each row execute function public.reject_timeline_mutation();

create trigger timeline_events_no_delete
  before delete on public.timeline_events
  for each row execute function public.reject_timeline_mutation();

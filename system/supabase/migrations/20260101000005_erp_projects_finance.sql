-- Solar ERP — fulfillment pipeline (module 8's "Approved -> reserve,
-- Installation Started -> deduct" hooks into Project.status here),
-- Payments/Installments (modules 4-5), Quotations (module 12), Audit Log
-- (module 15), Settings (module 16). Schema only in Phase A.

create table public.projects (
  id                     uuid primary key default gen_random_uuid(),
  request_id             text not null unique references public.requests (id),
  package_id             uuid references public.packages (id),
  status                 text not null default 'DRAFT' check (status in (
                           'DRAFT','APPROVED','INSTALLATION_STARTED','INSTALLATION_COMPLETE','CANCELLED'
                         )),
  assigned_sales_id      uuid references public.profiles (id),

  material_cost          numeric not null default 0,
  installation_cost      numeric not null default 0,
  transportation_cost    numeric not null default 0,
  labor_cost             numeric not null default 0,
  misc_cost              numeric not null default 0,
  tax_pct                numeric not null default 0,
  discount               numeric not null default 0,
  commission_pct         numeric not null default 0,
  selling_price          numeric not null default 0,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  approved_at            timestamptz,
  installation_started_at timestamptz,
  completed_at           timestamptz,
  cancelled_at           timestamptz
);
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();

-- Now that projects exists, wire the FK stock_movements.project_id was
-- left dangling for in the previous migration.
alter table public.stock_movements
  add constraint stock_movements_project_id_fkey
  foreign key (project_id) references public.projects (id);
create index stock_movements_project_id_idx on public.stock_movements (project_id);

create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id),
  type        text not null check (type in ('DEPOSIT','SECOND','FINAL','CUSTOM')),
  amount      numeric not null check (amount >= 0),
  date        timestamptz not null default now(),
  method      text,
  status      text not null default 'PENDING' check (status in ('PENDING','PAID','FAILED')),
  notes       text,
  receipt_url text,
  created_at  timestamptz not null default now()
);
create index payments_project_id_idx on public.payments (project_id);

create table public.installments (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id),
  months         integer not null check (months > 0),
  monthly_amount numeric not null check (monthly_amount >= 0),
  due_date       date not null,
  paid           boolean not null default false,
  paid_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index installments_project_id_idx on public.installments (project_id);

create table public.quotations (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id),
  version       integer not null default 1,
  pdf_url       text,
  qr_code_data  text,
  signature_url text,
  created_at    timestamptz not null default now()
);
create index quotations_project_id_idx on public.quotations (project_id);

-- Audit Log (module 15) — every module writes here through a single
-- SECURITY DEFINER function so the shape of an entry is decided once.
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id),
  entity_type text not null,
  entity_id   text not null,
  action      text not null,
  before_val  jsonb,
  after_val   jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create or replace function public.record_audit(
  p_entity_type text,
  p_entity_id text,
  p_action text,
  p_before jsonb default null,
  p_after jsonb default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, entity_type, entity_id, action, before_val, after_val)
  values (auth.uid(), p_entity_type, p_entity_id, p_action, p_before, p_after);
end;
$$;

-- Settings (module 16) — single row, id fixed at 1.
create table public.settings (
  id                         integer primary key default 1 check (id = 1),
  currency                   text not null default 'USD',
  tax_pct                    numeric not null default 0,
  default_margin_pct         numeric not null default 20,
  default_installation_cost  numeric not null default 200,
  company_name               text not null default 'Andoria Diesel Engines & Solar Solutions',
  company_logo_url           text,
  quotation_template         text
);
insert into public.settings (id) values (1);

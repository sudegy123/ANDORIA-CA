-- Solar ERP — Inventory (module 1), Packages (module 3), Suppliers +
-- Purchase Orders (modules 9-10). Schema only in Phase A — no
-- application code reads/writes these tables yet (see brief: "Do NOT
-- start implementing Inventory, Payments or Profit yet"). Existing here
-- so the foundation every future module builds on is coherent from day one.

create table public.suppliers (
  id                  uuid primary key default gen_random_uuid(),
  company             text not null,
  contact_person      text,
  phone               text,
  whatsapp            text,
  email               text,
  address             text,
  outstanding_balance numeric not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger suppliers_set_updated_at before update on public.suppliers for each row execute function public.set_updated_at();

create table public.products (
  id             uuid primary key default gen_random_uuid(),
  sku            text not null unique,
  category       text not null check (category in (
                   'SOLAR_PANEL','BATTERY','INVERTER','MOUNTING_STRUCTURE',
                   'CABLE','ACCESSORY','ELECTRICAL_COMPONENT'
                 )),
  brand          text not null,
  model          text not null,
  specification  text,
  unit           text not null default 'pcs',
  purchase_price numeric not null check (purchase_price >= 0),
  selling_price  numeric not null check (selling_price >= 0),
  quantity       integer not null default 0 check (quantity >= 0),
  reserved_qty   integer not null default 0 check (reserved_qty >= 0),
  min_stock      integer not null default 0 check (min_stock >= 0),
  warranty       text,
  notes          text,
  status         text not null default 'ACTIVE' check (status in ('ACTIVE','ARCHIVED')),
  supplier_id    uuid references public.suppliers (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create index products_category_idx on public.products (category);
create index products_status_idx on public.products (status);

create table public.packages (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text,
  default_margin_pct  numeric not null default 0,
  installation_cost   numeric not null default 0,
  status              text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','ARCHIVED')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger packages_set_updated_at before update on public.packages for each row execute function public.set_updated_at();

create table public.package_components (
  id         uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity   integer not null default 1 check (quantity > 0)
);

create table public.purchase_orders (
  id           uuid primary key default gen_random_uuid(),
  supplier_id  uuid not null references public.suppliers (id),
  status       text not null default 'DRAFT' check (status in ('DRAFT','SENT','APPROVED','RECEIVED','CLOSED')),
  notes        text,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz,
  approved_at  timestamptz,
  received_at  timestamptz,
  closed_at    timestamptz
);

create table public.purchase_order_items (
  id                uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  product_id        uuid not null references public.products (id),
  quantity          integer not null check (quantity > 0),
  unit_cost         numeric not null check (unit_cost >= 0)
);

-- Stock History (module 1) — quantity on `products` should only ever
-- change alongside a row inserted here, so "why is this 12 units" always
-- has an answer. RESERVED/DEDUCTED/RETURNED are for module 8 (Inventory
-- Reservation), wired once the Projects table's status transitions exist.
create table public.stock_movements (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  type       text not null check (type in (
               'PURCHASE_IN','MANUAL_IN','MANUAL_OUT','RESERVED','RELEASED','DEDUCTED','RETURNED'
             )),
  quantity   integer not null check (quantity > 0),
  reason     text,
  project_id uuid, -- FK added in the projects migration (table doesn't exist yet at this point)
  user_id    uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index stock_movements_product_id_idx on public.stock_movements (product_id);

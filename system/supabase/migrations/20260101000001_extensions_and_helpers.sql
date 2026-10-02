-- Solar ERP — extensions + shared helpers
-- Every later migration depends on these.

create extension if not exists pgcrypto;      -- gen_random_uuid()

-- Generic "touch updated_at on every UPDATE" trigger, reused by every
-- table below instead of redefining the same three lines per table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

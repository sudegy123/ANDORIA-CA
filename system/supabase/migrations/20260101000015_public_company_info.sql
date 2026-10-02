-- Solar ERP — 2026 strategy pivot: the customer wizard's WhatsApp CTA
-- needs the configured business number, but `settings` RLS is staff-only
-- (settings_select_staff: is_active_staff()) — an anonymous customer
-- session has no way to read it directly. Same reasoning as
-- get_live_pricing()/get_priced_packages() (20260101000010/20260101000011):
-- a narrow, read-only, SECURITY DEFINER surface that exposes only what a
-- public page needs, never the raw table (tax_pct, default margins, etc.
-- stay internal).

create or replace function public.get_public_company_info()
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'companyName', company_name,
    'companyWhatsapp', company_whatsapp,
    'companyPhone', company_phone
  )
  from public.settings
  where id = 1;
$$;

grant execute on function public.get_public_company_info() to anon, authenticated;

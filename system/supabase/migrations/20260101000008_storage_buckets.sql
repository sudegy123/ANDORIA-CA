-- Solar ERP — Storage buckets. Created now as foundation (module 12
-- Quotation PDFs, module 4 payment receipts, company branding) even
-- though the modules that populate them aren't built until a later phase.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('company-assets', 'company-assets', true,  5242880),   -- logo etc — public read, small
  ('product-images', 'product-images', true,  5242880),   -- inventory photos — public read
  ('quotations',     'quotations',     false, 10485760),  -- generated PDFs — private
  ('receipts',       'receipts',       false, 10485760)   -- payment receipt uploads — private
on conflict (id) do nothing;

-- Public buckets: anyone can read, only ADMIN/OWNER can write.
create policy company_assets_public_read on storage.objects
  for select using (bucket_id = 'company-assets');
create policy company_assets_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'company-assets' and public.is_owner_or('ADMIN'))
  with check (bucket_id = 'company-assets' and public.is_owner_or('ADMIN'));

create policy product_images_public_read on storage.objects
  for select using (bucket_id = 'product-images');
create policy product_images_warehouse_write on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and public.is_owner_or('WAREHOUSE', 'ADMIN'))
  with check (bucket_id = 'product-images' and public.is_owner_or('WAREHOUSE', 'ADMIN'));

-- Private buckets: staff-only read, role-gated write.
create policy quotations_staff_read on storage.objects
  for select to authenticated
  using (bucket_id = 'quotations' and public.is_active_staff());
create policy quotations_sales_write on storage.objects
  for all to authenticated
  using (bucket_id = 'quotations' and public.is_owner_or('SALES', 'ADMIN'))
  with check (bucket_id = 'quotations' and public.is_owner_or('SALES', 'ADMIN'));

create policy receipts_staff_read on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and public.is_active_staff());
create policy receipts_finance_write on storage.objects
  for all to authenticated
  using (bucket_id = 'receipts' and public.is_owner_or('FINANCE', 'ADMIN'))
  with check (bucket_id = 'receipts' and public.is_owner_or('FINANCE', 'ADMIN'));

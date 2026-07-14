-- תיקון: anon יכול לקרוא products_public (התצוגה רצה כבעלים, לא כ-anon)
-- הרץ ב-Supabase SQL Editor אם החנות ריקה אחרי migration_public_view.sql

alter table public.products
  add column if not exists barcode text;

drop view if exists public.products_public;

create view public.products_public
with (security_invoker = false)
as
select
  id,
  sku,
  barcode,
  name_he,
  name_ar,
  category_he,
  category_ar,
  price,
  sale_price,
  on_sale,
  desc_he,
  desc_ar,
  images,
  available,
  unit,
  featured,
  published,
  created_at
from public.products
where published = true;

grant select on public.products_public to anon, authenticated;
revoke select on public.products from anon;
drop policy if exists "public read published" on public.products;

notify pgrst, 'reload schema';

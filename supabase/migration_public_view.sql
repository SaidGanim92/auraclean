-- תצוגה ציבורית: רק שדות בטוחים ללקוחות (ללא מלאי, עלות, קישור מקור)
-- הרץ ב-Supabase SQL Editor (עובד גם על מסד ישן בלי עמודת barcode)

-- עמודות שחסרות במסדים ישנים (בטוח להריץ גם אם כבר קיימות)
alter table public.products
  add column if not exists barcode text;

create or replace view public.products_public as
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

-- הרשאת קריאה ל-anon/authenticated על התצוגה בלבד
grant select on public.products_public to anon, authenticated;

-- חסימת SELECT ישיר על products ל-anon — רק דרך products_public
revoke select on public.products from anon;

drop policy if exists "public read published" on public.products;

notify pgrst, 'reload schema';

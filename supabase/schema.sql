-- ==========================================================================
-- AURA CLEAN — סכימת מסד הנתונים (Supabase / Postgres)
-- הרצה: Supabase Dashboard → SQL Editor → הדבק והרץ.
-- ==========================================================================

-- הרחבה ליצירת UUID
create extension if not exists "pgcrypto";

-- ----- טבלת מוצרים -----
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  sku          text not null,                         -- מק"ט (ייחודי)
  barcode      text,                                  -- ברקוד (EAN/UPC) — שדה נפרד מהמק"ט, מוצג בהזמנת ווטסאפ
  source_url   text,                                  -- קישור המוצר אצל הספק
  supplier     text check (supplier in ('tyroler','touch','yaakobi','sag','manual')),
  name_he      text not null,
  name_ar      text,
  category_he  text,
  category_ar  text,
  price        numeric(10,2) not null default 0,
  sale_price   numeric(10,2),
  on_sale      boolean not null default false,
  price_override boolean not null default false, -- מחיר נעול ידנית — ייבוא CSV/עדכון-מהמקור לא ידרוס אותו

  desc_he      text,
  desc_ar      text,
  images       text[] not null default '{}',          -- מערך URLs באחסון שלנו (Supabase Storage)
  available    boolean not null default true,
  unit         text,
  featured     boolean not null default false,
  published    boolean not null default false,
  -- ייבוא מלאי + העשרה מקישור ספק
  stock_qty        integer,                              -- כמות מלאי מקובץ הייבוא (עזר)
  cost_ref         numeric(10,2),                        -- מחיר עלות לעזר (לא מוצג בחנות)
  enrichment_source text
    check (enrichment_source in ('supplier','manual','none')),  -- מקור העשרת תמונה/תיאור
  image_external   boolean not null default false,       -- תמונות ממקור חיצוני (לוודא זכויות)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- מניעת כפילויות: מק"ט ייחודי, ואינדקס משני לפי source_url
create unique index if not exists products_sku_key on public.products (sku);
create index if not exists products_source_url_idx on public.products (source_url);
create index if not exists products_published_idx on public.products (published);
create index if not exists products_category_idx on public.products (category_he);

-- עדכון אוטומטי של updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ==========================================================================
-- RLS (Row Level Security)
--   • ציבור: קריאה דרך products_public בלבד (שדות בטוחים, published=true).
--   • כתיבה/ניהול: דרך service-role בלבד (עוקף RLS) מצד השרת ב-Admin.
-- ==========================================================================
alter table public.products enable row level security;

-- תצוגה ציבורית — ללא cost_ref, source_url, stock_qty
create or replace view public.products_public as
select
  id, sku, barcode, name_he, name_ar, category_he, category_ar,
  price, sale_price, on_sale, desc_he, desc_ar, images,
  available, unit, featured, published, created_at
from public.products
where published = true;

grant select on public.products_public to anon, authenticated;
revoke select on public.products from anon;

drop policy if exists "public read published" on public.products;

-- אין policy ל-insert/update/delete → פעולות כתיבה אפשריות רק עם service-role
-- (המפתח שעוקף RLS), שנמצא אך ורק בצד השרת ב-Admin.

-- ==========================================================================
-- Storage: דלי תמונות מוצרים
--   צרו דלי ציבורי בשם 'product-images':
--   Dashboard → Storage → New bucket → name: product-images, Public: ON
--   (או הריצו את הבלוק הבא)
-- ==========================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- קריאה ציבורית לתמונות
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

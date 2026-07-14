-- ==========================================================================
-- AURA CLEAN — מיגרציה: עמודת ברקוד (שדה נפרד מהמק"ט)
-- הרצה על מסד קיים: Supabase → SQL Editor → הדבק והרץ.
-- (schema.sql המעודכן כבר כולל את העמודה הזו לפרויקטים חדשים.)
-- ==========================================================================

alter table public.products
  add column if not exists barcode text; -- ברקוד (EAN/UPC) — נפרד מהמק"ט, מוצג בהזמנת ווטסאפ

comment on column public.products.barcode is 'ברקוד (EAN/UPC) — שדה נפרד מהמק"ט; מוצג בעריכה, בהעשרה מקישור ספק, ובהזמנת ווטסאפ';

create index if not exists products_barcode_idx on public.products (barcode);

-- ==========================================================================
-- AURA CLEAN — מיגרציה: נעילת מחיר ידנית (price_override)
-- הרצה על מסד קיים: Supabase → SQL Editor → הדבק והרץ.
-- (schema.sql המעודכן כבר כולל את העמודה הזו לפרויקטים חדשים.)
-- ==========================================================================

alter table public.products
  add column if not exists price_override boolean not null default false;

comment on column public.products.price_override is
  'true אחרי שהמנהל שינה מחיר ידנית (בעריכה או באישור העשרה) — ייבוא CSV / עדכון-מהמקור לא ידרוס אותו יותר';

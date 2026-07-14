-- ==========================================================================
-- AURA CLEAN — מיגרציה: ייבוא מלאי + העשרה מקישור ספק
-- הרצה על מסד קיים: Supabase → SQL Editor → הדבק והרץ.
-- (schema.sql המעודכן כבר כולל את העמודות האלה לפרויקטים חדשים.)
-- ==========================================================================

alter table public.products
  add column if not exists stock_qty        integer,          -- כמות מלאי מקובץ הייבוא (עזר)
  add column if not exists cost_ref          numeric(10,2),    -- מחיר עלות לעזר (לא מוצג בחנות)
  add column if not exists enrichment_source text              -- supplier | manual | none
    check (enrichment_source in ('supplier','manual','none')),
  add column if not exists image_external    boolean not null default false; -- תמונות ממקור חיצוני (לוודא זכויות)

comment on column public.products.stock_qty is 'כמות מלאי מקובץ הייבוא (מקור אמת: קובץ המלאי)';
comment on column public.products.enrichment_source is 'מקור ההעשרה של תמונה/תיאור';
comment on column public.products.image_external is 'האם התמונות הגיעו ממקור חיצוני (העשרה) — לתזכורת זכויות';

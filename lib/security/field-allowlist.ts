import 'server-only';
import type { Product } from '@/lib/types';

/** שדות שמותר לעדכן בעריכה ידנית של מוצר */
export const EDITABLE_PRODUCT_FIELDS = [
  'sku',
  'barcode',
  'source_url',
  'supplier',
  'name_he',
  'name_ar',
  'category_he',
  'category_ar',
  'price',
  'sale_price',
  'on_sale',
  'price_override',
  'desc_he',
  'desc_ar',
  'images',
  'available',
  'unit',
  'featured',
  'published',
  'stock_qty',
  'cost_ref',
  'enrichment_source',
  'image_external',
] as const satisfies readonly (keyof Product)[];

/** שדות שמותר להחיל מעדכון-מהמקור (לא כולל published/featured/images) */
export const SOURCE_PATCH_FIELDS = [
  'name_he',
  'name_ar',
  'category_he',
  'category_ar',
  'price',
  'sale_price',
  'on_sale',
  'desc_he',
  'desc_ar',
  'available',
  'unit',
  'barcode',
  'stock_qty',
  'cost_ref',
] as const satisfies readonly (keyof Product)[];

/** מסנן patch לשדות מורשים בלבד */
export function pickAllowedFields(
  patch: Partial<Product>,
  allowed: readonly (keyof Product)[]
): Partial<Product> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in patch && patch[key] !== undefined) {
      out[key] = patch[key];
    }
  }
  return out as Partial<Product>;
}

export function pickEditableFields(patch: Partial<Product>): Partial<Product> {
  return pickAllowedFields(patch, EDITABLE_PRODUCT_FIELDS);
}

export function pickSourcePatchFields(patch: Partial<Product>): Partial<Product> {
  return pickAllowedFields(patch, SOURCE_PATCH_FIELDS);
}

/** עמודות בטוחות לחשיפה ללקוחות (ללא מלאי, עלות, קישור מקור) */
export const PUBLIC_PRODUCT_COLUMNS = [
  'id',
  'sku',
  'barcode',
  'name_he',
  'name_ar',
  'category_he',
  'category_ar',
  'price',
  'sale_price',
  'on_sale',
  'desc_he',
  'desc_ar',
  'images',
  'available',
  'unit',
  'featured',
  'published',
].join(',');

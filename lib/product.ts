import type { Product } from '@/lib/types';
import type { Lang } from '@/lib/i18n/dict';
import { looksLikeHebrew } from '@/lib/lang-detect';
import { categoryLabel, resolveCategoryHe } from '@/lib/category-ar';

// עזרים לתצוגת מוצר לפי שפה פעילה

function arabicOrEmpty(ar: string | null | undefined): string {
  if (!ar?.trim() || looksLikeHebrew(ar)) return '';
  return ar;
}

export function pName(p: Product, lang: Lang): string {
  if (lang === 'ar') return arabicOrEmpty(p.name_ar) || p.name_he || '';
  return p.name_he || arabicOrEmpty(p.name_ar) || '';
}
export function pCat(p: Product, lang: Lang): string {
  const he = resolveCategoryHe(p.category_he, p.category_ar);
  const short = categoryLabel(he, lang);
  if (short) return short;
  if (lang === 'ar') {
    const ar = arabicOrEmpty(p.category_ar);
    if (ar) return ar;
    return he;
  }
  return he || arabicOrEmpty(p.category_ar) || (p.category_ar || '').trim();
}
export function pDesc(p: Product, lang: Lang): string {
  if (lang === 'ar') return arabicOrEmpty(p.desc_ar) || p.desc_he || '';
  return (p.desc_he || arabicOrEmpty(p.desc_ar)) || '';
}

/** מפתח קטגוריה יציב (עברית) לצורך קיבוץ/סינון בלתי-תלוי שפה */
export function catKey(p: Product): string {
  return resolveCategoryHe(p.category_he, p.category_ar);
}

/** מחיר אפקטיבי בהתחשב במבצע */
export function effectivePrice(p: Product): number {
  return p.on_sale && p.sale_price ? p.sale_price : p.price;
}

/** פורמט מחיר */
export function money(n: number, currency = '₪'): string {
  const val = Number(n).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${val} ${currency}`;
}

/** תמונת מוצר ראשית — URL מהמסד, אחרת placeholder צבעוני (SVG data URI) */
export function productImage(p: Product, lang: Lang): string {
  const first = p.images && p.images.length ? p.images[0] : '';
  if (first) return first;
  return placeholderImage(p, lang);
}

const PLACEHOLDER_COLORS = ['#5B93D6', '#C85A9E', '#E8913C', '#3E74B8', '#B23F86', '#C9761F'];
export function placeholderImage(p: Product, lang: Lang): string {
  const name = pName(p, lang) || 'AURA CLEAN';
  const seed = p.id || p.sku || name;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (seed.charCodeAt(i) + hash * 31) >>> 0;
  const c1 = PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length];
  const c2 = PLACEHOLDER_COLORS[(hash + 2) % PLACEHOLDER_COLORS.length];
  const label = name.length > 22 ? name.slice(0, 21) + '…' : name;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs>` +
    `<rect width='400' height='400' fill='url(#g)' opacity='0.16'/>` +
    `<circle cx='200' cy='168' r='96' fill='url(#g)' opacity='0.5'/>` +
    `<circle cx='232' cy='140' r='16' fill='#ffffff' opacity='0.6'/>` +
    `<circle cx='168' cy='196' r='9' fill='#ffffff' opacity='0.45'/>` +
    `<text x='200' y='330' font-family='Assistant, Cairo, sans-serif' font-size='22' font-weight='700' ` +
    `fill='#14203A' text-anchor='middle'>${label.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>` +
    `</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

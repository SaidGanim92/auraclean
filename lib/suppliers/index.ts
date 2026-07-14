import type { Supplier, ScrapedProduct } from '@/lib/types';
import { validatePublicHttpsUrl, validateRetailUrl, validateSupplierUrl } from '@/lib/security/url-validator';
import { type Fetcher, type SupplierParser } from './types';
import { resolveFetcher } from './resolve-fetcher';
import { shopifyParser } from './shopify';
import { makeWooParser, tyrolerParser, sagParser, touchParser } from './woocommerce';
import { parseGenericRetail } from './generic-retail';
import { matchesKsp, parseKsp } from './ksp';

const yaakobiLegacyParser = makeWooParser('yaakobi', /(^|\.)(jaiusi|d-house)\.co\.il$/i);

export const PARSERS: SupplierParser[] = [
  shopifyParser,
  yaakobiLegacyParser,
  tyrolerParser,
  sagParser,
  touchParser,
];

export function detectSupplier(url: string): SupplierParser | null {
  return PARSERS.find((p) => p.matches(url)) || null;
}

/** גריפה מכתובת ספק מוכר */
export async function scrapeFromUrl(
  url: string,
  fetcher?: Fetcher
): Promise<ScrapedProduct> {
  const f = resolveFetcher(fetcher);
  const safeUrl = validateSupplierUrl(url);
  const parser = detectSupplier(safeUrl);
  if (!parser) {
    throw new Error('דומיין הספק אינו מזוהה. נתמכים: יעקובי, Tyroler, SAG, טאצ\'.');
  }
  return parser.parse(safeUrl, f);
}

/**
 * גריפה מקמעונאות ישראלית — פרסר ייעודי אם קיים, אחרת גנרי (og/meta).
 * משמש בהעשרה מחיפוש גוגל באתרים שונים.
 */
export async function scrapeRetailUrl(
  url: string,
  fetcher?: Fetcher
): Promise<ScrapedProduct> {
  const f = resolveFetcher(fetcher);
  const safeUrl = validateRetailUrl(url);
  const parser = detectSupplier(safeUrl);
  if (parser) return parser.parse(safeUrl, f);
  return parseGenericRetail(safeUrl, f);
}

/**
 * גריפה מדף מוצר — ספק מוכר → קמעונאות ישראלית → גנרי (og/meta).
 * מאפשר כל אתר HTTPS ציבורי (העשרה ידנית).
 */
export async function scrapeProductPage(
  url: string,
  fetcher?: Fetcher
): Promise<ScrapedProduct> {
  const f = resolveFetcher(fetcher);
  const safeUrl = validatePublicHttpsUrl(url);
  if (matchesKsp(safeUrl)) {
    return parseKsp(safeUrl, f);
  }
  const parser = detectSupplier(safeUrl);
  if (parser) {
    try {
      return await parser.parse(safeUrl, f);
    } catch (err) {
      console.warn('פרסר ספק נכשל, נופלים לגנרי', safeUrl, err);
    }
  }
  return parseGenericRetail(safeUrl, f);
}

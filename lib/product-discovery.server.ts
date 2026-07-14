import * as cheerio from 'cheerio';
import type { Product } from '@/lib/types';
import { scrapeProductPage } from '@/lib/suppliers';
import { searchIsraeliRetail } from '@/lib/web-search.server';
import { looksLikeBarcode, type Fetcher } from '@/lib/suppliers/types';
import { resolveFetcher } from '@/lib/suppliers/resolve-fetcher';

const SUPPLIER_ORIGINS = [
  'https://sagncs.co.il',
  'https://www.tyroler.co.il',
  'https://www.touchonline.co.il',
  'https://www.jaiusi.co.il',
  'https://www.d-house.co.il',
];

const BRAND_ORIGIN: [RegExp, string][] = [
  [/\bsag\b|סאג/i, 'https://sagncs.co.il'],
  [/tyroler|טירולר/i, 'https://www.tyroler.co.il'],
  [/טאצ|touch/i, 'https://www.touchonline.co.il'],
  [/יעקובי|jacobi|jaiusi|d-house/i, 'https://www.d-house.co.il'],
  [/סנונית|snunit|snonit/i, 'https://snonitshop.co.il'],
  [/pink\s*stuff|פינק/i, 'https://www.cosmetix.co.il'],
  [/kh[\s-]?7/i, 'https://www.cosmetix.co.il'],
];

const STOP_WORDS = new Set([
  'לניקוי', 'לכביסה', 'מרכז', 'מרוכז', 'נוזל', 'ג׳ל', "ג'ל", 'מל', 'יח', 'ליטר', 'מ""ל', 'מ״ל',
  'the', 'pink', 'stuff', 'with', 'and', 'for', 'home', 'professional', 'בניחוח',
]);

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\u0590-\u05FFa-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** חפיפת מילים בין שני שמות (0–1) */
export function nameScore(a: string, b: string): number {
  const tok = (s: string) =>
    normalizeText(s)
      .split(' ')
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  const A = tok(a);
  const B = new Set(tok(b));
  if (!A.length || !B.size) return 0;
  let hit = 0;
  for (const w of A) {
    if (B.has(w)) { hit++; continue; }
    if (w.length >= 4 && [...B].some((b) => b.includes(w) || w.includes(b))) hit += 0.75;
  }
  return hit / A.length;
}

function searchTerms(name: string, sku: string): string[] {
  const words = normalizeText(name).split(' ').filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  const terms: string[] = [];
  if (words.length >= 2) terms.push(words.slice(0, 4).join(' '));
  if (words.length >= 1) terms.push(words.slice(0, 2).join(' '));
  if (looksLikeBarcode(sku)) terms.push(sku);
  return [...new Set(terms)];
}

function originsForProduct(name: string): string[] {
  const out: string[] = [];
  for (const [re, origin] of BRAND_ORIGIN) {
    if (re.test(name)) out.push(origin);
  }
  for (const o of SUPPLIER_ORIGINS) {
    if (!out.includes(o)) out.push(o);
  }
  return out.slice(0, 3);
}

async function wooSearch(
  origin: string,
  query: string,
  fetcher: Fetcher
): Promise<{ url: string; title: string }[]> {
  const url = `${origin}/?s=${encodeURIComponent(query)}&post_type=product`;
  try {
    const res = await fetcher(url);
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const out: { url: string; title: string }[] = [];
    const seen = new Set<string>();
    $('a[href*="/product/"], a[href*="/items/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || seen.has(href)) return;
      try {
        const u = new URL(href, origin);
        if (!/\/(product|items)\//.test(u.pathname)) return;
        const full = u.origin + u.pathname.replace(/\/+$/, '') + '/';
        seen.add(href);
        out.push({ url: full, title: $(el).text().trim() || '' });
      } catch { /* skip */ }
    });
    return out.slice(0, 6);
  } catch {
    return [];
  }
}

async function pageContainsBarcode(url: string, barcode: string, fetcher: Fetcher): Promise<boolean> {
  try {
    const res = await fetcher(url);
    if (!res.ok) return false;
    return (await res.text()).includes(barcode);
  } catch {
    return false;
  }
}

export interface DiscoveryResult {
  url: string;
  score: number;
  scrapedName: string | null;
}

type Candidate = { url: string; title: string; preScore: number };

/**
 * מוצא קישור מוצר לפי שם + ברקוד:
 * 1) חיפוש באתרי ספקים
 * 2) חיפוש גוגל (DuckDuckGo) באתרים ישראליים
 * 3) גריפה ואימות שם/ברקוד
 */
export async function discoverProductUrl(
  product: Pick<Product, 'name_he' | 'sku' | 'barcode'>,
  fetcher?: Fetcher
): Promise<DiscoveryResult | null> {
  const f = resolveFetcher(fetcher);
  const barcode = looksLikeBarcode(product.barcode) ? product.barcode!.trim()
    : looksLikeBarcode(product.sku) ? product.sku.trim() : null;

  const ranked: Candidate[] = [];
  const terms = searchTerms(product.name_he, product.sku);

  for (const origin of originsForProduct(product.name_he)) {
    for (const term of terms.slice(0, 2)) {
      const hits = await wooSearch(origin, term, f);
      for (const h of hits) {
        ranked.push({ url: h.url, title: h.title, preScore: nameScore(product.name_he, h.title) });
      }
    }
  }

  const webUrls = await searchIsraeliRetail(product.name_he, barcode, f);
  for (const url of webUrls) {
    ranked.push({ url, title: '', preScore: barcode && url.includes(barcode) ? 0.7 : 0.25 });
  }

  ranked.sort((a, b) => b.preScore - a.preScore);
  const seen = new Set<string>();
  const candidates = ranked.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  }).slice(0, 6);

  let best: DiscoveryResult | null = null;

  for (const cand of candidates) {
    try {
      if (barcode && (await pageContainsBarcode(cand.url, barcode, f))) {
        const scraped = await scrapeProductPage(cand.url, f);
        if (scraped.image_urls.length || scraped.desc_he) {
          return { url: cand.url, score: 0.92, scrapedName: scraped.name_he };
        }
      }
      const scraped = await scrapeProductPage(cand.url, f);
      if (!scraped.image_urls.length && !scraped.desc_he) continue;

      const score = Math.max(nameScore(product.name_he, scraped.name_he), cand.preScore);
      const barcodeOk = barcode && (
        scraped.barcode === barcode ||
        scraped.sku === barcode ||
        (await pageContainsBarcode(cand.url, barcode, f))
      );
      if (barcodeOk) {
        return { url: cand.url, score: Math.max(score, 0.88), scrapedName: scraped.name_he };
      }
      if (score >= 0.3 && (!best || score > best.score)) {
        best = { url: cand.url, score, scrapedName: scraped.name_he };
      }
    } catch {
      continue;
    }
  }

  return best && best.score >= 0.3 ? best : null;
}

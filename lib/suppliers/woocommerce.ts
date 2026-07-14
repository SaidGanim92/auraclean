import * as cheerio from 'cheerio';
import type { ScrapedProduct, Supplier } from '@/lib/types';
import { type Fetcher, type SupplierParser, parsePrice, looksLikeBarcode } from './types';
import { resolveFetcher } from './resolve-fetcher';

/**
 * פרסר WooCommerce גנרי — משרת את Tyroler, SAG וטאצ' (כולם בתבנית /product/).
 * אסטרטגיה:
 *   1) ניסיון ראשון: WooCommerce Store API  /wp-json/wc/store/v1/products?slug={slug}
 *      → JSON נקי ויציב (מחירים ב"יחידות מינימום", מלאי, קטגוריות, תמונות).
 *   2) fallback: פרסור תגיות meta (og:title/description/image, product:price:amount,
 *      product:availability, product:retailer_item_id) + גלריית wp-content/uploads.
 */

function slugFromUrl(url: string): string {
  const u = new URL(url);
  const parts = u.pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('product');
  return (idx >= 0 ? parts[idx + 1] : parts[parts.length - 1]) || '';
}

/** המרת מחיר Store API (minor units) למספר לפי currency_minor_unit */
function minorToNumber(value: string | number | undefined, minorUnit = 2): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (isNaN(n)) return null;
  return n / Math.pow(10, minorUnit);
}

function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || null;
}

/** ניסיון Store API */
async function parseViaStoreApi(
  url: string,
  supplier: Supplier,
  fetcher: Fetcher
): Promise<ScrapedProduct | null> {
  const u = new URL(url);
  const slug = slugFromUrl(url);
  if (!slug) return null;
  const apiUrl = `${u.origin}/wp-json/wc/store/v1/products?slug=${encodeURIComponent(slug)}`;
  let res;
  try {
    res = await fetcher(apiUrl);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let arr;
  try {
    arr = await res.json();
  } catch {
    return null;
  }
  const p = Array.isArray(arr) ? arr[0] : arr;
  if (!p || !p.name) return null;

  const minor = p.prices?.currency_minor_unit ?? 2;
  const current = minorToNumber(p.prices?.price, minor);
  const regular = minorToNumber(p.prices?.regular_price, minor);
  const sale = minorToNumber(p.prices?.sale_price, minor);
  const onSale = regular != null && current != null && regular > current;

  const images: string[] = Array.isArray(p.images)
    ? p.images.map((img: any) => img?.src).filter(Boolean)
    : [];
  const category =
    Array.isArray(p.categories) && p.categories.length ? String(p.categories[0].name) : null;

  // ברקוד: לרוב לא חשוף ב-Store API כשדה נפרד — מחפשים ב-meta_data (אם מסופק),
  // ואם לא, נופלים ל-sku (בחלק מהאתרים הישראלים ה-SKU הוא בעצם הברקוד).
  const metaBarcode = Array.isArray(p.meta_data)
    ? p.meta_data.find((m: any) => /barcode|gtin|ean/i.test(String(m?.key || '')))?.value
    : null;
  const barcode = looksLikeBarcode(metaBarcode)
    ? String(metaBarcode).trim()
    : looksLikeBarcode(p.sku)
      ? String(p.sku).trim()
      : null;

  return {
    sku: String(p.sku || p.id || '').trim() || `woo-${slug}`,
    source_url: url,
    supplier,
    name_he: String(p.name).trim(),
    category_he: category,
    desc_he: stripHtml(p.description || p.short_description),
    price: onSale && regular != null ? regular : current ?? 0,
    sale_price: onSale ? (sale ?? current) : null,
    on_sale: onSale,
    available: p.is_in_stock !== false,
    unit: null,
    image_urls: images,
    barcode,
  };
}

function cleanProductTitle(raw: string | null | undefined): string {
  const t = (raw || '').trim();
  if (!t) return '';
  // og:title של טאצ'/WooCommerce כולל שם האתר אחרי מקף
  return t.split(/\s+-\s+/)[0].trim() || t;
}

function elementorDescription($: cheerio.CheerioAPI): string | null {
  const parts: string[] = [];
  $('.elementor-widget-text-editor .elementor-widget-container').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (!t || t.length < 3) return;
    if (/צרכנים נכבדים|תווית המוצר|מדיניות/i.test(t)) return;
    parts.push(t);
  });
  return parts.length ? parts.join('\n') : null;
}

/** fallback: תגיות meta */
async function parseViaMeta(
  url: string,
  supplier: Supplier,
  fetcher: Fetcher
): Promise<ScrapedProduct> {
  const res = await fetcher(url);
  if (!res.ok) throw new Error(`טעינת עמוד המוצר נכשלה (${res.status})`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const meta = (prop: string) =>
    $(`meta[property="${prop}"]`).attr('content') ||
    $(`meta[name="${prop}"]`).attr('content') ||
    null;

  const h1 = $('h1.product_title, h1.elementor-heading-title').first().text().trim();
  const name = cleanProductTitle(h1) || cleanProductTitle(meta('og:title')) || cleanProductTitle($('title').text());
  const desc =
    elementorDescription($) ||
    meta('og:description') ||
    stripHtml($('.woocommerce-product-details__short-description').html()) ||
    stripHtml($('#tab-description').html()) ||
    stripHtml($('.woocommerce-Tabs-panel--description').html()) ||
    stripHtml($('.product-short-description').html()) ||
    stripHtml($('.entry-content').first().html());

  // תמונות: og:image + גלריה + תמונות Elementor/wp-content
  const imgSet = new Set<string>();
  const ogImg = meta('og:image');
  if (ogImg) imgSet.add(ogImg);
  $('.woocommerce-product-gallery__image img, img.wp-post-image, .elementor-widget-image img').each((_, el) => {
    const src = $(el).attr('data-large_image') || $(el).attr('data-src') || $(el).attr('src');
    if (src && /wp-content\/uploads/i.test(src)) imgSet.add(src.split('?')[0]);
  });

  // מחיר: מנסים תגית meta ייעודית, ואז את התג הסטנדרטי של WooCommerce
  // (span.woocommerce-Price-amount) — קיים בכל התמות, גם בלי product:price:amount.
  // .first() כי מוצרים "קשורים" בתחתית העמוד מוצגים אחרי מחיר המוצר הראשי ב-DOM.
  const priceScope = $(
    '.summary.entry-summary .price, .elementor-widget-woocommerce-product-price .price, ' +
      '.woocommerce-product-details .price, .single-product .price, p.price'
  ).first();
  const scope = priceScope.length ? priceScope : $('.price').first();
  const priceAmount = parsePrice(meta('product:price:amount'));
  const regular = parsePrice(scope.find('del .woocommerce-Price-amount, del .amount').first().text() || null);
  const saleAmt = parsePrice(scope.find('ins .woocommerce-Price-amount, ins .amount').first().text() || null);
  const plain = parsePrice(scope.find('.woocommerce-Price-amount, .amount').first().text() || null);
  const current = saleAmt ?? plain ?? priceAmount;
  const onSale = regular != null && current != null && regular > current;

  const availability = (meta('product:availability') || '').toLowerCase();
  const available = availability ? /instock|in stock/.test(availability) : true;

  const sku =
    meta('product:retailer_item_id') ||
    $('.sku').first().text().trim() ||
    slugFromUrl(url);

  if (!name) throw new Error('לא נמצא שם מוצר (og:title) — ייתכן שהאתר אינו WooCommerce סטנדרטי');

  // ברקוד: לרוב זה בעצם ה-SKU המוצג בדף; אם לא, מחפשים מילה "ברקוד"/"ean"
  // בטקסט העמוד ולוקחים את מספרות שאחריה.
  let barcode = looksLikeBarcode(sku) ? String(sku).trim() : null;
  if (!barcode) {
    const bodyText = $('body').text();
    const m = bodyText.match(/(?:ברקוד|ean)[^\d]{0,10}(\d{8,14})/i);
    if (m) barcode = m[1];
  }

  return {
    sku: String(sku).trim(),
    source_url: url,
    supplier,
    name_he: name,
    category_he: null,
    desc_he: desc || null,
    price: onSale && regular != null ? regular : current ?? 0,
    sale_price: onSale ? current : null,
    on_sale: onSale,
    available,
    unit: null,
    image_urls: [...imgSet],
    barcode,
  };
}

/** מפעל לפרסר WooCommerce לפי ספק ותבנית דומיין */
export function makeWooParser(supplier: Supplier, hostPattern: RegExp): SupplierParser {
  return {
    supplier,
    matches(url: string): boolean {
      try {
        return hostPattern.test(new URL(url).hostname);
      } catch {
        return false;
      }
    },
    async parse(url: string, fetcher?: Fetcher): Promise<ScrapedProduct> {
      const f = resolveFetcher(fetcher);
      const slug = slugFromUrl(url);
      // Store API של טאצ' לא מחזיר מוצרים עם סלאג בעברית — חוסך ~2.5 שניות המתנה.
      const viaApi = /^[\x20-\x7E]+$/.test(slug)
        ? await parseViaStoreApi(url, supplier, f)
        : null;
      if (viaApi) return viaApi;
      return parseViaMeta(url, supplier, f);
    },
  };
}

// ספקי WooCommerce — אמת את תבניות הדומיין מול קישורי הדוגמה
export const tyrolerParser = makeWooParser('tyroler', /(^|\.)tyroler\.co\.il$/i);
export const sagParser = makeWooParser('sag', /(^|\.)sagncs\.co\.il$/i);
export const touchParser = makeWooParser('touch', /(^|\.)touchonline\.co\.il$/i);

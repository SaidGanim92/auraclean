import * as cheerio from 'cheerio';
import type { ScrapedProduct } from '@/lib/types';
import { type Fetcher, parsePrice, looksLikeBarcode } from './types';
import { resolveFetcher } from './resolve-fetcher';

function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || null;
}

function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://');
}

/** גריפה גנרית מדף מוצר ישראלי (Shopify / WooCommerce / d-house וכו') */
export async function parseGenericRetail(url: string, fetcher?: Fetcher): Promise<ScrapedProduct> {
  const f = resolveFetcher(fetcher);
  const res = await f(url);
  if (!res.ok) throw new Error(`טעינת עמוד נכשלה (${res.status})`);
  const html = await res.text();
  const $ = cheerio.load(html);
  if (/Just a moment|cf-challenge|cloudflare/i.test(html)) {
    const hasProduct =
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('h1').first().text().trim();
    if (!hasProduct) {
      throw new Error(
        'האתר חוסם שליפה אוטומטית. נסה KSP (/web/item/…) או הזן את פרטי המוצר ידנית.'
      );
    }
  }

  const meta = (prop: string) =>
    $(`meta[property="${prop}"]`).attr('content') ||
    $(`meta[name="${prop}"]`).attr('content') ||
    null;

  let name =
    meta('og:title') ||
    $('h1').first().text().trim() ||
    $('.product_title').first().text().trim() ||
    $('title').text().trim().split('|')[0].trim();

  name = name.replace(/\s*שעות פעילות:.*$/i, '').trim();

  const desc =
    meta('og:description') ||
    stripHtml($('.woocommerce-product-details__short-description').html()) ||
    stripHtml($('.product-short-description').html()) ||
    stripHtml($('[class*="description"]').first().html());

  const imgSet = new Set<string>();
  const ogImg = meta('og:image');
  if (ogImg) imgSet.add(toHttps(ogImg));
  $('meta[property="og:image:secure_url"]').each((_, el) => {
    const c = $(el).attr('content');
    if (c) imgSet.add(toHttps(c));
  });
  $('.woocommerce-product-gallery__image img, img.wp-post-image, .product-image img, .product__media img').each((_, el) => {
    const src = $(el).attr('data-large_image') || $(el).attr('data-src') || $(el).attr('src');
    if (src && !/placeholder|spinner|1x1/i.test(src)) imgSet.add(toHttps(src));
  });

  const priceScope = $('.summary .price, .product-price, .price, [class*="price"]').first();
  const regular = parsePrice(priceScope.find('del .amount, del').first().text() || null);
  const saleAmt = parsePrice(priceScope.find('ins .amount, ins').first().text() || null);
  const plain = parsePrice(priceScope.find('.woocommerce-Price-amount, .amount').first().text() || null);
  const metaPrice = parsePrice(meta('product:price:amount'));
  const current = saleAmt ?? plain ?? metaPrice;
  const onSale = regular != null && current != null && regular > current;

  const bodyText = $('body').text();
  let barcode: string | null = null;
  const skuText = $('.sku').first().text().replace(/[^\d]/g, '');
  if (looksLikeBarcode(skuText)) barcode = skuText;
  if (!barcode) {
    const m = bodyText.match(/(?:ברקוד|ean|gtin)[^\d]{0,12}(\d{8,14})/i)
      || url.match(/(\d{13}|\d{12}|\d{8})/);
    if (m) barcode = m[1];
  }

  const slug = new URL(url).pathname.split('/').filter(Boolean).pop() || 'item';

  if (!name) throw new Error('לא נמצא שם מוצר בדף');

  return {
    sku: barcode || slug,
    source_url: url,
    supplier: 'manual',
    name_he: name,
    category_he: null,
    desc_he: desc,
    price: onSale && regular != null ? regular : current ?? 0,
    sale_price: onSale ? current : null,
    on_sale: onSale,
    available: true,
    unit: null,
    image_urls: [...imgSet].filter(Boolean).slice(0, 6),
    barcode,
  };
}

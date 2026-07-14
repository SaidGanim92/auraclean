import type { ScrapedProduct } from '@/lib/types';
import { type Fetcher, parsePrice } from './types';
import { resolveFetcher } from './resolve-fetcher';

const KSP_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';

/** מזהה מוצר מקישור KSP (web/mob) */
export function extractKspItemId(url: string): string | null {
  const m = url.match(/ksp\.co\.il\/(?:web|mob)\/item\/(\d+)/i);
  return m ? m[1] : null;
}

export function matchesKsp(url: string): boolean {
  return /(^|\.)ksp\.co\.il$/i.test(new URL(url).hostname) && !!extractKspItemId(url);
}

function canonicalKspUrl(id: string): string {
  return `https://ksp.co.il/web/item/${id}`;
}

function collectImageUrls(payload: unknown, uin: string, out: Set<string>): void {
  if (!payload) return;
  if (typeof payload === 'string') {
    if (/ksp\.co\.il\/shop\/items\//i.test(payload) && payload.includes(uin)) {
      out.add(payload.replace(/\\+$/, '').trim());
    }
    return;
  }
  if (Array.isArray(payload)) {
    payload.forEach((v) => collectImageUrls(v, uin, out));
    return;
  }
  if (typeof payload === 'object') {
    Object.values(payload as Record<string, unknown>).forEach((v) => collectImageUrls(v, uin, out));
  }
}

/** גריפת מוצר מ-KSP דרך ה-API הפנימי (עוקף Cloudflare בדף HTML) */
export async function parseKsp(url: string, fetcher?: Fetcher): Promise<ScrapedProduct> {
  const f = resolveFetcher(fetcher);
  const id = extractKspItemId(url);
  if (!id) throw new Error('קישור KSP לא תקין — צפוי /web/item/מספר');

  const apiUrl = `https://ksp.co.il/m_action/api/item/${id}`;
  const res = await f(apiUrl, {
    headers: {
      'user-agent': KSP_UA,
      accept: 'application/json, text/plain, */*',
      referer: `https://ksp.co.il/mob/item/${id}`,
      'accept-language': 'he-IL,he;q=0.9',
    },
  });

  if (!res.ok) {
    throw new Error(`KSP: טעינת מוצר נכשלה (${res.status})`);
  }

  const json = (await res.json()) as {
    status?: number;
    result?: { data?: Record<string, unknown> };
  };

  const data = json?.result?.data;
  if (!data?.name) {
    throw new Error('KSP: המוצר לא נמצא או שאינו זמין');
  }

  const uin = String(data.uin ?? id);
  const name = String(data.name).trim();
  const desc = [data.smalldesc, data.desc].find((v) => typeof v === 'string' && v.trim()) as string | undefined;

  const price = parsePrice(data.price as number | string) ?? 0;
  const club = parsePrice((data as { bms_price?: number }).bms_price);
  const onSale = club != null && club > 0 && club < price;

  const imgSet = new Set<string>();
  collectImageUrls(json, uin, imgSet);
  if (!imgSet.size) {
    imgSet.add(`https://ksp.co.il/shop/items/512/${uin}.jpg`);
    imgSet.add(`https://ksp.co.il/shop/items/128/${uin}.jpg`);
  }

  const uinsql = data.uinsql != null ? String(data.uinsql).trim() : '';
  const sku = uinsql && /^\d+$/.test(uinsql) ? uinsql : `ksp-${uin}`;

  return {
    sku,
    source_url: canonicalKspUrl(id),
    supplier: 'manual',
    name_he: name,
    category_he: null,
    desc_he: desc?.trim() || null,
    price: onSale ? price : price,
    sale_price: onSale ? club : null,
    on_sale: onSale,
    available: true,
    unit: null,
    image_urls: [...imgSet].slice(0, 6),
    barcode: /^\d{8,14}$/.test(uinsql) ? uinsql : null,
  };
}

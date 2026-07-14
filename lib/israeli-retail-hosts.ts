/** דומיינים ישראליים מורשים לחיפוש/העשרה (מוצרי ניקיון ומכולת) */

export const ISRAELI_RETAIL_HOSTS = [
  // ספקים רשמיים
  'jacobi.co.il', 'www.jacobi.co.il',
  'jaiusi.co.il', 'www.jaiusi.co.il',
  'johnsonclean.co.il', 'www.johnsonclean.co.il',
  'tyroler.co.il', 'www.tyroler.co.il',
  'sagncs.co.il', 'www.sagncs.co.il',
  'touchonline.co.il', 'www.touchonline.co.il',
  // קמעונאות / מפיצים
  'd-house.co.il', 'www.d-house.co.il',
  'cosmetix.co.il', 'www.cosmetix.co.il',
  'comses.co.il', 'www.comses.co.il',
  'superhome.co.il', 'www.superhome.co.il',
  'shop.super-pharm.co.il',
  'bug.co.il', 'www.bug.co.il',
  'zap.co.il', 'www.zap.co.il',
  'ksp.co.il', 'www.ksp.co.il',
  'payngo.co.il', 'www.payngo.co.il',
  'machsaneyhashmal.co.il', 'www.machsaneyhashmal.co.il',
  'shufersal.co.il', 'www.shufersal.co.il',
  'victoryonline.co.il', 'www.victoryonline.co.il',
  'ace.co.il', 'www.ace.co.il',
  'hornbach.co.il', 'www.hornbach.co.il',
  'brandtools.co.il', 'www.brandtools.co.il',
  'super-pharm.co.il', 'www.super-pharm.co.il',
  'pharmashopi.co.il', 'www.pharmashopi.co.il',
  'homeday.co.il', 'www.homeday.co.il',
  'lastprice.co.il', 'www.lastprice.co.il',
  'snonitshop.co.il', 'www.snonitshop.co.il',
];

/** CDNים לתמונות ממקורות קמעונאות */
export const ISRAELI_IMAGE_CDN_HOSTS = [
  'd3m9l0v76dty0.cloudfront.net',
  'cdn.shopify.com',
  'cdn.shopifycdn.com',
  ...ISRAELI_RETAIL_HOSTS,
];

/** האם נתיב נראה כמו דף מוצר (לא קטגוריה/חיפוש) */
export function looksLikeProductPath(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (/\/(category|categories|collections|catalog|search|cart|login|account|brand)(\/|$)/.test(p)) return false;
  if (/\/c\/|\/b_|brandtools\.co\.il\/productslist/.test(p) && !/\/product/.test(p)) return false;
  return /\/(product|products|items|mob\/item)\/|\/p\/\d|8420822|72900|50600/.test(p);
}

export function hostIsIsraeliRetail(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return ISRAELI_RETAIL_HOSTS.some((h) => host === h || host.endsWith('.' + h.replace(/^www\./, '')));
}

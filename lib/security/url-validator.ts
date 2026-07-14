/** דומיינים מורשים לגריפת מוצרים מספקים */
import { ISRAELI_IMAGE_CDN_HOSTS, ISRAELI_RETAIL_HOSTS } from '@/lib/israeli-retail-hosts';

const SUPPLIER_HOSTS = [
  'jacobi.co.il',
  'www.jacobi.co.il',
  'jaiusi.co.il',
  'www.jaiusi.co.il',
  'tyroler.co.il',
  'www.tyroler.co.il',
  'sagncs.co.il',
  'www.sagncs.co.il',
  'touchonline.co.il',
  'www.touchonline.co.il',
  'johnsonclean.co.il',
  'www.johnsonclean.co.il',
];

/** CDNים מורשים להורדת תמונות */
const IMAGE_CDN_HOSTS = [
  'cdn.shopify.com',
  'cdn.shopifycdn.com',
  ...ISRAELI_IMAGE_CDN_HOSTS,
  ...SUPPLIER_HOSTS,
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  'metadata.google.internal',
]);

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

/** IPv6 מקומי/פרטי ב-hostname */
function isPrivateIpv6Host(host: string): boolean {
  const h = host.toLowerCase();
  if (h === '::1' || h === '[::1]') return true;
  if (h.startsWith('fe80:') || h.startsWith('[fe80:')) return true;
  if (/^f[cd][0-9a-f]{0,2}:/i.test(h) || /^\[f[cd]/i.test(h)) return true;
  return false;
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, '');
}

function hostAllowed(hostname: string, allowlist: string[]): boolean {
  const host = normalizeHost(hostname);
  if (BLOCKED_HOSTNAMES.has(host)) return false;
  if (isPrivateIpv4(host) || isPrivateIpv6Host(host)) return false;
  if (host.endsWith('.local') || host.endsWith('.internal')) return false;
  return allowlist.some((allowed) => host === allowed || host.endsWith('.' + allowed));
}

export class UrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UrlValidationError';
  }
}

/** אימות כתובת לגריפת מוצר מספק — HTTPS בלבד, דומיין מורשה */
export function validateSupplierUrl(raw: string): string {
  return validateUrlHost(raw, SUPPLIER_HOSTS, 'דומיין הספק אינו ברשימת המורשים');
}

/** אימות כתובת לגריפה מקמעונאות ישראלית (העשרה מגוגל/אתרים שונים) */
export function validateRetailUrl(raw: string): string {
  return validateUrlHost(raw, [...SUPPLIER_HOSTS, ...ISRAELI_RETAIL_HOSTS], 'דומיין הקמעונאות אינו ברשימת המורשים');
}

function validateUrlHost(raw: string, allowlist: string[], denyMsg: string): string {
  const parsed = validatePublicHttpsBase(raw);
  if (!hostAllowed(parsed.hostname, allowlist)) {
    throw new UrlValidationError(denyMsg);
  }
  return parsed.toString();
}

/** אימות כתובת HTTPS ציבורית — ללא רשימת דומיינים (העשרה מכל אתר, SSRF מוגן) */
function validatePublicHttpsBase(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new UrlValidationError('כתובת לא תקינה');
  }
  if (parsed.protocol !== 'https:') {
    throw new UrlValidationError('רק כתובות HTTPS מורשות');
  }
  if (parsed.username || parsed.password) {
    throw new UrlValidationError('כתובת עם פרטי התחברות אינה מורשית');
  }
  const port = parsed.port ? Number(parsed.port) : 443;
  if (port !== 443) {
    throw new UrlValidationError('פורט לא סטנדרטי אינו מורשה');
  }
  const host = normalizeHost(parsed.hostname);
  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new UrlValidationError('כתובת לא מורשית');
  }
  if (isPrivateIpv4(host) || isPrivateIpv6Host(host)) {
    throw new UrlValidationError('כתובת לא מורשית');
  }
  if (host.endsWith('.local') || host.endsWith('.internal')) {
    throw new UrlValidationError('כתובת לא מורשית');
  }
  return parsed;
}

export function validatePublicHttpsUrl(raw: string): string {
  return validatePublicHttpsBase(raw).toString();
}

/** אימות כתובת להורדת תמונה — HTTPS, דומיין מורשה, ללא IP פרטי */
export function validateImageUrl(raw: string): string {
  const normalized = raw.trim().replace(/^http:\/\//i, 'https://');
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new UrlValidationError('כתובת תמונה לא תקינה');
  }
  if (parsed.protocol !== 'https:') {
    throw new UrlValidationError('תמונות חייבות להיות ב-HTTPS');
  }
  if (parsed.username || parsed.password) {
    throw new UrlValidationError('כתובת תמונה עם פרטי התחברות אינה מורשית');
  }
  const host = normalizeHost(parsed.hostname);
  // Supabase Storage
  if (/\.supabase\.(co|in)$/i.test(host)) return parsed.toString();
  if (!hostAllowed(host, IMAGE_CDN_HOSTS)) {
    throw new UrlValidationError('מקור תמונה לא מורשה');
  }
  return parsed.toString();
}

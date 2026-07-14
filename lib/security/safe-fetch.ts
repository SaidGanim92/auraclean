import 'server-only';
import dns from 'node:dns/promises';
import { validatePublicHttpsUrl, UrlValidationError } from '@/lib/security/url-validator';

const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 15_000;

/** חוסם IP פרטי / מקומי (IPv4 + IPv6) */
export function isBlockedIp(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === '::1') return true;
  if (lower.startsWith('fe80:')) return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  return false;
}

/** DNS resolve + חסימת כתובות פנימיות לפני fetch (מניעת SSRF) */
export async function assertPublicHostname(hostname: string): Promise<void> {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new UrlValidationError('כתובת לא מורשית');
  }
  let records: { address: string; family: number }[];
  try {
    records = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    throw new UrlValidationError('לא ניתן לפתור את שם המארח');
  }
  if (!records.length) throw new UrlValidationError('לא ניתן לפתור את שם המארח');
  for (const r of records) {
    if (isBlockedIp(r.address)) {
      throw new UrlValidationError('כתובת לא מורשית');
    }
  }
}

/**
 * fetch מאובטח: HTTPS בלבד, ללא redirect אוטומטי, אימות כל hop + DNS.
 */
export async function safeHttpsFetch(
  rawUrl: string,
  init?: RequestInit
): Promise<Response> {
  let current = validatePublicHttpsUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(current);
    await assertPublicHostname(parsed.hostname);

    const res = await fetch(current, {
      ...init,
      redirect: 'manual',
      signal: init?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location');
      if (!loc) throw new UrlValidationError('הפניה ללא יעד');
      current = validatePublicHttpsUrl(new URL(loc, current).toString());
      continue;
    }

    return res;
  }

  throw new UrlValidationError('יותר מדי הפניות');
}

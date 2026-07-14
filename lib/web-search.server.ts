import { hostIsIsraeliRetail, looksLikeProductPath } from '@/lib/israeli-retail-hosts';
import { type Fetcher } from '@/lib/suppliers/types';
import { resolveFetcher } from '@/lib/suppliers/resolve-fetcher';

/** חילוץ קישורים מתוצאות DuckDuckGo HTML */
function extractDdgLinks(html: string): string[] {
  const links = new Set<string>();
  for (const m of html.matchAll(/uddg=([^&"]+)/g)) {
    try {
      const decoded = decodeURIComponent(m[1]);
      const u = new URL(decoded);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') continue;
      const https = decoded.replace(/^http:\/\//i, 'https://');
      links.add(https.split('?')[0].replace(/\/+$/, '') + (/\/product/.test(u.pathname) ? '/' : ''));
    } catch { /* skip */ }
  }
  return [...links];
}

async function ddgSearch(query: string, fetcher: Fetcher): Promise<string[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetcher(url);
    if (!res.ok) return [];
    return extractDdgLinks(await res.text());
  } catch {
    return [];
  }
}

function filterProductUrls(urls: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    try {
      const u = new URL(raw.replace(/^http:\/\//i, 'https://'));
      if (!hostIsIsraeliRetail(u.hostname)) continue;
      if (!looksLikeProductPath(u.pathname)) continue;
      const key = u.origin + u.pathname;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(u.toString());
    } catch { /* skip */ }
  }
  return out;
}

/** חיפוש מוצר באתרים ישראליים — שם, ברקוד, שילובים */
export async function searchIsraeliRetail(
  name: string,
  barcode: string | null,
  fetcher?: Fetcher
): Promise<string[]> {
  const f = resolveFetcher(fetcher);
  const shortName = name.split(/\s+/).slice(0, 6).join(' ');
  const queries: string[] = [];

  if (barcode) {
    queries.push(`"${barcode}"`);
    queries.push(`${barcode} ${shortName.split(/\s+/).slice(0, 3).join(' ')}`);
    queries.push(`${barcode} site:co.il`);
  }
  queries.push(`${shortName} site:co.il`);
  queries.push(`${shortName} ניקוי site:co.il`);

  const all: string[] = [];
  for (const q of queries.slice(0, 4)) {
    const links = await ddgSearch(q, f);
    all.push(...links);
    if (all.length >= 10) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  return filterProductUrls(all).slice(0, 8);
}

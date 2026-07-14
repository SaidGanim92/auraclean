/** תרגום חופשי HE→AR (Google gtx) — ללא server-only, לשימוש בסקריפטים ו-enrich */

export async function freeTranslateHeAr(text: string): Promise<string> {
  const src = (text || '').trim();
  if (!src) return '';
  const maxLen = 450;
  if (src.length <= maxLen) return freeTranslateChunk(src);
  const parts: string[] = [];
  let rest = src;
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf('\n', maxLen);
    if (cut < maxLen * 0.5) cut = rest.lastIndexOf(' ', maxLen);
    if (cut < 1) cut = maxLen;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) parts.push(rest);
  const out = await Promise.all(parts.map(freeTranslateChunk));
  return out.join('');
}

async function freeTranslateChunk(text: string): Promise<string> {
  const url =
    'https://translate.googleapis.com/translate_a/single' +
    `?client=gtx&sl=he&tl=ar&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; AuraCleanBot/1.0)' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Free Google Translate ${res.status}`);
  const data = await res.json();
  const segments = Array.isArray(data?.[0]) ? data[0] : [];
  return segments.map((seg: unknown[]) => seg?.[0] || '').join('') || text;
}

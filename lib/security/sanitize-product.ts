import 'server-only';
import { validatePublicHttpsUrl, UrlValidationError } from '@/lib/security/url-validator';
import { normalizeProductUrl } from '@/lib/url-utils';

const MAX_IMAGES = 6;

export function isHostedStorageUrl(url: string): boolean {
  try {
    return /\.supabase\.(co|in)$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** אימות source_url לפני שמירה */
export function sanitizeSourceUrl(raw: string | null | undefined): string | null {
  const s = (raw || '').trim();
  if (!s) return null;
  return validatePublicHttpsUrl(normalizeProductUrl(s));
}

/**
 * תמונות במסד — רק Supabase Storage (או ריק).
 * הוספת תמונות חיצוניות רק דרך addProductImagesFromUrls / העשרה.
 */
export function sanitizeStoredImages(images: string[] | null | undefined): string[] {
  if (!images?.length) return [];
  const out: string[] = [];
  for (const raw of images) {
    const url = (raw || '').trim();
    if (!url) continue;
    if (!isHostedStorageUrl(url)) {
      throw new UrlValidationError('תמונות במסד חייבות להיות מאוחסנות ב-Supabase בלבד');
    }
    if (!out.includes(url)) out.push(url);
    if (out.length >= MAX_IMAGES) break;
  }
  return out;
}

/** אימות URL-ים להורדה (לפני fetch) */
export function sanitizeDownloadImageUrls(urls: string[] | null | undefined, max = MAX_IMAGES): string[] {
  if (!urls?.length) return [];
  const out: string[] = [];
  for (const raw of urls) {
    const url = (raw || '').trim();
    if (!url) continue;
    const safe = validatePublicHttpsUrl(url);
    if (!out.includes(safe)) out.push(safe);
    if (out.length >= max) break;
  }
  return out;
}

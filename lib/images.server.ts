import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateImageUrl, validatePublicHttpsUrl, UrlValidationError } from '@/lib/security/url-validator';
import { safeHttpsFetch } from '@/lib/security/safe-fetch';

const BUCKET = 'product-images';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** אימות magic bytes — מונע העלאת קבצים מזויפים לפי Content-Type */
function validateImageMagicBytes(buf: Buffer, contentType: string): boolean {
  if (buf.length < 12) return false;
  if (/jpe?g/.test(contentType)) {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (/png/.test(contentType)) {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (/gif/.test(contentType)) {
    return buf.toString('ascii', 0, 3) === 'GIF';
  }
  if (/webp/.test(contentType)) {
    return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}

// הורדת תמונות מהספק והעלאתן ל-Supabase Storage.
// מחזיר מערך URLs ציבוריים באחסון שלנו. אם ההעלאה נכשלה — מדלג על אותה תמונה.
export async function downloadImagesToStorage(
  imageUrls: string[],
  sku: string,
  max = 6,
  opts?: { allowAnyHttpsHost?: boolean }
): Promise<string[]> {
  const supabase = createAdminClient();
  const out: string[] = [];
  const safeSku = sku.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'item';

  for (let i = 0; i < imageUrls.length && out.length < max; i++) {
    const src = imageUrls[i];
    try {
      const safeSrc = opts?.allowAnyHttpsHost ? validatePublicHttpsUrl(src) : validateImageUrl(src);
      const res = await safeHttpsFetch(safeSrc, {
        headers: { accept: 'image/*' },
      });
      if (!res.ok) continue;

      const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
        console.warn('סוג תמונה לא מורשה:', contentType, safeSrc);
        continue;
      }

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) {
        console.warn('גודל תמונה לא תקין:', buf.length, safeSrc);
        continue;
      }
      if (!validateImageMagicBytes(buf, contentType)) {
        console.warn('magic bytes לא תואמים ל-Content-Type:', contentType, safeSrc);
        continue;
      }

      const ext = extFromType(contentType) || extFromUrl(safeSrc) || 'jpg';
      const path = `${safeSku}/${Date.now()}-${i}.${ext}`;

      const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
        contentType,
        upsert: true,
      });
      if (error) {
        console.warn('העלאת תמונה נכשלה:', error.message);
        continue;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (data?.publicUrl) out.push(data.publicUrl);
    } catch (err) {
      if (err instanceof UrlValidationError) {
        console.warn('כתובת תמונה נחסמה:', src, err.message);
      } else {
        console.warn('הורדת תמונה נכשלה:', src, err);
      }
    }
  }
  return out;
}

function extFromType(type: string): string | null {
  if (/png/.test(type)) return 'png';
  if (/webp/.test(type)) return 'webp';
  if (/jpe?g/.test(type)) return 'jpg';
  if (/gif/.test(type)) return 'gif';
  return null;
}
function extFromUrl(url: string): string | null {
  const m = url.split('?')[0].match(/\.(png|jpe?g|webp|gif)$/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : null;
}

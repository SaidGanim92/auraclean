import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { buildImportPreview } from '@/lib/import.server';
import { validatePublicHttpsUrl, UrlValidationError } from '@/lib/security/url-validator';

// POST /api/admin/import  { url }  →  ImportPreview
// מזהה ספק אוטומטית, גורף, מתרגם ובודק כפילות. מוגן ל-Admin בלבד.
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 });
  }
  let url: string;
  try {
    const body = await request.json();
    url = String(body.url || '').trim();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }
  if (!url) {
    return NextResponse.json({ error: 'יש להזין כתובת מוצר תקינה' }, { status: 400 });
  }
  try {
    url = validatePublicHttpsUrl(url);
  } catch (err) {
    const msg = err instanceof UrlValidationError ? err.message : 'כתובת לא תקינה';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  try {
    const preview = await buildImportPreview(url);
    return NextResponse.json({ preview });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'שגיאת ייבוא';
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}

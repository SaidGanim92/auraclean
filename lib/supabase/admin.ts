import 'server-only';

// Supabase client עם service-role — עוקף RLS. צד שרת בלבד!
// משמש לכתיבת/עדכון מוצרים ולהעלאת תמונות ל-Storage מתוך ה-Admin.
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

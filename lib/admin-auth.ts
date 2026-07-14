import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

const DEMO_USER = { email: 'demo@auraclean.local' } as const;

/** מצב הדגמה — רק בפיתוח מקומי עם ALLOW_DEMO_ADMIN=true, לעולם לא בפרודקשן */
export function isDemoMode(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.ALLOW_DEMO_ADMIN === 'true' &&
    !isSupabaseConfigured()
  );
}

function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
}

/** האם ADMIN_EMAIL מוגדר (חובה בפרודקשן) */
export function isAdminEmailConfigured(): boolean {
  return getAdminEmail().length > 0;
}

function isAuthorizedAdmin(email: string | undefined | null): boolean {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return false;
  return email?.toLowerCase().trim() === adminEmail;
}

/**
 * מאמת שהמשתמש מחובר ושהוא ה-Admin המורשה (ADMIN_EMAIL).
 * מחזיר את המשתמש, או מפנה ל-login / זורק אם אינו מורשה.
 */
export async function requireAdmin() {
  if (isDemoMode()) return DEMO_USER;

  if (!isSupabaseConfigured()) {
    redirect('/admin/login?error=not_configured');
  }
  if (!isAdminEmailConfigured()) {
    redirect('/admin/login?error=no_admin_email');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  if (!isAuthorizedAdmin(user.email)) {
    await supabase.auth.signOut();
    redirect('/admin/login?forbidden=1');
  }
  return user;
}

/** בדיקה שקטה (ל-Route Handlers) — מחזיר true/false ללא redirect */
export async function isAdminRequest(): Promise<boolean> {
  try {
    if (isDemoMode()) return true;
    if (!isSupabaseConfigured() || !isAdminEmailConfigured()) return false;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    return isAuthorizedAdmin(user.email);
  } catch {
    return false;
  }
}

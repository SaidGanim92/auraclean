import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from './config';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
}

function isAuthorizedAdmin(email: string | undefined | null): boolean {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return false;
  return email?.toLowerCase().trim() === adminEmail;
}

function isProtectedAdminPath(pathname: string): boolean {
  return (
    (pathname.startsWith('/admin') && pathname !== '/admin/login') ||
    pathname.startsWith('/api/admin')
  );
}

// מרענן את ה-session ומגן על נתיבי /admin ו-/api/admin.
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Supabase לא מחובר — בפרודקשן חוסמים; בפיתוח מאפשרים מצב הדגמה רק עם ALLOW_DEMO_ADMIN
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEMO_ADMIN === 'true') {
      return NextResponse.next({ request });
    }
    if (isProtectedAdminPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('error', 'not_configured');
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  // ADMIN_EMAIL חובה בפרודקשן
  if (!getAdminEmail() && isProtectedAdminPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('error', 'no_admin_email');
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = pathname === '/admin/login';

  if (isProtectedAdminPath(pathname)) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    if (!isAuthorizedAdmin(user.email)) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('forbidden', '1');
      return NextResponse.redirect(url);
    }
  }

  // אם מחובר כ-admin וגולש ל-login — הפנה ללוח הניהול
  if (isLogin && user && isAuthorizedAdmin(user.email)) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/products';
    return NextResponse.redirect(url);
  }

  return response;
}

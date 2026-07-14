import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

// מריץ את ה-middleware על נתיבי ניהול (דפים + API)
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

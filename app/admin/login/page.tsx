'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { safeAdminRedirect } from '@/lib/security/redirect';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="admin-login" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const forbidden = params.get('forbidden');
  const configError = params.get('error');
  const redirectTo = safeAdminRedirect(params.get('redirect'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('התחברות נכשלה: ' + error.message);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="admin-login">
      <div className="admin-card" style={{ maxWidth: 400, width: '100%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.png" alt="AURA CLEAN" style={{ height: 56, margin: '0 auto 16px' }} />
        <h1 style={{ textAlign: 'center', fontSize: '1.3rem' }}>כניסת מנהל</h1>
        {forbidden && <p className="admin-error">משתמש זה אינו מורשה לניהול.</p>}
        {configError === 'not_configured' && (
          <p className="admin-error">המערכת לא מוגדרת. מלא את פרטי Supabase ב-.env.local.</p>
        )}
        {configError === 'no_admin_email' && (
          <p className="admin-error">חסר ADMIN_EMAIL בהגדרות. הגדר את אימייל המנהל ב-.env.local.</p>
        )}
        <form onSubmit={submit} className="checkout-form" style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="email">אימייל</label>
            <input id="email" type="email" dir="ltr" autoComplete="username" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">סיסמה</label>
            <input id="password" type="password" dir="ltr" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="admin-error">{error}</p>}
          <button type="submit" className="btn btn-gradient btn-block btn-lg" disabled={loading}>
            {loading ? 'מתחבר…' : 'התחברות'}
          </button>
        </form>
      </div>
    </div>
  );
}

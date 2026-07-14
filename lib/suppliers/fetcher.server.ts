import 'server-only';
import { safeHttpsFetch } from '@/lib/security/safe-fetch';
import type { Fetcher } from './types';

/** fetcher ברירת מחדל — fetch מאובטח (ללא redirect אוטומטי, DNS מוגן) */
export const defaultFetcher: Fetcher = async (url, init) => {
  const res = await safeHttpsFetch(url, {
    ...init,
    headers: {
      'user-agent':
        'Mozilla/5.0 (compatible; AuraCleanBot/1.0; +https://auraclean.example)',
      accept: 'text/html,application/json',
      ...(init?.headers || {}),
    },
  });
  return {
    ok: res.ok,
    status: res.status,
    text: () => res.text(),
    json: () => res.json(),
  };
};

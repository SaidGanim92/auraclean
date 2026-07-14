import type { Fetcher } from './types';

let cachedDefault: Fetcher | undefined;

/** ברירת מחדל ל-fetch — נטען רק בזמן ריצה (לא בייבוא), כדי לא לשבור בדיקות עם mock fetcher */
export function resolveFetcher(fetcher?: Fetcher): Fetcher {
  if (fetcher) return fetcher;
  if (!cachedDefault) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedDefault = require('./fetcher.server').defaultFetcher as Fetcher;
  }
  return cachedDefault;
}

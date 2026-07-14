'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18N, type Lang, type TKey, detectLang } from '@/lib/i18n/dict';

const LANG_KEY = 'auraclean_lang';

interface I18nCtx {
  lang: Lang;
  t: (key: TKey) => string;
  setLang: (l: Lang) => void;
  ready: boolean; // האם קריאת ההעדפה מהדפדפן הושלמה (למניעת הבהוב)
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('he');
  const [ready, setReady] = useState(false);

  // זיהוי שפה בצד הלקוח (localStorage גובר על שפת הדפדפן)
  useEffect(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(LANG_KEY) : null;
    const detected = detectLang(saved, navigator.language);
    setLangState(detected);
    setReady(true);
  }, []);

  // עדכון <html lang/dir> בכל שינוי שפה
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = I18N[lang].dir;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
  }, []);

  const t = useCallback((key: TKey) => I18N[lang][key] ?? I18N.he[key] ?? key, [lang]);

  const value = useMemo(() => ({ lang, t, setLang, ready }), [lang, t, setLang, ready]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n חייב להיות בתוך I18nProvider');
  return ctx;
}

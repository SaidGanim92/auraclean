'use client';

import { useI18n } from '@/components/providers/I18nProvider';

export function LanguageSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label="בחירת שפה / اختيار اللغة">
      <button type="button" aria-pressed={lang === 'he'} onClick={() => setLang('he')}>
        עברית
      </button>
      <button type="button" aria-pressed={lang === 'ar'} onClick={() => setLang('ar')}>
        العربية
      </button>
    </div>
  );
}

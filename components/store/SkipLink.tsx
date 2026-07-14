'use client';

import { useI18n } from '@/components/providers/I18nProvider';

export function SkipLink() {
  const { t } = useI18n();
  return <a href="#main" className="skip-link">{t('skip_to_content')}</a>;
}

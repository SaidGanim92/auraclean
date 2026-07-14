'use client';

import { useMemo } from 'react';
import { CATEGORY_OPTIONS, categoryArabic, resolveCategoryHe } from '@/lib/category-ar';

/** בחירת קטגוריה מרשימה — ממלא אוטומטית גם ערבית */
export function CategorySelect({
  categoryHe,
  categoryAr,
  onChange,
  label = 'קטגוריה',
}: {
  categoryHe: string | null | undefined;
  categoryAr: string | null | undefined;
  onChange: (patch: { category_he: string; category_ar: string }) => void;
  label?: string;
}) {
  const current = resolveCategoryHe(categoryHe, categoryAr);

  const options = useMemo(() => {
    if (current && !CATEGORY_OPTIONS.some((o) => o.key === current)) {
      return [{ key: current, labelHe: current, labelAr: (categoryAr || '').trim() }, ...CATEGORY_OPTIONS];
    }
    return CATEGORY_OPTIONS;
  }, [current, categoryAr]);

  return (
    <div className="field">
      <label>{label}</label>
      <select
        value={current}
        onChange={(e) => {
          const he = e.target.value;
          onChange({ category_he: he, category_ar: categoryArabic(he) || '' });
        }}
      >
        <option value="">— בחר קטגוריה —</option>
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.labelHe}
          </option>
        ))}
      </select>
      {current && categoryAr && (
        <p className="admin-hint" style={{ marginTop: 4 }} dir="rtl">
          ערבית: {categoryAr}
        </p>
      )}
    </div>
  );
}

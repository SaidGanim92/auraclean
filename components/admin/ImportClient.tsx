'use client';

import { useMemo, useState } from 'react';
import type { ImportPreview } from '@/lib/types';
import { saveProductFromImport } from '@/app/admin/actions';
import { CategorySelect } from './CategorySelect';

// זיהוי ספק בסיסי בצד לקוח (רק לרמז ויזואלי; הזיהוי המחייב בשרת)
function guessSupplier(url: string): string {
  try {
    const h = new URL(url).hostname;
    if (/ksp\.co\.il/.test(h)) return 'KSP';
    if (/jacobi\.co\.il/.test(h) || /\/products\//.test(url)) return 'יעקובי (Shopify)';
    if (/tyroler\.co\.il/.test(h)) return 'Tyroler (WooCommerce)';
    if (/sagncs\.co\.il/.test(h)) return 'SAG (WooCommerce)';
    if (/touchonline\.co\.il/.test(h)) return "טאצ' (WooCommerce)";
  } catch {}
  return '';
}

type Draft = ImportPreview & { published: boolean; featured: boolean };

export function ImportClient() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const detected = useMemo(() => guessSupplier(url), [url]);

  async function runImport() {
    setLoading(true); setError(''); setDraft(null); setSavedMsg('');
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ייבוא נכשל');
      setDraft({ ...data.preview, published: true, featured: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה');
    } finally {
      setLoading(false);
    }
  }

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  async function save() {
    if (!draft) return;
    setSaving(true); setError('');
    const res = await saveProductFromImport({
      ...draft,
      price: Number(draft.price),
      sale_price: draft.sale_price != null && String(draft.sale_price) !== '' ? Number(draft.sale_price) : null,
      unit: draft.unit,
    });
    setSaving(false);
    if (res.ok) {
      setSavedMsg('המוצר נשמר ופורסם בהצלחה ✓');
      setDraft(null);
      setUrl('');
    } else {
      setError('שמירה נכשלה: ' + res.error);
    }
  }

  return (
    <div>
      <div className="admin-card">
        <label className="field">
          <span>קישור מוצר (KSP, ספק, או כל אתר)</span>
          <input dir="ltr" placeholder="https://…/product/…"
            value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
        <div className="flex-wrap">
          <button className="btn btn-gradient" onClick={runImport} disabled={loading || !url.trim()}>
            {loading ? 'שולף…' : 'שליפת נתונים'}
          </button>
          {detected && <span className="admin-hint">ספק מזוהה: <b>{detected}</b></span>}
        </div>
        {error && <p className="admin-error">{error}</p>}
        {savedMsg && <p className="admin-success">{savedMsg}</p>}
      </div>

      {draft && (
        <div className="admin-card mt-3">
          <h2>תצוגה מקדימה — ניתן לעריכה לפני שמירה</h2>
          {draft.duplicate_of && (
            <p className="admin-warn">⚠ מק״ט זה כבר קיים במסד. שמירה תעדכן את המוצר הקיים.</p>
          )}
          <p className="admin-hint">התרגום לערבית הוא טיוטה אוטומטית — נא להגיה.</p>

          <div className="grid-2">
            <F label="שם (עברית)" v={draft.name_he} on={(v) => set({ name_he: v })} />
            <F label="שם (ערבית)" v={draft.name_ar} on={(v) => set({ name_ar: v })} dir="rtl" />
            <CategorySelect
              categoryHe={draft.category_he}
              categoryAr={draft.category_ar}
              onChange={(patch) => set(patch)}
            />
            <F label="מחיר" v={String(draft.price)} on={(v) => set({ price: Number(v) || 0 } as any)} type="number" />
            <F label="מחיר מבצע" v={draft.sale_price == null ? '' : String(draft.sale_price)} on={(v) => set({ sale_price: (v === '' ? null : Number(v)) as any })} type="number" />
            <F label="יחידת מידה" v={draft.unit || ''} on={(v) => set({ unit: v })} />
            <F label="מק״ט" v={draft.sku} on={() => {}} disabled />
          </div>

          <A label="תיאור (עברית)" v={draft.desc_he || ''} on={(v) => set({ desc_he: v })} />
          <A label="תיאור (ערבית)" v={draft.desc_ar || ''} on={(v) => set({ desc_ar: v })} dir="rtl" />

          <div className="flex-wrap mt-2">
            <C label="במלאי" c={draft.available} on={(v) => set({ available: v })} />
            <C label="מבצע" c={draft.on_sale} on={(v) => set({ on_sale: v })} />
            <C label="מומלץ" c={draft.featured} on={(v) => set({ featured: v })} />
            <C label="פרסום מיידי" c={draft.published} on={(v) => set({ published: v })} />
          </div>

          {draft.image_urls?.length > 0 && (
            <>
              <p className="admin-hint mt-2">תמונות מהספק (יורדו לאחסון שלנו בעת השמירה):</p>
              <div className="admin-img-grid">
                {draft.image_urls.map((src, i) => (
                  <div key={src} className="admin-img-cell">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" />
                    <button type="button" onClick={() => set({ image_urls: draft.image_urls.filter((_, j) => j !== i) })}>הסר</button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex-wrap mt-3">
            <button className="btn btn-gradient btn-lg" onClick={save} disabled={saving}>
              {saving ? 'שומר…' : draft.duplicate_of ? 'עדכון ושמירה' : 'שמור ופרסם'}
            </button>
            <button className="btn btn-outline" onClick={() => setDraft(null)}>ביטול</button>
          </div>
        </div>
      )}
    </div>
  );
}

function F({ label, v, on, type = 'text', dir, disabled }: {
  label: string; v: string; on: (v: string) => void; type?: string; dir?: string; disabled?: boolean;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={v} dir={dir} disabled={disabled} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
function A({ label, v, on, dir }: { label: string; v: string; on: (v: string) => void; dir?: string }) {
  return (
    <div className="field mt-2">
      <label>{label}</label>
      <textarea rows={3} value={v} dir={dir} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
function C({ label, c, on }: { label: string; c: boolean; on: (v: boolean) => void }) {
  return (
    <label className="admin-check">
      <input type="checkbox" checked={c} onChange={(e) => on(e.target.checked)} /> {label}
    </label>
  );
}

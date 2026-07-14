'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { updateProductFields, addProductImagesFromUrls, updateProductBarcode, updateProductSku } from '@/app/admin/actions';
import { translateProduct } from '@/app/admin/translate-actions';
import { EnrichModal } from './EnrichModal';
import { CategorySelect } from './CategorySelect';

// עורך מוצר קיים — כל השדות (עברית + ערבית) ניתנים לעריכה.
export function ProductEditor({
  product, onClose, onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: (patch: Partial<Product>, meta?: { keepOpen?: boolean }) => void;
}) {
  const [f, setF] = useState<Product>({ ...product });
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateMsg, setTranslateMsg] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  const [addingImages, setAddingImages] = useState(false);
  const [imageMsg, setImageMsg] = useState('');
  const [savingBarcode, setSavingBarcode] = useState(false);
  const [barcodeMsg, setBarcodeMsg] = useState('');
  const [savingSku, setSavingSku] = useState(false);
  const [skuMsg, setSkuMsg] = useState('');
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState('');

  const set = (patch: Partial<Product>) => setF((p) => ({ ...p, ...patch }));

  async function runTranslate(force = false) {
    setTranslating(true);
    setTranslateMsg('');
    setError('');
    const res = await translateProduct(product.id, {
      forceNames: force,
      forceContent: force,
    });
    setTranslating(false);
    if (!res.ok) {
      setError(res.error || 'תרגום נכשל');
      return;
    }
    if (res.patch && Object.keys(res.patch).length) {
      setF((p) => ({ ...p, ...res.patch }));
      onSaved(res.patch, { keepOpen: true });
      setTranslateMsg('תורגם בהצלחה — בדוק את השדות הערביים לפני שמירה.');
    } else {
      setTranslateMsg('אין מה לתרגם (יש כבר תרגום ערבי תקין).');
    }
  }

  async function saveBarcodeOnly() {
    setSavingBarcode(true);
    setBarcodeMsg('');
    setError('');
    const res = await updateProductBarcode(product.id, f.barcode?.trim() || null);
    setSavingBarcode(false);
    if (!res.ok) {
      setError(res.error || 'עדכון ברקוד נכשל');
      return;
    }
    const next = res.barcode ?? null;
    set({ barcode: next });
    onSaved({ barcode: next }, { keepOpen: true });
    setBarcodeMsg('הברקוד עודכן.');
  }

  async function saveSkuOnly() {
    setSavingSku(true);
    setSkuMsg('');
    setError('');
    const res = await updateProductSku(product.id, f.sku);
    setSavingSku(false);
    if (!res.ok) {
      setError(res.error || 'עדכון מק״ט נכשל');
      return;
    }
    const next = res.sku || f.sku.trim();
    set({ sku: next });
    onSaved({ sku: next }, { keepOpen: true });
    setSkuMsg('המק״ט עודכן.');
  }

  async function addImagesFromUrls() {
    setAddingImages(true);
    setImageMsg('');
    setError('');
    const res = await addProductImagesFromUrls(product.id, imageUrls);
    setAddingImages(false);
    if (!res.ok) {
      setError(res.error || 'הוספת תמונות נכשלה');
      return;
    }
    if (res.images) {
      set({ images: res.images });
      onSaved({ images: res.images }, { keepOpen: true });
      setImageUrls('');
      setImageMsg(`נוספו ${res.added ?? 0} תמונות (${res.images.length}/${6}).`);
    }
  }

  async function save() {
    setSaving(true);
    setError('');
    const newPrice = Number(f.price);
    const newSalePrice = f.sale_price != null && String(f.sale_price) !== '' ? Number(f.sale_price) : null;
    const priceChanged = newPrice !== product.price || newSalePrice !== product.sale_price;
    const patch: Partial<Product> = {
      sku: f.sku.trim(),
      name_he: f.name_he, name_ar: f.name_ar, category_he: f.category_he, category_ar: f.category_ar,
      price: newPrice, sale_price: newSalePrice,
      on_sale: f.on_sale, desc_he: f.desc_he, desc_ar: f.desc_ar, unit: f.unit, barcode: f.barcode?.trim() || null,
      available: f.available, featured: f.featured, published: f.published, images: f.images,
      // שינוי מחיר ידני נועל אותו אוטומטית; אפשר גם לנעול/לשחרר ידנית בתיבת הסימון
      price_override: priceChanged ? true : f.price_override,
    };
    const res = await updateProductFields(product.id, patch);
    setSaving(false);
    if (res.ok) {
      if (res.warning) setError(res.warning);
      onSaved(patch);
    } else setError(res.error || 'שמירה נכשלה');
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal admin-editor" role="dialog" aria-modal="true" aria-label="עריכת מוצר">
        <div className="modal-head">
          <h2>עריכת מוצר</h2>
          <button className="icon-btn" onClick={onClose} aria-label="סגירה">✕</button>
        </div>
        <div className="modal-body">
          <div className="grid-2">
            <Text label="שם (עברית)" value={f.name_he} onChange={(v) => set({ name_he: v })} />
            <Text label="שם (ערבית)" value={f.name_ar || ''} onChange={(v) => set({ name_ar: v })} dir="rtl" />
            <CategorySelect
              categoryHe={f.category_he}
              categoryAr={f.category_ar}
              onChange={(patch) => set(patch)}
            />
            <Text label="מחיר" value={String(f.price)} onChange={(v) => set({ price: Number(v) || 0 })} type="number" />
            <div className="field">
              <label>מחיר מבצע</label>
              <input type="number" value={f.sale_price == null ? '' : String(f.sale_price)} onChange={(e) => set({ sale_price: e.target.value === '' ? null : Number(e.target.value) })} />
              <label className="admin-check mt-1">
                <input type="checkbox" checked={f.price_override} onChange={(e) => set({ price_override: e.target.checked })} />
                {' '}🔒 מחיר נעול (לא יתעדכן מייבוא CSV / עדכון-מהמקור)
              </label>
            </div>
            <Text label="יחידת מידה" value={f.unit || ''} onChange={(v) => set({ unit: v })} />
          </div>

          <div className="field mt-2">
            <label>מק״ט</label>
            <div className="flex-wrap">
              <input
                dir="ltr"
                style={{ flex: 1, minWidth: 180 }}
                value={f.sku}
                onChange={(e) => set({ sku: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={saveSkuOnly}
                disabled={savingSku || saving || !f.sku.trim()}
              >
                {savingSku ? 'שומר…' : 'שמור מק״ט'}
              </button>
            </div>
            <p className="admin-hint" style={{ marginTop: 4 }}>
              מזהה ייחודי במלאי — משמש גם בייבוא CSV. לא ניתן לשכפל מק״ט קיים.
            </p>
            {skuMsg && <p className="admin-hint">{skuMsg}</p>}
          </div>

          <div className="field mt-2">
            <label>העשרה מדף מוצר</label>
            <p className="admin-hint" style={{ marginTop: 0 }}>
              שלוף תמונה, תיאור, מחיר וברקוד מקישור — מכל אתר HTTPS (לא רק ספקים מוכרים).
            </p>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setEnriching(true)}
              disabled={saving}
            >
              העשר מקישור
            </button>
          </div>

          <div className="field mt-2">
            <label>ברקוד (EAN/UPC)</label>
            <div className="flex-wrap">
              <input
                dir="ltr"
                style={{ flex: 1, minWidth: 180 }}
                placeholder="7290000000000"
                value={f.barcode || ''}
                onChange={(e) => set({ barcode: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={saveBarcodeOnly}
                disabled={savingBarcode || saving}
              >
                {savingBarcode ? 'שומר…' : 'שמור ברקוד'}
              </button>
            </div>
            <p className="admin-hint" style={{ marginTop: 4 }}>
              8–14 ספרות. מופיע גם בהזמנת הווטסאפ — ניתן לשמור בנפרד או עם כפתור השמירה הכללי.
            </p>
            {barcodeMsg && <p className="admin-hint">{barcodeMsg}</p>}
          </div>

          <div className="field mt-2">
            <label>תמונות ({f.images?.length || 0}/6)</label>
            {f.images?.length > 0 && (
              <div className="admin-img-grid mt-1">
                {f.images.map((src, i) => (
                  <div key={`${src}-${i}`} className="admin-img-cell">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" />
                    <button
                      type="button"
                      onClick={() => set({ images: f.images.filter((_, j) => j !== i) })}
                    >
                      הסר
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="admin-hint" style={{ marginTop: f.images?.length ? 8 : 0 }}>
              הדבק קישור HTTPS לתמונה (שורה אחת לכל קישור) — מכל אתר. התמונה תורד לאחסון שלנו.
            </p>
            <textarea
              dir="ltr"
              rows={2}
              placeholder={'https://example.com/image.jpg\nhttps://…'}
              value={imageUrls}
              onChange={(e) => setImageUrls(e.target.value)}
            />
            <div className="flex-wrap mt-1">
              <button
                type="button"
                className="btn btn-outline"
                onClick={addImagesFromUrls}
                disabled={addingImages || saving || !imageUrls.trim()}
              >
                {addingImages ? 'מוסיף…' : 'הוסף מתמונה'}
              </button>
            </div>
            {imageMsg && <p className="admin-hint mt-1">{imageMsg}</p>}
          </div>

          <div className="field mt-2">
            <label>תרגום לערבית</label>
            <p className="admin-hint" style={{ marginTop: 0 }}>
              מתרגם שם, קטגוריה ותיאור מהעברית — השדות הערביים מתעדכנים בטופס ונשמרים במסד.
            </p>
            <div className="flex-wrap">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => runTranslate(false)}
                disabled={translating || saving}
              >
                {translating ? 'מתרגם…' : 'תרגם לערבית'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => runTranslate(true)}
                disabled={translating || saving}
              >
                תרגם מחדש
              </button>
            </div>
            {translateMsg && <p className="admin-hint mt-1">{translateMsg}</p>}
          </div>

          <Area label="תיאור (עברית)" value={f.desc_he || ''} onChange={(v) => set({ desc_he: v })} />
          <Area label="תיאור (ערבית)" value={f.desc_ar || ''} onChange={(v) => set({ desc_ar: v })} dir="rtl" />

          <div className="flex-wrap mt-2">
            <Check label="במלאי" checked={f.available} onChange={(v) => set({ available: v })} />
            <Check label="מבצע" checked={f.on_sale} onChange={(v) => set({ on_sale: v })} />
            <Check label="מומלץ" checked={f.featured} onChange={(v) => set({ featured: v })} />
            <Check label="מפורסם" checked={f.published} onChange={(v) => set({ published: v })} />
          </div>

          {error && <p className="admin-error">{error}</p>}
          <div className="flex-wrap mt-2">
            <button className="btn btn-gradient btn-lg" onClick={save} disabled={saving}>{saving ? 'שומר…' : 'שמירה'}</button>
            <button className="btn btn-outline" onClick={onClose}>ביטול</button>
          </div>
        </div>
      </div>

      {enriching && (
        <EnrichModal
          product={product}
          initial={null}
          onClose={() => setEnriching(false)}
          onApplied={(patch) => {
            setF((p) => ({ ...p, ...patch }));
            onSaved(patch, { keepOpen: true });
            setEnriching(false);
          }}
        />
      )}
    </div>
  );
}

function Text({ label, value, onChange, type = 'text', dir, disabled }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; dir?: string; disabled?: boolean;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} dir={dir} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function Area({ label, value, onChange, dir }: { label: string; value: string; onChange: (v: string) => void; dir?: string }) {
  return (
    <div className="field mt-2">
      <label>{label}</label>
      <textarea rows={3} value={value} dir={dir} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="admin-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}

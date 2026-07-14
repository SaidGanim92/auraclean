'use client';

import { useEffect, useState } from 'react';
import type { Product, EnrichmentSource } from '@/lib/types';
import type { EnrichResult } from '@/lib/enrich.server';
import { enrichPreviewAction, discoverEnrichAction, enrichFromUrlAction, applyEnrichment } from '@/app/admin/enrich-actions';
import { looksLikeHebrew } from '@/lib/lang-detect';

const SOURCE_LABEL: Record<EnrichmentSource, string> = {
  supplier: 'אתר הספק', manual: 'אתר חיצוני', none: 'לא נמצא',
};

export function EnrichModal({
  product, initial, onClose, onApplied,
}: {
  product: Product;
  initial: EnrichResult | null;
  onClose: () => void;
  onApplied: (patch: Partial<Product>) => void;
}) {
  const [result, setResult] = useState<EnrichResult | null>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.images || []));
  const [descHe, setDescHe] = useState(initial?.desc_he || product.desc_he || '');
  const [descAr, setDescAr] = useState(() => {
    const d = initial?.desc_ar_draft || product.desc_ar || '';
    return looksLikeHebrew(d) ? '' : d;
  });
  const [nameAr, setNameAr] = useState(() => {
    const n = product.name_ar || initial?.name_ar_draft || '';
    return looksLikeHebrew(n) ? '' : n;
  });
  const [barcode, setBarcode] = useState(initial?.barcode || product.barcode || '');
  const [price, setPrice] = useState(String(initial?.price ?? product.price ?? ''));
  const [salePrice, setSalePrice] = useState(
    initial?.on_sale && initial?.sale_price != null
      ? String(initial.sale_price)
      : product.on_sale && product.sale_price != null
        ? String(product.sale_price)
        : ''
  );
  const [url, setUrl] = useState(product.source_url || '');
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(!initial);
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setPreviewLoading(true);
      setError('');
      try {
        const res = await enrichPreviewAction(product.id);
        if (cancelled) return;
        if (res.ok && res.result) {
          loadResult(res.result);
          if (res.result.source_url) setUrl(res.result.source_url);
        } else {
          setError(res.error || 'טעינת תצוגה מקדימה נכשלה');
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [product.id, initial]);

  function loadResult(r: EnrichResult) {
    setResult(r);
    setSelected(new Set(r.images));
    if (r.desc_he) setDescHe(r.desc_he);
    // לא ממלאים טיוטה ערבית אם היא עדיין בעברית (תרגום שנכשל)
    if (r.desc_ar_draft && !looksLikeHebrew(r.desc_ar_draft)) setDescAr(r.desc_ar_draft);
    if (r.name_ar_draft && !product.name_ar && !looksLikeHebrew(r.name_ar_draft)) setNameAr(r.name_ar_draft);
    if (r.price != null) setPrice(String(r.price));
    setSalePrice(r.on_sale && r.sale_price != null ? String(r.sale_price) : '');
    if (r.barcode) setBarcode(r.barcode);
  }

  async function runDiscover() {
    setDiscovering(true);
    setError('');
    const res = await discoverEnrichAction(product.id);
    setDiscovering(false);
    if (res.ok && res.result) {
      loadResult(res.result);
      if (res.result.source_url) setUrl(res.result.source_url);
      if (!res.result.found) setError('לא נמצא מוצר מתאים — נסה להדביק קישור ידנית.');
    } else {
      setError(res.error || 'חיפוש אוטומטי נכשל');
    }
  }

  async function fetchUrlIntoForm(targetUrl = url.trim()): Promise<EnrichResult | null> {
    if (!targetUrl) return null;
    const res = await enrichFromUrlAction(product.id, targetUrl);
    if (res.ok && res.result) {
      if (res.result.found) {
        loadResult(res.result);
        if (res.result.source_url) setUrl(res.result.source_url);
        return res.result;
      }
      setError('לא נמצאו נתונים בקישור — ודא שהדבקת קישור מדף מוצר מלא.');
      return null;
    }
    setError(res.error || 'שליפה מהקישור נכשלה');
    return null;
  }

  async function runUrl() {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    await fetchUrlIntoForm();
    setLoading(false);
  }

  function toggleImg(src: string) {
    setSelected((s) => { const n = new Set(s); n.has(src) ? n.delete(src) : n.add(src); return n; });
  }

  async function approve() {
    setSaving(true);
    setError('');
    try {
      let workingResult = result;
      let workingSelected = selected;
      let workingDescHe = descHe;
      let workingPrice = price;
      let workingSalePrice = salePrice;
      let workingBarcode = barcode;
      let workingNameAr = nameAr;
      let workingDescAr = descAr;

      // אם הודבק קישור אבל עדיין אין נתונים — שולפים אוטומטית לפני שמירה
      if (url.trim() && !workingResult?.found) {
        const scraped = await fetchUrlIntoForm(url.trim());
        if (!scraped) {
          setSaving(false);
          return;
        }
        workingResult = scraped;
        workingSelected = new Set(scraped.images);
        workingDescHe = scraped.desc_he || workingDescHe;
        workingPrice = scraped.price != null ? String(scraped.price) : workingPrice;
        workingSalePrice =
          scraped.on_sale && scraped.sale_price != null ? String(scraped.sale_price) : workingSalePrice;
        workingBarcode = scraped.barcode || workingBarcode;
        if (scraped.desc_ar_draft && !looksLikeHebrew(scraped.desc_ar_draft)) workingDescAr = scraped.desc_ar_draft;
        if (scraped.name_ar_draft && !looksLikeHebrew(scraped.name_ar_draft)) workingNameAr = scraped.name_ar_draft;
      }

      const source: EnrichmentSource =
        workingResult?.source && workingResult.source !== 'none' ? workingResult.source : 'manual';
      const priceNum = workingPrice.trim() ? parseFloat(workingPrice) : null;
      const salePriceNum = workingSalePrice.trim() ? parseFloat(workingSalePrice) : null;
      const safeNameAr = workingNameAr.trim() && !looksLikeHebrew(workingNameAr) ? workingNameAr.trim() : null;
      const safeDescAr = workingDescAr.trim() && !looksLikeHebrew(workingDescAr) ? workingDescAr.trim() : null;
      const res = await applyEnrichment(product.id, {
        images: [...workingSelected],
        desc_he: workingDescHe || null,
        desc_ar: safeDescAr,
        name_ar: safeNameAr,
        source,
        source_url: url.trim() || product.source_url || null,
        price: priceNum,
        sale_price: salePriceNum,
        barcode: workingBarcode.trim() || null,
      });
      if (res.ok) {
        onApplied({
          images: res.images && res.images.length ? res.images : product.images,
          desc_he: workingDescHe || null,
          desc_ar: safeDescAr,
          name_ar: product.name_ar && !looksLikeHebrew(product.name_ar) ? product.name_ar : safeNameAr,
          enrichment_source: source,
          image_external: source !== 'manual' && (res.images?.length || 0) > 0,
          source_url: url.trim() || product.source_url || null,
          barcode: workingBarcode.trim() || null,
          ...(priceNum != null ? {
            price: priceNum,
            sale_price: salePriceNum != null && salePriceNum < priceNum ? salePriceNum : null,
            on_sale: salePriceNum != null && salePriceNum < priceNum,
          } : {}),
        });
      } else {
        setError(res.error || 'שמירה נכשלה');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  }

  const found = result?.found;

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal admin-editor" role="dialog" aria-modal="true" aria-label="העשרת מוצר">
        <div className="modal-head">
          <h2>העשרת מוצר — {product.name_he}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="סגירה">✕</button>
        </div>
        <div className="modal-body">
          {previewLoading && (
            <p className="admin-hint" style={{ marginBottom: 12 }}>
              טוען נתונים מקישור הספק…
            </p>
          )}

          <p className="admin-hint">
            העשרה שולפת <b>תמונה, תיאור, מחיר וברקוד</b> מדף מוצר — מכל אתר HTTPS (ספקים מוכרים או גנרי).
            שם/קטגוריה/מלאי נשארים מקובץ המלאי.
          </p>

          {result && (
            <p>מקור: <b className={found ? '' : 'admin-warn'} style={{ padding: found ? 0 : undefined }}>
              {SOURCE_LABEL[result.source]}</b>
              {result.brand ? ` · מותג: ${result.brand}` : ''}
              {result.found_name ? ` · שם שחזר (עזר): ${result.found_name}` : ''}
            </p>
          )}

          <div className="field mt-2">
            <label>ייבוא מקישור (כל אתר)</label>
            <p className="admin-hint" style={{ marginTop: 0 }}>
              הדבק קישור HTTPS לדף מוצר — טאצ&apos;, Amazon, Shopify, WooCommerce וכל אתר אחר.
            </p>
            <div className="flex-wrap">
              <a
                className="btn btn-outline"
                href={`https://www.google.com/search?q=${encodeURIComponent(product.name_he)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                🔍 חפש את "{product.name_he}" בגוגל
              </a>
            </div>
            <div className="flex-wrap mt-2">
              <button
                className="btn btn-outline"
                type="button"
                onClick={runDiscover}
                disabled={discovering || previewLoading || loading}
              >
                {discovering ? 'מחפש…' : '🔎 חפש אוטומטית לפי שם/ברקוד'}
              </button>
              <span className="admin-hint">(איטי — עד דקה)</span>
            </div>
            <div className="flex-wrap mt-2">
              <input dir="ltr" style={{ flex: 1 }} placeholder="https://…/product/…" value={url} onChange={(e) => setUrl(e.target.value)} />
              <button className="btn btn-outline" onClick={runUrl} disabled={loading}>
                {loading ? 'שולף…' : 'שלוף'}
              </button>
            </div>
          </div>

          {error && <p className="admin-warn">{error}</p>}

          {found && result!.image_external && (
            <p className="admin-warn mt-2">⚠ תמונות ממקור חיצוני ({SOURCE_LABEL[result!.source]}) — ודא זכויות שימוש לפני פרסום.</p>
          )}

          {result && result.images.length > 0 && (
            <>
              <p className="admin-hint mt-2">בחר תמונות לשמירה:</p>
              <div className="admin-img-grid">
                {result.images.map((src) => (
                  <label key={src} className={`admin-img-cell selectable${selected.has(src) ? ' on' : ''}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" />
                    <input type="checkbox" checked={selected.has(src)} onChange={() => toggleImg(src)} />
                  </label>
                ))}
              </div>
            </>
          )}

          <div className="flex-wrap mt-2">
            <div className="field" style={{ flex: 1 }}><label>מחיר (₪)</label>
              <input dir="ltr" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div className="field" style={{ flex: 1 }}><label>מחיר מבצע (₪) — השאר ריק אם אין</label>
              <input dir="ltr" type="number" step="0.01" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} /></div>
          </div>

          <div className="field mt-2"><label>ברקוד</label>
            <input dir="ltr" placeholder="7290000000000" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            <p className="admin-hint" style={{ marginTop: 4 }}>
              שדה נפרד מהתיאור — יופיע גם בהזמנת הווטסאפ שהלקוח שולח.
            </p>
          </div>

          <div className="field mt-2"><label>תיאור (עברית)</label>
            <textarea rows={3} value={descHe} onChange={(e) => setDescHe(e.target.value)} /></div>
          <div className="field"><label>תיאור (ערבית) — טיוטה</label>
            <textarea rows={3} dir="rtl" value={descAr} onChange={(e) => setDescAr(e.target.value)} /></div>
          <div className="field"><label>שם בערבית — טיוטה (לא דורס שם קיים)</label>
            <input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} /></div>

          <div className="flex-wrap mt-3">
            <button className="btn btn-gradient btn-lg" onClick={approve} disabled={saving}>
              {saving ? 'שומר…' : 'אשר ושמור (בלי לפרסם)'}
            </button>
            <button className="btn btn-outline" onClick={onClose}>ביטול</button>
          </div>
          <p className="admin-hint mt-2">
            הדבק קישור מדף המוצר ולחץ <b>שלוף</b> — או ישר <b>אשר ושמור</b> (ישלוף אוטומטית מהקישור).
          </p>
        </div>
      </div>
    </div>
  );
}

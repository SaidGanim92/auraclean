'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, EnrichmentSource } from '@/lib/types';
import { SUPPLIER_LABELS } from '@/lib/suppliers/labels';
import { money } from '@/lib/product';
import { updateProductFields, deleteProduct, fetchSourceDiff, applySourcePatch, createEmptyProduct } from '@/app/admin/actions';
import { bulkEnrichBatch } from '@/app/admin/enrich-actions';
import { translateMissingBatch } from '@/app/admin/translate-actions';
import type { SourceDiff } from '@/lib/import.server';
import { ProductEditor } from './ProductEditor';

const ENRICH_BADGE: Record<EnrichmentSource, string> = {
  supplier: 'ספק', manual: 'ידני', none: '—',
};
type Filter = 'all' | 'needs' | 'manual';

export function ProductsTable({
  initial,
  initialEditId,
}: {
  initial: Product[];
  initialEditId?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Product[]>(initial);
  const [editing, setEditing] = useState<Product | null>(null);
  const [diff, setDiff] = useState<SourceDiff | null>(null);
  const [busy, setBusy] = useState<string>('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [bulk, setBulk] = useState<{ running: boolean; done: number; total: number; found: number } | null>(null);
  const [translating, setTranslating] = useState<{ running: boolean; done: number; total: number } | null>(null);
  const [creating, setCreating] = useState(false);

  async function onCreateProduct() {
    setCreating(true);
    const res = await createEmptyProduct();
    setCreating(false);
    if (!res.ok || !res.product) {
      alert('יצירת מוצר נכשלה: ' + (res.error || 'שגיאה'));
      return;
    }
    if (res.warning) console.warn(res.warning);
    setRows((r) => [res.product!, ...r]);
    setEditing(res.product);
  }

  useEffect(() => {
    if (initialEditId) {
      const p = initial.find((x) => x.id === initialEditId);
      if (p) setEditing(p);
    }
  }, [initial, initialEditId]);

  function patchRow(id: string, patch: Partial<Product>) {
    setRows((r) => r.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function toggle(p: Product, field: keyof Product) {
    const next = !p[field];
    patchRow(p.id, { [field]: next } as Partial<Product>);
    const res = await updateProductFields(p.id, { [field]: next } as Partial<Product>);
    if (!res.ok) {
      patchRow(p.id, { [field]: p[field] } as Partial<Product>); // גלגול לאחור
      alert('עדכון נכשל: ' + res.error);
    }
  }

  async function onDelete(p: Product) {
    if (!confirm(`למחוק את "${p.name_he}"?`)) return;
    setBusy(p.id);
    const res = await deleteProduct(p.id);
    setBusy('');
    if (res.ok) setRows((r) => r.filter((x) => x.id !== p.id));
    else alert('מחיקה נכשלה: ' + res.error);
  }

  async function onUpdateFromSource(p: Product) {
    if (!p.source_url) return alert('למוצר אין קישור מקור.');
    setBusy(p.id);
    const res = await fetchSourceDiff(p.id);
    setBusy('');
    if (!res.ok) return alert('משיכה נכשלה: ' + res.error);
    if (!res.diff!.changes.length) return alert('אין שינויים אצל הספק.');
    setDiff(res.diff!);
  }

  async function applyDiff() {
    if (!diff) return;
    const patch: Partial<Product> = {};
    diff.changes.forEach((c) => ((patch as any)[c.field] = c.to));
    const res = await applySourcePatch(diff.product.id, patch);
    if (res.ok) {
      patchRow(diff.product.id, patch);
      setDiff(null);
    } else alert('עדכון נכשל: ' + res.error);
  }

  // העשרת אצווה לכל המוצרים חסרי תמונה
  async function bulkEnrich() {
    const targets = rows.filter((p) => !p.images?.length).map((p) => p.id);
    if (!targets.length) return alert('אין מוצרים חסרי תמונה.');
    if (!confirm(`להעשיר ${targets.length} מוצרים חסרי תמונה? (נשמר כטיוטה, ללא פרסום)`)) return;
    setBulk({ running: true, done: 0, total: targets.length, found: 0 });
    let found = 0;
    const CHUNK = 5;
    for (let i = 0; i < targets.length; i += CHUNK) {
      const chunk = targets.slice(i, i + CHUNK);
      const res = await bulkEnrichBatch(chunk);
      if (!res.ok) { alert(res.error || 'העשרה נכשלה'); break; }
      found += res.statuses.filter((s) => s.found).length;
      setBulk({ running: true, done: Math.min(i + CHUNK, targets.length), total: targets.length, found });
    }
    setBulk((b) => (b ? { ...b, running: false } : null));
    router.refresh(); // רענון הנתונים מהשרת
  }

  // תרגום אצווה — כולל תיקון שמות ותיאורים שתורגמו גרוע.
  async function translateAll() {
    const targets = rows.map((p) => p.id);
    if (!targets.length) return alert('אין מוצרים.');
    if (!confirm(`לתרגם מחדש לערבית את השמות והתיאורים של כל ${targets.length} המוצרים? זה עלול לקחת כמה דקות.`)) return;
    setTranslating({ running: true, done: 0, total: targets.length });
    const CHUNK = 4;
    for (let i = 0; i < targets.length; i += CHUNK) {
      const chunk = targets.slice(i, i + CHUNK);
      const res = await translateMissingBatch(chunk, { forceNames: true, forceContent: true });
      if (!res.ok) { alert(res.error || 'תרגום נכשל'); break; }
      setTranslating({ running: true, done: Math.min(i + CHUNK, targets.length), total: targets.length });
    }
    setTranslating((b) => (b ? { ...b, running: false } : null));
    router.refresh();
  }

  const filtered = rows.filter((p) => {
    if (filter === 'needs' && p.images?.length) return false;
    if (filter === 'manual' && !(p.enrichment_source === 'none' && !p.images?.length)) return false;
    if (!q.trim()) return true;
    return `${p.name_he} ${p.name_ar} ${p.sku}`.toLowerCase().includes(q.toLowerCase());
  });

  const needsCount = rows.filter((p) => !p.images?.length).length;

  return (
    <div>
      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="חיפוש לפי שם או מק״ט…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="seg" role="group" aria-label="סינון">
          <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>הכל ({rows.length})</button>
          <button type="button" aria-pressed={filter === 'needs'} onClick={() => setFilter('needs')}>חסרי תמונה ({needsCount})</button>
          <button type="button" aria-pressed={filter === 'manual'} onClick={() => setFilter('manual')}>דורש טיפול ידני</button>
        </div>
        <button className="btn btn-gradient" onClick={onCreateProduct} disabled={creating || bulk?.running}>
          {creating ? 'יוצר…' : '+ מוצר חדש'}
        </button>
        <button className="btn btn-gradient" onClick={bulkEnrich} disabled={bulk?.running || needsCount === 0}>
          {bulk?.running ? 'מעשיר…' : `העשר את כל המלאי (${needsCount})`}
        </button>
        <button className="btn btn-outline" onClick={translateAll} disabled={translating?.running || rows.length === 0}>
          {translating?.running ? 'מתרגם…' : `תרגם שמות לערבית מחדש (${rows.length})`}
        </button>
      </div>

      {bulk && (
        <div className="admin-progress">
          <div className="bar"><span style={{ width: `${bulk.total ? (bulk.done / bulk.total) * 100 : 0}%` }} /></div>
          <span className="admin-hint">{bulk.done}/{bulk.total} · נמצאו {bulk.found} {bulk.running ? '· מעבד…' : '· הושלם'}</span>
        </div>
      )}
      {translating && (
        <div className="admin-progress">
          <div className="bar"><span style={{ width: `${translating.total ? (translating.done / translating.total) * 100 : 0}%` }} /></div>
          <span className="admin-hint">{translating.done}/{translating.total} {translating.running ? '· מתרגם…' : '· הושלם'}</span>
        </div>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>תמונה</th><th>שם</th><th>מק״ט</th><th>ספק</th><th>מחיר</th>
              <th>מלאי</th><th>מבצע</th><th>מומלץ</th><th>מפורסם</th><th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className={busy === p.id ? 'is-busy' : ''}>
                <td>
                  {p.images?.[0]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img className="admin-thumb" src={p.images[0]} alt="" />
                    : <div className="admin-thumb placeholder" />}
                </td>
                <td className="admin-name">
                  {p.name_he}<br /><span dir="rtl">{p.name_ar}</span>
                  {p.enrichment_source && p.enrichment_source !== 'none' && (
                    <span className="enrich-badge">{ENRICH_BADGE[p.enrichment_source]}{p.image_external ? ' · חיצוני' : ''}</span>
                  )}
                </td>
                <td dir="ltr">{p.sku}{p.barcode && p.barcode !== p.sku ? <><br /><span className="admin-hint">{p.barcode}</span></> : ''}</td>
                <td>{p.supplier ? SUPPLIER_LABELS[p.supplier] : '—'}</td>
                <td>
                  {p.on_sale && p.sale_price
                    ? <><b>{money(p.sale_price)}</b> <s>{money(p.price)}</s></>
                    : money(p.price)}
                  {p.price_override && <><br /><span className="admin-hint" title="מחיר נעול ידנית — לא יתעדכן מייבוא CSV / עדכון-מהמקור">🔒 נעול</span></>}
                </td>
                <td><Flag on={p.available} onClick={() => toggle(p, 'available')} onLabel="במלאי" offLabel="אזל" /></td>
                <td><Flag on={p.on_sale} onClick={() => toggle(p, 'on_sale')} onLabel="מבצע" offLabel="—" /></td>
                <td><Flag on={p.featured} onClick={() => toggle(p, 'featured')} onLabel="מומלץ" offLabel="—" /></td>
                <td><Flag on={p.published} onClick={() => toggle(p, 'published')} onLabel="מפורסם" offLabel="טיוטה" /></td>
                <td className="admin-actions">
                  <button className="mini" onClick={() => setEditing(p)}>עריכה</button>
                  {p.source_url && <button className="mini" onClick={() => onUpdateFromSource(p)}>עדכן מהמקור</button>}
                  <button className="mini danger" onClick={() => onDelete(p)}>מחיקה</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24 }}>אין מוצרים.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductEditor
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={(patch, meta) => {
            patchRow(editing.id, patch);
            if (!meta?.keepOpen) setEditing(null);
          }}
        />
      )}

      {diff && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setDiff(null); }}>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-head"><h2>שינויים אצל הספק</h2>
              <button className="icon-btn" onClick={() => setDiff(null)} aria-label="סגירה">✕</button></div>
            <div className="modal-body">
              <p>המוצר: <b>{diff.product.name_he}</b></p>
              <table className="admin-table">
                <thead><tr><th>שדה</th><th>לפני</th><th>אחרי</th></tr></thead>
                <tbody>
                  {diff.changes.map((c) => (
                    <tr key={c.field}><td>{c.field}</td><td>{String(c.from ?? '—')}</td><td><b>{String(c.to ?? '—')}</b></td></tr>
                  ))}
                </tbody>
              </table>
              <div className="flex-wrap mt-2">
                <button className="btn btn-gradient" onClick={applyDiff}>אישור ועדכון</button>
                <button className="btn btn-outline" onClick={() => setDiff(null)}>ביטול</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Flag({ on, onClick, onLabel, offLabel }: { on: boolean; onClick: () => void; onLabel: string; offLabel: string }) {
  return (
    <button type="button" className={`flag${on ? ' on' : ''}`} onClick={onClick} aria-pressed={on}>
      {on ? onLabel : offLabel}
    </button>
  );
}

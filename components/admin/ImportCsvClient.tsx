'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { mapCsvRows } from '@/lib/csv-map';
import { importCsvRows, type CsvImportResult } from '@/app/admin/csv-actions';

type RawRow = Record<string, string>;

export function ImportCsvClient() {
  const [rows, setRows] = useState<RawRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setParseError(''); setResult(null);
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setRows(res.data);
        setHeaders(res.meta.fields || []);
        if (res.errors.length) setParseError(`אזהרות פרסור: ${res.errors.length}`);
      },
      error: (err) => setParseError('שגיאת קריאה: ' + err.message),
    });
  }

  // תצוגה מקדימה של המיפוי
  const { mapped, skipped } = rows.length ? mapCsvRows(rows) : { mapped: [], skipped: 0 };

  async function runImport() {
    setImporting(true); setResult(null);
    const res = await importCsvRows(rows);
    setImporting(false);
    setResult(res);
  }

  return (
    <div>
      <div className="admin-card">
        <p className="admin-hint">
          העלה את קובץ המלאי (CSV). כותרות נתמכות: <code dir="ltr">sku/ברקוד, name_he, price, category_he, category_ar, available, stock_qty…</code>.
          המוצרים ייכנסו כ<b>טיוטה</b> (לא מפורסמים) עד אישורך.
        </p>
        <input type="file" accept=".csv,text/csv" onChange={onFile} />
        {fileName && <p className="admin-hint mt-2">קובץ: <b>{fileName}</b> · שורות: {rows.length}</p>}
        {parseError && <p className="admin-warn">{parseError}</p>}
      </div>

      {rows.length > 0 && (
        <div className="admin-card mt-3">
          <h2>תצוגה מקדימה</h2>
          <p className="admin-hint">
            כותרות שזוהו: <span dir="ltr">{headers.join(', ')}</span><br />
            שורות תקינות לייבוא: <b>{mapped.length}</b> · דילוגים (חסר sku/שם): <b>{skipped}</b>
          </p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>sku</th><th>שם</th><th>מחיר</th><th>קטגוריה</th><th>מלאי</th><th>זמין</th></tr></thead>
              <tbody>
                {mapped.slice(0, 8).map((m) => (
                  <tr key={m.sku}>
                    <td dir="ltr">{m.sku}</td><td>{m.name_he}</td><td>{m.price ?? '—'}</td>
                    <td>{m.category_he ?? '—'}</td><td>{m.stock_qty ?? '—'}</td><td>{m.available === false ? 'אזל' : 'במלאי'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mapped.length > 8 && <p className="admin-hint">…ועוד {mapped.length - 8} שורות</p>}

          <div className="flex-wrap mt-3">
            <button className="btn btn-gradient btn-lg" onClick={runImport} disabled={importing || !mapped.length}>
              {importing ? 'מייבא…' : `ייבוא ${mapped.length} מוצרים (כטיוטה)`}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="admin-card mt-3">
          {result.ok
            ? <p className="admin-success">הייבוא הושלם ✓</p>
            : <p className="admin-warn">הייבוא לא בוצע / הסתיים עם הערות.</p>}
          {/* השגיאות מוצגות בגלוי (לא מוסתרות) כדי שהסיבה תהיה ברורה */}
          {result.errors.length > 0 && (
            <div className="mt-2">
              {result.errors.slice(0, 20).map((e, i) => <p key={i} className="admin-error">{e}</p>)}
            </div>
          )}
          {result.warnings && result.warnings.length > 0 && (
            <div className="mt-2">
              {result.warnings.map((w, i) => <p key={i} className="admin-warn">⚠ {w}</p>)}
            </div>
          )}
          <ul className="mt-2">
            <li>נוצרו: <b>{result.created}</b></li>
            <li>עודכנו: <b>{result.updated}</b></li>
            <li>דולגו: <b>{result.skipped}</b></li>
          </ul>
          {result.ok && <a href="/admin/products" className="btn btn-primary mt-2">מעבר למוצרים לאישור ופרסום</a>}
        </div>
      )}
    </div>
  );
}

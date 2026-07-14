/* ==========================================================================
   product.js – עמוד מוצר בודד (product.html?id=...)
   כולל מקטע "המסלול המושלם": מוצרים מאותה קטגוריה + קישורים לכל הקטגוריות.
   ========================================================================== */

let PRODUCTS = [];
let CURRENT = null;

function getIdFromUrl() {
  return new URLSearchParams(location.search).get('id') || '';
}

/* ----- רינדור פרטי המוצר ----- */
function renderProduct() {
  const wrap = document.getElementById('product-root');
  if (!wrap) return;
  const id = getIdFromUrl();
  CURRENT = PRODUCTS.find(p => p.id === id) || null;

  if (!CURRENT) {
    wrap.innerHTML = `<div class="status-msg">${t('product_not_found')}
      <div class="mt-2"><a class="btn btn-primary" href="index.html">${t('back_to_catalog')}</a></div></div>`;
    return;
  }

  const p = CURRENT;
  document.title = `${pName(p)} · AURA CLEAN`;
  const onSale = p.on_sale && p.sale_price;
  const priceHtml = onSale
    ? `<span class="price price-sale">${money(p.sale_price)}</span> <span class="price-old">${money(p.price)}</span>`
    : `<span class="price">${money(p.price)}</span>`;

  const availabilityHtml = p.available
    ? `<span style="color:var(--success);font-weight:700">✓ ${t('in_stock')}</span>`
    : `<span class="tag tag-out" style="position:static;display:inline-block">${t('out_of_stock')}</span>`;

  const addBtn = p.available
    ? `<div class="flex-wrap mt-2">
         <div class="qty-control">
           <button type="button" id="q-dec" aria-label="${t('decrease')}">−</button>
           <input id="q-input" type="text" inputmode="numeric" value="1" aria-label="${t('qty')}">
           <button type="button" id="q-inc" aria-label="${t('increase')}">+</button>
         </div>
         <button class="btn btn-gradient btn-lg" id="add-btn">${t('add_to_cart')}</button>
       </div>`
    : `<button class="btn btn-outline btn-lg mt-2" disabled aria-disabled="true">${t('out_of_stock')}</button>`;

  let tags = '';
  if (onSale) tags += `<span class="tag tag-sale">${t('tag_sale')}</span>`;
  else if (p.featured) tags += `<span class="tag tag-featured">${t('tag_featured')}</span>`;

  wrap.innerHTML = `
    <nav class="breadcrumbs" aria-label="ניווט">
      <a href="index.html">${t('nav_home')}</a><span>/</span>
      <a href="index.html#catalog">${escapeHtml(pCat(p))}</a><span>/</span>
      <span>${escapeHtml(pName(p))}</span>
    </nav>
    <div class="product-detail">
      <div class="media">${tags}<img src="${productImage(p)}" alt="${escapeHtml(pName(p))}"></div>
      <div class="product-info">
        <span class="card-cat">${escapeHtml(pCat(p))}</span>
        <h1>${escapeHtml(pName(p))}</h1>
        <div class="price-row" style="margin:.4em 0 .2em">${priceHtml}
          ${p.unit ? `<span class="unit-label">${t('unit_prefix')}${escapeHtml(p.unit)}</span>` : ''}</div>
        <p style="margin:.6em 0"><strong>${t('availability')}:</strong> ${availabilityHtml}</p>
        <h2 style="font-size:1.05rem;margin-top:1em">${t('description')}</h2>
        <p>${escapeHtml(pDesc(p))}</p>
        ${addBtn}
        <div class="info-note mt-3">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>
          <span>${t('shipping_note')} · ${t('payment_info')}</span>
        </div>
      </div>
    </div>`;

  wireProductButtons();
  trackEvent('ViewContent', { content_ids: [p.id], content_name: pName(p), value: effectivePrice(p), currency: 'ILS' });
  renderRelated();
}

/* ----- כפתורי כמות + הוספה ----- */
function wireProductButtons() {
  const input = document.getElementById('q-input');
  const clamp = () => { let n = parseInt(input.value, 10); if (isNaN(n) || n < 1) n = 1; input.value = n; return n; };
  const dec = document.getElementById('q-dec');
  const inc = document.getElementById('q-inc');
  const add = document.getElementById('add-btn');
  if (dec) dec.onclick = () => { input.value = Math.max(1, clamp() - 1); };
  if (inc) inc.onclick = () => { input.value = clamp() + 1; };
  if (input) input.oninput = () => { input.value = input.value.replace(/[^\d]/g, ''); };
  if (add) add.onclick = () => addToCart(CURRENT, clamp());
}

/* ----- "המסלול המושלם": אותה קטגוריה + קישורים לכל הקטגוריות ----- */
function renderRelated() {
  const wrap = document.getElementById('related-root');
  if (!wrap || !CURRENT) return;
  const catKey = CURRENT.category_he || CURRENT.category_ar;
  const same = PRODUCTS.filter(p => (p.category_he || p.category_ar) === catKey && p.id !== CURRENT.id).slice(0, 4);

  // קישורי קטגוריות
  const cats = new Map();
  PRODUCTS.forEach(p => { const k = p.category_he || p.category_ar; if (k && !cats.has(k)) cats.set(k, p); });
  const catLinks = [...cats.values()]
    .map(p => `<a class="chip" href="index.html#catalog" style="text-decoration:none">${escapeHtml(pCat(p))}</a>`).join('');

  wrap.innerHTML = `
    <section class="section">
      <div class="section-head"><h2>${t('perfect_route')}</h2></div>
      ${same.length ? `<h3 style="font-size:1.05rem;color:var(--text-muted)">${t('same_category')}</h3>
        <div class="product-grid">${same.map(productCard).join('')}</div>` : ''}
      <div class="mt-3">
        <h3 style="font-size:1.05rem;color:var(--text-muted)">${t('all_cats_links')}</h3>
        <div class="category-bar" style="flex-wrap:wrap">${catLinks}</div>
      </div>
    </section>`;
}

/* הוספה לסל מכרטיסי "מוצרים דומים" */
function wireRelatedEvents() {
  document.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const p = PRODUCTS.find(x => x.id === add.getAttribute('data-add'));
      if (p) addToCart(p, 1);
    }
    const view = e.target.closest('[data-view]');
    if (view) {
      const p = PRODUCTS.find(x => x.id === view.getAttribute('data-view'));
      if (p) trackEvent('ViewContent', { content_ids: [p.id], content_name: pName(p) });
    }
  });
}

/* ----- אתחול ----- */
async function initProduct() {
  const wrap = document.getElementById('product-root');
  if (wrap) wrap.innerHTML = `<div class="status-msg"><div class="spinner" aria-hidden="true"></div><span aria-live="polite">${t('loading')}</span></div>`;
  wireRelatedEvents();
  PRODUCTS = await fetchProducts();
  renderProduct();
  document.addEventListener('langchange', renderProduct);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('product-root')) initProduct();
});

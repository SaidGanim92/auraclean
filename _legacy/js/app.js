/* ==========================================================================
   app.js – עמוד הבית: קטלוג, קטגוריות, חיפוש חי ומוצרים מומלצים
   ========================================================================== */

let ALL_PRODUCTS = [];
let activeCategory = 'all';
let searchTerm = '';

/* ----- כרטיס מוצר (משמש גם בעמוד המוצר) ----- */
function productCard(p) {
  const unavailable = !p.available;
  const onSale = p.on_sale && p.sale_price;
  const link = `product.html?id=${encodeURIComponent(p.id)}`;
  const img = productImage(p);

  let tags = '';
  if (onSale) tags += `<span class="tag tag-sale">${t('tag_sale')}</span>`;
  else if (p.featured) tags += `<span class="tag tag-featured">${t('tag_featured')}</span>`;
  if (unavailable) tags += `<span class="tag tag-out">${t('out_of_stock')}</span>`;

  const priceHtml = onSale
    ? `<span class="price price-sale">${money(p.sale_price)}</span> <span class="price-old">${money(p.price)}</span>`
    : `<span class="price">${money(p.price)}</span>`;
  const unitHtml = p.unit ? `<span class="unit-label">${t('unit_prefix')}${escapeHtml(p.unit)}</span>` : '';

  const btn = unavailable
    ? `<button class="btn btn-outline btn-block" disabled aria-disabled="true">${t('out_of_stock')}</button>`
    : `<button class="btn btn-primary btn-block" data-add="${p.id}">${t('add_to_cart')}</button>`;

  return `
    <article class="card${unavailable ? ' is-unavailable' : ''}">
      <div class="card-media">
        ${tags}
        <a href="${link}" data-view="${p.id}" aria-label="${escapeHtml(pName(p))}">
          <img src="${img}" alt="${escapeHtml(pName(p))}" loading="lazy">
        </a>
      </div>
      <div class="card-body">
        <span class="card-cat">${escapeHtml(pCat(p))}</span>
        <h3 class="card-title"><a href="${link}" data-view="${p.id}">${escapeHtml(pName(p))}</a></h3>
        <p class="card-desc">${escapeHtml(pDesc(p))}</p>
        <div class="price-row">${priceHtml} ${unitHtml}</div>
        <div class="card-footer">${btn}</div>
      </div>
    </article>`;
}

/* ----- קטגוריות ייחודיות (לפי id יציב = שם עברי) ----- */
function getCategories() {
  const map = new Map();
  ALL_PRODUCTS.forEach(p => {
    const key = p.category_he || p.category_ar;
    if (key && !map.has(key)) map.set(key, p);
  });
  return [...map.entries()].map(([key, p]) => ({ key, label: pCat(p) }));
}

/* ----- סרגל קטגוריות ----- */
function renderCategoryBar() {
  const bar = document.getElementById('category-bar');
  if (!bar) return;
  const cats = getCategories();
  bar.innerHTML =
    `<button class="chip" data-cat="all" ${activeCategory === 'all' ? 'aria-current="true"' : ''}>${t('all_categories')}</button>` +
    cats.map(c => `<button class="chip" data-cat="${escapeHtml(c.key)}" ${activeCategory === c.key ? 'aria-current="true"' : ''}>${escapeHtml(c.label)}</button>`).join('');
}

/* ----- סינון לפי חיפוש + קטגוריה ----- */
function filterProducts() {
  const term = searchTerm.trim().toLowerCase();
  return ALL_PRODUCTS.filter(p => {
    const catKey = p.category_he || p.category_ar;
    if (activeCategory !== 'all' && catKey !== activeCategory) return false;
    if (!term) return true;
    const hay = [p.name_he, p.name_ar, p.desc_he, p.desc_ar, p.category_he, p.category_ar].join(' ').toLowerCase();
    return hay.includes(term);
  });
}

/* ----- רינדור הקטלוג (מקובץ לקטגוריות) ----- */
function renderCatalog() {
  const wrap = document.getElementById('catalog');
  if (!wrap) return;
  const list = filterProducts();

  if (!ALL_PRODUCTS.length) {
    wrap.innerHTML = `<div class="status-msg">${t('empty_catalog')}</div>`;
    return;
  }
  if (!list.length) {
    wrap.innerHTML = `<div class="status-msg">${t('no_results')}</div>`;
    return;
  }

  // קיבוץ לפי קטגוריה (לפי מפתח עברי יציב, בסדר ההופעה)
  const groups = new Map();
  list.forEach(p => {
    const key = p.category_he || p.category_ar;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  });

  wrap.innerHTML = [...groups.entries()].map(([key, items]) => `
    <section class="section" id="cat-${slug(key)}">
      <div class="section-head"><h2 class="category-title">${escapeHtml(pCat(items[0]))}</h2></div>
      <div class="product-grid">${items.map(productCard).join('')}</div>
    </section>`).join('');
}

/* ----- מוצרים מומלצים ----- */
function renderFeatured() {
  const wrap = document.getElementById('featured');
  if (!wrap) return;
  const feats = ALL_PRODUCTS.filter(p => p.featured).slice(0, 8);
  const section = document.getElementById('featured-section');
  if (!feats.length) { if (section) section.hidden = true; return; }
  if (section) section.hidden = false;
  wrap.innerHTML = `<div class="product-grid">${feats.map(productCard).join('')}</div>`;
}

/* עזר: slug בטוח ל-id (תומך יוניקוד) */
function slug(s) { return encodeURIComponent(String(s).trim().replace(/\s+/g, '-')); }

/* ----- אירועים ----- */
function wireCatalogEvents() {
  // חיפוש חי
  const search = document.getElementById('search-input');
  if (search) search.addEventListener('input', e => { searchTerm = e.target.value; renderCatalog(); });

  // קליק על קטגוריה / הוספה לסל / צפייה
  document.addEventListener('click', e => {
    const chip = e.target.closest('[data-cat]');
    if (chip) {
      activeCategory = chip.getAttribute('data-cat');
      renderCategoryBar(); renderCatalog();
      const catalog = document.getElementById('catalog');
      if (catalog) window.scrollTo({ top: catalog.offsetTop - 150, behavior: 'smooth' });
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add) {
      const p = ALL_PRODUCTS.find(x => x.id === add.getAttribute('data-add'));
      if (p) addToCart(p, 1);
      return;
    }
    const view = e.target.closest('[data-view]');
    if (view) {
      const p = ALL_PRODUCTS.find(x => x.id === view.getAttribute('data-view'));
      if (p) trackEvent('ViewContent', { content_ids: [p.id], content_name: pName(p), value: effectivePrice(p), currency: 'ILS' });
      // הניווט מתבצע רגיל דרך ה-href
    }
  });

  // רינדור מחדש בהחלפת שפה
  document.addEventListener('langchange', () => {
    renderCategoryBar(); renderFeatured(); renderCatalog();
  });
}

/* ----- אתחול עמוד הבית ----- */
async function initHome() {
  const catalog = document.getElementById('catalog');
  if (catalog) catalog.innerHTML = `<div class="status-msg"><div class="spinner" aria-hidden="true"></div><span aria-live="polite">${t('loading')}</span></div>`;

  wireCatalogEvents();
  ALL_PRODUCTS = await fetchProducts();
  renderCategoryBar();
  renderFeatured();
  renderCatalog();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('catalog')) initHome();
});

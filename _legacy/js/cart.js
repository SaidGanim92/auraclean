/* ==========================================================================
   cart.js – סל הקניות, סיכום, טופס הזמנה ושליחה בוואטסאפ
   הסל נשמר ב-localStorage. אין סליקה – ההזמנה נסגרת בוואטסאפ.
   ========================================================================== */

const CART_KEY = 'auraclean_cart';

/* מבנה פריט בסל: { id, name_he, name_ar, price, unit, image, qty } */
function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  catch { return []; }
}
function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartCount();
}
let cart = loadCart();

/* ----- פעולות סל ----- */
function addToCart(product, qty = 1) {
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: product.id,
      name_he: product.name_he, name_ar: product.name_ar,
      price: effectivePrice(product),
      unit: product.unit || '',
      image: productImage(product),
      qty,
    });
  }
  saveCart(cart);
  renderCart();
  trackEvent('AddToCart', { content_ids: [product.id], content_name: pName(product), value: effectivePrice(product), currency: 'ILS' });
  openDrawer();
}
function setQty(id, qty) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart(cart); renderCart();
}
function removeItem(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart(cart); renderCart();
}

function cartSubtotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }
function cartTotal() { return cart.length ? cartSubtotal() + CONFIG.SHIPPING_FEE : 0; }

/* שם פריט לפי שפה */
function itemName(i) { return currentLang === 'ar' ? (i.name_ar || i.name_he) : (i.name_he || i.name_ar); }

/* פורמט מחיר */
function money(n) {
  const val = Number(n).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${val} ${t('currency')}`;
}

/* ----- עדכון מונה הסל בכותרת ----- */
function updateCartCount() {
  const c = cartCount();
  document.querySelectorAll('[data-cart-count]').forEach(el => {
    el.textContent = c;
    el.hidden = c === 0;
  });
}

/* ==========================================================================
   מגירת הסל – נבנית דינמית פעם אחת
   ========================================================================== */
function buildDrawer() {
  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  overlay.id = 'cart-overlay';

  const drawer = document.createElement('aside');
  drawer.className = 'drawer';
  drawer.id = 'cart-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-labelledby', 'cart-drawer-title');
  drawer.innerHTML = `
    <div class="drawer-head">
      <h2 id="cart-drawer-title" data-i18n="cart_title"></h2>
      <button type="button" class="icon-btn" data-cart-close aria-label="סגירה">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M6 18L18 6"/></svg>
      </button>
    </div>
    <div class="drawer-body" id="cart-body"></div>
    <div class="drawer-foot" id="cart-foot"></div>`;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  overlay.addEventListener('click', closeDrawer);
  drawer.addEventListener('click', e => { if (e.target.closest('[data-cart-close]')) closeDrawer(); });
  return { overlay, drawer };
}

let drawerEls = null;
function openDrawer() {
  if (!drawerEls) drawerEls = buildDrawer();
  renderCart();
  drawerEls.overlay.classList.add('open');
  drawerEls.drawer.classList.add('open');
  document.addEventListener('keydown', drawerEsc);
}
function closeDrawer() {
  if (!drawerEls) return;
  drawerEls.overlay.classList.remove('open');
  drawerEls.drawer.classList.remove('open');
  document.removeEventListener('keydown', drawerEsc);
}
function drawerEsc(e) { if (e.key === 'Escape') closeDrawer(); }
window.openDrawer = openDrawer;

/* ----- רינדור תוכן הסל ----- */
function renderCart() {
  if (!drawerEls) return;
  const body = drawerEls.drawer.querySelector('#cart-body');
  const foot = drawerEls.drawer.querySelector('#cart-foot');

  if (!cart.length) {
    body.innerHTML = `<div class="empty-cart">
        <p style="font-size:1.05rem;font-weight:700">${t('cart_empty')}</p>
        <a href="index.html#catalog" class="btn btn-primary mt-2" data-cart-close>${t('cart_empty_cta')}</a>
      </div>`;
    foot.innerHTML = '';
    applyTranslations(drawerEls.drawer);
    return;
  }

  body.innerHTML = cart.map(i => `
    <div class="cart-item">
      <img src="${i.image}" alt="${escapeHtml(itemName(i))}">
      <div>
        <div class="ci-name">${escapeHtml(itemName(i))}</div>
        <div class="ci-price">${money(i.price)}${i.unit ? ' · ' + escapeHtml(i.unit) : ''}</div>
        <div class="ci-controls">
          <div class="qty-mini">
            <button type="button" data-dec="${i.id}" aria-label="${t('decrease')}">−</button>
            <span aria-live="polite">${i.qty}</span>
            <button type="button" data-inc="${i.id}" aria-label="${t('increase')}">+</button>
          </div>
          <button type="button" class="ci-remove" data-remove="${i.id}">${t('remove')}</button>
        </div>
      </div>
      <div class="ci-line">${money(i.price * i.qty)}</div>
    </div>`).join('');

  foot.innerHTML = `
    <div class="summary-row"><span>${t('subtotal')}</span><span>${money(cartSubtotal())}</span></div>
    <div class="summary-row"><span>${t('shipping')}</span><span>${money(CONFIG.SHIPPING_FEE)}</span></div>
    <div class="ship-note">${t('shipping_note')}</div>
    <div class="summary-row total"><span>${t('total')}</span><span>${money(cartTotal())}</span></div>
    <button type="button" class="btn btn-gradient btn-block btn-lg mt-2" data-open-checkout>
      ${t('checkout_title')}
    </button>`;

  // חיווט כפתורים
  body.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => setQty(b.dataset.dec, itemQty(b.dataset.dec) - 1));
  body.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => setQty(b.dataset.inc, itemQty(b.dataset.inc) + 1));
  body.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => removeItem(b.dataset.remove));
  foot.querySelector('[data-open-checkout]').onclick = openCheckout;

  applyTranslations(drawerEls.drawer);
}
function itemQty(id) { const i = cart.find(x => x.id === id); return i ? i.qty : 1; }

/* ==========================================================================
   מודאל תשלום/פרטים + שליחה בוואטסאפ
   ========================================================================== */
function buildCheckout() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'checkout-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <div class="modal-head">
        <h2 id="checkout-title" data-i18n="checkout_title"></h2>
        <button type="button" class="icon-btn" data-checkout-close aria-label="סגירה">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M6 18L18 6"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="info-note mt-0" data-i18n="payment_info" style="margin-bottom:14px"></div>
        <form class="checkout-form" id="checkout-form" novalidate>
          <div class="field">
            <label for="co-name"><span data-i18n="f_name"></span> <span class="req">*</span></label>
            <input id="co-name" name="name" type="text" autocomplete="name" required
                   aria-required="true" aria-describedby="err-name">
            <div class="error" id="err-name" role="alert" aria-live="assertive"></div>
          </div>
          <div class="field">
            <label for="co-phone"><span data-i18n="f_phone"></span> <span class="req">*</span></label>
            <input id="co-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required
                   aria-required="true" aria-describedby="err-phone">
            <div class="error" id="err-phone" role="alert" aria-live="assertive"></div>
          </div>
          <div class="field">
            <label for="co-address"><span data-i18n="f_address"></span> <span class="req">*</span></label>
            <input id="co-address" name="address" type="text" autocomplete="street-address" required
                   aria-required="true" aria-describedby="err-address">
            <div class="error" id="err-address" role="alert" aria-live="assertive"></div>
          </div>
          <div class="field">
            <label for="co-notes" data-i18n="f_notes"></label>
            <textarea id="co-notes" name="notes" rows="2"></textarea>
          </div>
          <div class="consent-field">
            <input id="co-consent" name="consent" type="checkbox" aria-describedby="err-consent">
            <label for="co-consent">
              <span data-i18n="consent_label"></span>
              <a href="pages/privacy.html" data-consent-privacy target="_blank" rel="noopener" data-i18n="consent_privacy"></a>
              <span data-i18n="consent_and"></span>
              <a href="pages/terms.html" data-consent-terms target="_blank" rel="noopener" data-i18n="consent_terms"></a>
              <div class="error" id="err-consent" role="alert" aria-live="assertive"></div>
            </label>
          </div>
          <button type="submit" class="btn btn-whatsapp btn-block btn-lg">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.4.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2z"/></svg>
            <span data-i18n="send_whatsapp"></span>
          </button>
        </form>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.closest('[data-checkout-close]')) closeCheckout();
  });
  overlay.querySelector('#checkout-form').addEventListener('submit', submitOrder);
  fixCheckoutLinks(overlay);
  return overlay;
}

/* התאמת נתיבי קישורים (שורש מול תיקיית pages) */
function fixCheckoutLinks(root) {
  const inPages = /\/pages\//.test(location.pathname);
  const prefix = inPages ? '' : 'pages/';
  const p = root.querySelector('[data-consent-privacy]');
  const tm = root.querySelector('[data-consent-terms]');
  if (p) p.href = prefix + 'privacy.html';
  if (tm) tm.href = prefix + 'terms.html';
}

let checkoutEl = null;
function openCheckout() {
  if (!cart.length) return;
  if (!checkoutEl) checkoutEl = buildCheckout();
  closeDrawer();
  checkoutEl.classList.add('open');
  applyTranslations(checkoutEl);
  trackEvent('InitiateCheckout', { value: cartTotal(), currency: 'ILS', num_items: cartCount() });
  const first = checkoutEl.querySelector('#co-name');
  if (first) setTimeout(() => first.focus(), 50);
  document.addEventListener('keydown', checkoutEsc);
}
function closeCheckout() {
  if (checkoutEl) checkoutEl.classList.remove('open');
  document.removeEventListener('keydown', checkoutEsc);
}
function checkoutEsc(e) { if (e.key === 'Escape') closeCheckout(); }

/* ----- ולידציה + שליחה ----- */
function submitOrder(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const name = form.name.value.trim();
  const phone = form.phone.value.trim();
  const address = form.address.value.trim();
  const notes = form.notes.value.trim();
  const consent = form.consent.checked;

  let ok = true;
  ok = setError(form, 'name', name ? '' : t('err_name')) && ok;
  ok = setError(form, 'phone', /^[0-9+\-\s()]{7,}$/.test(phone) ? '' : t('err_phone')) && ok;
  ok = setError(form, 'address', address ? '' : t('err_address')) && ok;
  ok = setError(form, 'consent', consent ? '' : t('err_consent')) && ok;

  if (!ok) {
    // מיקוד לשדה הראשון עם שגיאה
    const firstErr = form.querySelector('[aria-invalid="true"]');
    if (firstErr) firstErr.focus();
    return;
  }

  const url = buildWhatsappUrl({ name, phone, address, notes });
  window.open(url, '_blank');
}

function setError(form, field, msg) {
  const input = form.querySelector(`[name="${field}"]`);
  const errBox = form.querySelector(`#err-${field}`);
  if (errBox) errBox.textContent = msg;
  if (input) {
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  return !msg;
}

/* ----- בניית הודעת וואטסאפ בשפה הפעילה ----- */
function buildWhatsappUrl({ name, phone, address, notes }) {
  const lines = [];
  lines.push(t('wa_greeting'));
  cart.forEach(i => {
    lines.push(`• ${itemName(i)} — ${i.qty} × ${money(i.price)} = ${money(i.price * i.qty)}`);
  });
  lines.push('------------------------');
  lines.push(`${t('wa_sum')}: ${money(cartSubtotal())}`);
  lines.push(`${t('wa_ship')}: ${money(CONFIG.SHIPPING_FEE)}`);
  lines.push(`${t('wa_total')}: ${money(cartTotal())}`);
  lines.push(`${t('wa_name')}: ${name} | ${t('wa_phone')}: ${phone}`);
  lines.push(`${t('wa_address')}: ${address}`);
  lines.push(`${t('wa_notes')}: ${notes || t('wa_none')} | ${t('wa_payment')}: ${t('wa_payment_val')}`);
  lines.push('------------------------');
  lines.push(t('wa_footer'));

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${text}`;
}

/* בריחת HTML למניעת הזרקה */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ----- חיווט כללי ----- */
function initCart() {
  updateCartCount();
  // פתיחת סל מכפתור הכותרת
  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-cart]')) openDrawer();
  });
  // רינדור מחדש בהחלפת שפה (מחירים/שמות)
  document.addEventListener('langchange', () => {
    updateCartCount();
    if (drawerEls && drawerEls.drawer.classList.contains('open')) renderCart();
    if (checkoutEl) fixCheckoutLinks(checkoutEl);
  });
}
document.addEventListener('DOMContentLoaded', initCart);

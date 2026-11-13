import { categories, dishes, dishPhotos, customDishPhotos } from './menu.js?v=5';
import { kkCategories, kkDishes, words } from './locales.js?v=6';
const $ = id => document.getElementById(id);
let language = 'ru';
const t = key => words[language][key];
const dishName = d => language === 'kk' ? (kkDishes[d.id] || d.name) : d.name;
const categoryName = c => language === 'kk' ? (kkCategories[c.id] || c.name) : c.name;
const money = n => `${new Intl.NumberFormat('ru-RU').format(n)} ₸`;
const items = new Map(dishes.map(d => [d.id, d]));
const categoryMap = new Map(categories.map(c => [c.id, c]));
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const sparkle = '<svg class="sparkle-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.5c.45 5.4 2.1 7.05 7.5 7.5-5.4.45-7.05 2.1-7.5 7.5-.45-5.4-2.1-7.05-7.5-7.5C9.9 9.55 11.55 7.9 12 2.5Z" fill="currentColor"/><path d="M19 15.5c.18 2.1.82 2.74 2.9 2.92-2.08.18-2.72.82-2.9 2.92-.18-2.1-.82-2.74-2.9-2.92 2.08-.18 2.72-.82 2.9-2.92Z" fill="currentColor"/></svg>';
let selected = 'breakfast';
let cart = {};
try {
  const stored = JSON.parse(localStorage.getItem('tan-cafe-cart-v1') || '{}');
  if (stored && typeof stored === 'object') for (const [id, quantity] of Object.entries(stored)) {
    if (items.has(id) && Number.isInteger(quantity) && quantity > 0 && quantity <= 99) cart[id] = quantity;
  }
} catch {}
const count = () => Object.values(cart).reduce((sum, q) => sum + q, 0);
const total = () => Object.entries(cart).reduce((sum, [id, q]) => sum + items.get(id).price * q, 0);
const normalize = value => value.toLocaleLowerCase().replaceAll('ё', 'е').trim();
let toastTimer, opener;
function showToast(text) { $('toast').textContent = text; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 1800); }
function controls(d) {
  const q = cart[d.id] || 0, name = escapeHtml(dishName(d));
  if (!q) return `<button class="add-button" data-action="increase" data-id="${d.id}" aria-label="${t('addAria')}${name}"><span aria-hidden="true">+</span> <span>${t('add')}</span></button>`;
  return `<div class="quantity-control" aria-label="${t('quantity')}${name}"><button data-action="decrease" data-id="${d.id}" aria-label="${t('decrease')}${name}">−</button><output>${q}</output><button data-action="increase" data-id="${d.id}" aria-label="${t('increase')}${name}" ${q >= 99 ? 'disabled' : ''}>+</button></div>`;
}
function renderCategories() {
  const active = $('dish-search').value.trim() ? 'all' : selected;
  const list = [{id:'all',name:t('all')}, ...categories.map(c=>({...c,name:categoryName(c)}))];
  $('category-list').innerHTML = list.map(c => `<button class="category-button ${c.id === active ? 'active' : ''}" data-category="${c.id}" aria-pressed="${c.id === active}"><span>${escapeHtml(c.name)}</span><span aria-hidden="true">↗</span></button>`).join('');
}
function renderMenu() {
  const query = normalize($('dish-search').value);
  const tokens = query.split(/\s+/).filter(Boolean);
  const visible = dishes.filter(d => query ? tokens.every(token => normalize([d.name, kkDishes[d.id] || '', categoryMap.get(d.category).name, kkCategories[d.category] || ''].join(' ')).includes(token)) : selected === 'all' || d.category === selected);
  $('category-title').textContent = query ? t('results') : selected === 'all' ? t('all') : categoryName(categoryMap.get(selected));
  const n = visible.length;
  const ending = language === 'kk' ? 'позиция' : n % 10 === 1 && n % 100 !== 11 ? 'позиция' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'позиции' : 'позиций';
  $('result-count').textContent = `${n} ${ending}`;
  $('dish-grid').innerHTML = visible.map(d => {
    const name = escapeHtml(dishName(d)), photo = dishPhotos[d.id];
    const visual = photo ? `<img src="${escapeHtml(photo)}" alt="${name}" loading="lazy" onerror="this.parentElement.classList.add('missing');this.remove()">${customDishPhotos[d.id] ? '' : `<span class="photo-disclaimer">${t('photo')}</span>`}` : '';
    return `<article class="dish-card"><div class="dish-image${photo ? '' : ' missing'}">${visual}<div class="photo-placeholder" aria-hidden="true">${sparkle}<small>${t('photoSoon')}</small></div></div><div class="dish-info"><p class="dish-category">${escapeHtml(categoryName(categoryMap.get(d.category)))}</p><h4>${name}</h4><div class="dish-footer"><strong>${money(d.price)}</strong><div data-controls="${d.id}">${controls(d)}</div></div></div></article>`;
  }).join('');
  $('empty-search').hidden = visible.length > 0;
  renderCategories();
}
function renderCart() {
  const entries = Object.entries(cart);
  $('cart-footer').hidden = entries.length === 0;
  if (!entries.length) { $('cart-body').innerHTML = `<div class="empty-cart">${sparkle}<h3>${t('empty')}</h3><p>${t('addDishes')}</p><button class="secondary-button" id="empty-to-menu">${t('toMenu')}</button></div>`; return; }
  $('cart-body').innerHTML = entries.map(([id, q]) => { const d = items.get(id), name = escapeHtml(dishName(d)); return `<div class="cart-item"><div class="cart-item-top"><div><h3>${name}</h3><p>${money(d.price)} ${t('perItem')}</p></div><button class="remove-item" data-action="remove" data-id="${id}" aria-label="${t('remove')}${name}">×</button></div><div class="cart-item-bottom">${controls(d)}<strong>${money(d.price * q)}</strong></div></div>`; }).join('');
}
function updateCart() {
  $('cart-count').textContent = count(); $('open-cart').setAttribute('aria-label', t('openCart') + count());
  $('mobile-cart').hidden = count() === 0; $('mobile-cart-count').textContent = count(); $('mobile-cart-total').textContent = money(total()); $('cart-total').textContent = money(total());
  document.querySelectorAll('[data-controls]').forEach(el => el.innerHTML = controls(items.get(el.dataset.controls)));
  if ($('cart-dialog').open) renderCart();
}
function renderOrder() {
  $('order-summary').innerHTML = Object.entries(cart).map(([id,q]) => `<div class="order-line"><span>${escapeHtml(dishName(items.get(id)))} <b>× ${q}</b></span><strong>${money(items.get(id).price*q)}</strong></div>`).join('') + `<div class="order-line order-total"><span>${t('total')}</span><strong>${money(total())}</strong></div>`;
}
function setLanguage(lang) {
  if (!words[lang]) return;
  language = lang; document.documentElement.lang = lang; document.title = `${t('menu')} — ТАҢ Family Cafe`;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $('dish-search').placeholder = t('search'); $('dish-search').setAttribute('aria-label', t('searchLabel'));
  $('menu-sidebar').setAttribute('aria-label', t('categories'));
  $('close-cart').setAttribute('aria-label',t('closeCart')); $('close-order').setAttribute('aria-label',t('closeOrder'));
  $('language-switch').textContent = lang === 'ru' ? 'ҚАЗ' : 'РУС'; $('language-switch').setAttribute('aria-label', lang === 'ru' ? 'Қазақ тіліне ауысу' : 'Переключить на русский');
  renderMenu(); updateCart(); if ($('order-dialog').open) renderOrder();
}
function changeQuantity(id, delta) {
  if (!items.has(id)) return;
  const old = cart[id] || 0, next = Math.max(0, Math.min(99, old + delta));
  if (next) cart[id] = next; else delete cart[id];
  try { localStorage.setItem('tan-cafe-cart-v1', JSON.stringify(cart)); } catch {}
  updateCart(); if (delta > 0 && old === 0 && !$('cart-dialog').open) showToast(t('added'));
}
function openCart() { opener = document.activeElement; renderCart(); if (!$('cart-dialog').open) $('cart-dialog').showModal(); $('close-cart').focus(); }
function closeCart() { $('cart-dialog').close(); if (opener?.isConnected) opener.focus(); }
document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => {
  setLanguage(button.dataset.language); const screen = $('intro-screen');
  screen.classList.add('intro-finished'); document.body.classList.remove('choosing-language');
  document.querySelectorAll('[inert]').forEach(el => el.removeAttribute('inert'));
  $('intro-video').pause(); setTimeout(() => screen.remove(), 350); $('open-cart').focus({preventScroll:true});
}));
$('language-switch').addEventListener('click', () => setLanguage(language === 'ru' ? 'kk' : 'ru'));
$('open-cart').addEventListener('click', openCart); $('mobile-cart').addEventListener('click', openCart); $('close-cart').addEventListener('click', closeCart);
$('category-list').addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (!button) return; selected = button.dataset.category; $('dish-search').value = ''; renderMenu(); $('category-list').querySelector(`[data-category="${selected}"]`)?.focus({preventScroll:true}); });
$('dish-search').addEventListener('input', renderMenu);
$('reset-search').addEventListener('click', () => { selected = 'all'; $('dish-search').value = ''; renderMenu(); $('dish-search').focus(); });
document.addEventListener('click', event => {
  if (event.target.closest('#empty-to-menu')) { closeCart(); $('menu').scrollIntoView({behavior:'smooth'}); return; }
  const button = event.target.closest('[data-action]'); if (!button) return;
  const {id, action} = button.dataset, inCart = !!button.closest('#cart-dialog');
  changeQuantity(id, action === 'increase' ? 1 : action === 'remove' ? -(cart[id] || 0) : -1);
  const scope = inCart ? $('cart-body') : $('dish-grid');
  const next = scope.querySelector(`[data-id="${id}"][data-action="${action}"]`) || scope.querySelector(`[data-id="${id}"][data-action="increase"]`);
  if (next && !next.disabled) next.focus({preventScroll:true}); else if (inCart) (scope.querySelector('button') || $('close-cart')).focus({preventScroll:true});
});
$('review-order').addEventListener('click', () => { if (!count()) return; renderOrder(); $('cart-dialog').close(); $('order-dialog').showModal(); $('close-order').focus(); });
$('close-order').addEventListener('click', () => { $('order-dialog').close(); $('open-cart').focus(); });
$('back-to-cart').addEventListener('click', () => { $('order-dialog').close(); openCart(); });
for (const dialog of [$('cart-dialog'), $('order-dialog')]) dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });
$('logo-animation').play().catch(() => {});
setLanguage('ru');
document.querySelector('[data-language="kk"]').focus({preventScroll:true});

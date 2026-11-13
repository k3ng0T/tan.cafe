import { categories, dishes, dishPhotos } from './menu.js';

const $ = id => document.getElementById(id);
const money = n => `${new Intl.NumberFormat('ru-RU').format(n)} ₸`;
const items = new Map(dishes.map(d => [d.id, d]));
const categoryMap = new Map(categories.map(c => [c.id, c]));
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let selected = 'breakfast';
let cart = {};
try {
  const stored = JSON.parse(localStorage.getItem('tan-cafe-cart-v1') || '{}');
  if (stored && typeof stored === 'object') for (const [id, quantity] of Object.entries(stored)) {
    if (items.has(id) && Number.isInteger(quantity) && quantity > 0 && quantity <= 99) cart[id] = quantity;
  }
} catch { /* The menu remains usable if storage is unavailable. */ }
const count = () => Object.values(cart).reduce((sum, q) => sum + q, 0);
const total = () => Object.entries(cart).reduce((sum, [id, q]) => sum + items.get(id).price * q, 0);
const normalize = value => value.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim();
let toastTimer, opener;
function showToast(text) { $('toast').textContent = text; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 1800); }
function controls(d) {
  const q = cart[d.id] || 0, name = escapeHtml(d.name);
  if (!q) return `<button class="add-button" data-action="increase" data-id="${d.id}" aria-label="Добавить ${name} в корзину"><span aria-hidden="true">+</span> <span>Добавить</span></button>`;
  return `<div class="quantity-control" aria-label="Количество: ${name}"><button data-action="decrease" data-id="${d.id}" aria-label="Уменьшить количество: ${name}">−</button><output>${q}</output><button data-action="increase" data-id="${d.id}" aria-label="Увеличить количество: ${name}" ${q >= 99 ? 'disabled' : ''}>+</button></div>`;
}
function renderCategories() {
  const active = $('dish-search').value.trim() ? 'all' : selected;
  $('category-list').innerHTML = [{id:'all',name:'Всё меню'}, ...categories].map(c => `<button class="category-button ${c.id === active ? 'active' : ''}" data-category="${c.id}" aria-pressed="${c.id === active}"><span>${escapeHtml(c.name)}</span><span aria-hidden="true">↗</span></button>`).join('');
}
function renderMenu() {
  const query = normalize($('dish-search').value);
  const tokens = query.split(/\s+/).filter(Boolean);
  const visible = dishes.filter(d => query ? tokens.every(t => normalize(d.name + ' ' + categoryMap.get(d.category).name).includes(t)) : selected === 'all' || d.category === selected);
  $('category-title').textContent = query ? 'Результаты поиска' : selected === 'all' ? 'Всё меню' : categoryMap.get(selected).name;
  const n = visible.length;
  const ending = n % 10 === 1 && n % 100 !== 11 ? 'позиция' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'позиции' : 'позиций';
  $('result-count').textContent = `${n} ${ending}`;
  $('dish-grid').innerHTML = visible.map(d => {
    const photo = dishPhotos[d.id];
    const visual = photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(d.name)}" loading="lazy" onerror="this.parentElement.classList.add('missing');this.remove()">` : '';
    return `<article class="dish-card"><div class="dish-image${photo ? '' : ' missing'}">${visual}<div class="photo-placeholder" aria-hidden="true"><span>✳</span><small>ФОТО СКОРО</small></div></div><div class="dish-info"><p class="dish-category">${escapeHtml(categoryMap.get(d.category).name)}</p><h4>${escapeHtml(d.name)}</h4><div class="dish-footer"><strong>${money(d.price)}</strong><div data-controls="${d.id}">${controls(d)}</div></div></div></article>`;
  }).join('');
  $('empty-search').hidden = visible.length > 0;
  renderCategories();
}
function renderCart() {
  const entries = Object.entries(cart);
  $('cart-footer').hidden = entries.length === 0;
  if (!entries.length) { $('cart-body').innerHTML = '<div class="empty-cart"><span>✳</span><h3>Здесь пока пусто</h3><p>Добавьте блюда из меню</p><button class="secondary-button" id="empty-to-menu">Перейти к меню</button></div>'; return; }
  $('cart-body').innerHTML = entries.map(([id, q]) => { const d = items.get(id); return `<div class="cart-item"><div class="cart-item-top"><div><h3>${escapeHtml(d.name)}</h3><p>${money(d.price)} за шт.</p></div><button class="remove-item" data-action="remove" data-id="${id}" aria-label="Удалить ${escapeHtml(d.name)}">×</button></div><div class="cart-item-bottom">${controls(d)}<strong>${money(d.price * q)}</strong></div></div>`; }).join('');
}
function updateCart() {
  $('cart-count').textContent = count(); $('open-cart').setAttribute('aria-label', `Открыть корзину, блюд: ${count()}`);
  $('mobile-cart').hidden = count() === 0; $('mobile-cart-count').textContent = count(); $('mobile-cart-total').textContent = money(total()); $('cart-total').textContent = money(total());
  document.querySelectorAll('[data-controls]').forEach(el => el.innerHTML = controls(items.get(el.dataset.controls)));
  if ($('cart-dialog').open) renderCart();
}
function changeQuantity(id, delta) {
  if (!items.has(id)) return;
  const old = cart[id] || 0, next = Math.max(0, Math.min(99, old + delta));
  if (next) cart[id] = next; else delete cart[id];
  try { localStorage.setItem('tan-cafe-cart-v1', JSON.stringify(cart)); } catch {}
  updateCart(); if (delta > 0 && old === 0 && !$('cart-dialog').open) showToast('Добавлено в корзину');
}
function openCart() { opener = document.activeElement; renderCart(); if (!$('cart-dialog').open) $('cart-dialog').showModal(); $('close-cart').focus(); }
function closeCart() { $('cart-dialog').close(); if (opener?.isConnected) opener.focus(); }
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
$('review-order').addEventListener('click', () => {
  if (!count()) return;
  $('order-summary').innerHTML = Object.entries(cart).map(([id,q]) => `<div class="order-line"><span>${escapeHtml(items.get(id).name)} <b>× ${q}</b></span><strong>${money(items.get(id).price*q)}</strong></div>`).join('') + `<div class="order-line order-total"><span>Итого</span><strong>${money(total())}</strong></div>`;
  $('cart-dialog').close(); $('order-dialog').showModal(); $('close-order').focus();
});
$('close-order').addEventListener('click', () => { $('order-dialog').close(); $('open-cart').focus(); });
$('back-to-cart').addEventListener('click', () => { $('order-dialog').close(); openCart(); });
for (const dialog of [$('cart-dialog'), $('order-dialog')]) dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });
const logoAnimation = $('logo-animation');
const animationToggle = $('logo-animation-toggle');
function syncAnimationToggle() {
  const paused = logoAnimation.paused;
  animationToggle.textContent = paused ? '▶' : 'Ⅱ';
  animationToggle.setAttribute('aria-label', paused ? 'Включить анимацию логотипа' : 'Приостановить анимацию логотипа');
  animationToggle.title = paused ? 'Включить анимацию' : 'Приостановить анимацию';
}
logoAnimation.addEventListener('play', syncAnimationToggle);
logoAnimation.addEventListener('pause', syncAnimationToggle);
animationToggle.addEventListener('click', () => {
  if (logoAnimation.paused) logoAnimation.play().catch(syncAnimationToggle);
  else logoAnimation.pause();
});
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) logoAnimation.play().catch(syncAnimationToggle);
syncAnimationToggle();
renderMenu(); updateCart();


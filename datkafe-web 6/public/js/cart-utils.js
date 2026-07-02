/* Cart utilities dung chung cho tat ca cac trang. Luu gio hang trong localStorage.
   Moi san pham co nhieu size (100ml/200ml) nen 1 dong gio hang duoc xac dinh boi (id + size). */
const CART_KEY = 'datkafe_cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(id, size, qty = 1) {
  const cart = getCart();
  const existing = cart.find((i) => i.id === id && i.size === size);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id, size, qty });
  }
  saveCart(cart);
}

function updateCartQty(id, size, qty) {
  let cart = getCart();
  if (qty <= 0) {
    cart = cart.filter((i) => !(i.id === id && i.size === size));
  } else {
    const item = cart.find((i) => i.id === id && i.size === size);
    if (item) item.qty = qty;
  }
  saveCart(cart);
}

function removeFromCart(id, size) {
  const cart = getCart().filter((i) => !(i.id === id && i.size === size));
  saveCart(cart);
}

function clearCart() {
  saveCart([]);
}

function cartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function updateCartBadge() {
  const badge = document.querySelector('.cart-count');
  if (badge) badge.textContent = cartCount();
}

function formatVND(amount) {
  return amount.toLocaleString('vi-VN') + '₫';
}

document.addEventListener('DOMContentLoaded', updateCartBadge);

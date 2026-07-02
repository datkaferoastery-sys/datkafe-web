/**
 * Kho luu don hang don gian bang file JSON.
 * PHU HOP DE DEMO / KHOI CHAY NHANH.
 * Khi len production that su, nen thay bang database that (PostgreSQL, MongoDB...)
 * vi file JSON khong an toan khi nhieu nguoi dat hang cung luc.
 */
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'orders.json');

function readAll() {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Loi doc orders.json:', e);
    return [];
  }
}

function writeAll(orders) {
  fs.writeFileSync(DB_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}

function createOrder(order) {
  const orders = readAll();
  orders.push(order);
  writeAll(orders);
  return order;
}

function findById(orderId) {
  return readAll().find((o) => o.orderId === orderId);
}

function updateOrder(orderId, patch) {
  const orders = readAll();
  const idx = orders.findIndex((o) => o.orderId === orderId);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...patch };
  writeAll(orders);
  return orders[idx];
}

module.exports = { createOrder, findById, updateOrder, readAll };

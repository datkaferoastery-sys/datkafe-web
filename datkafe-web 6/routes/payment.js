const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { VNPay, ProductCode, VnpLocale, ignoreLogger } = require('vnpay');
const orderStore = require('../utils/orderStore');

const router = express.Router();
const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');

function loadProducts() {
  return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
}

function getVnpayInstance() {
  return new VNPay({
    tmnCode: process.env.VNP_TMNCODE,
    secureSecret: process.env.VNP_HASHSECRET,
    testMode: process.env.VNP_TESTMODE !== 'false',
    hashAlgorithm: 'SHA512',
    enableLog: true,
    loggerFn: ignoreLogger,
  });
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.socket.remoteAddress ||
    '127.0.0.1'
  );
}

/**
 * POST /api/checkout
 * body: { items: [{ id, size, qty }], customer: { name, phone, email, address, note } }
 *
 * QUAN TRONG: gia tien luon duoc tinh lai tu products.json o server dua tren id + size,
 * KHONG bao gio tin tuong gia gui len tu trinh duyet.
 */
router.post('/checkout', (req, res) => {
  try {
    const { items, customer } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Gio hang trong' });
    }
    if (!customer || !customer.name || !customer.phone || !customer.address) {
      return res.status(400).json({ error: 'Thieu thong tin khach hang (ten, sdt, dia chi)' });
    }
    if (!process.env.VNP_TMNCODE || process.env.VNP_TMNCODE === 'YOUR_TMN_CODE') {
      return res.status(500).json({
        error: 'Chua cau hinh VNP_TMNCODE/VNP_HASHSECRET trong file .env. Xem README de biet cach dang ky tai khoan VNPay.',
      });
    }

    const products = loadProducts();
    let amount = 0;
    const lineItems = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.id);
      if (!product) {
        return res.status(400).json({ error: `San pham khong ton tai: ${item.id}` });
      }
      const sizeObj = (product.sizes || []).find((s) => s.label === item.size);
      if (!sizeObj) {
        return res.status(400).json({ error: `Size khong hop le cho san pham: ${product.name}` });
      }
      const qty = Math.max(1, parseInt(item.qty, 10) || 1);
      amount += sizeObj.price * qty;
      lineItems.push({ id: product.id, name: product.name, size: sizeObj.label, price: sizeObj.price, qty });
    }

    const orderId = `DK${Date.now()}${crypto.randomInt(100, 999)}`;

    orderStore.createOrder({
      orderId,
      items: lineItems,
      amount,
      customer,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    const vnpay = getVnpayInstance();
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: amount,
      vnp_IpAddr: getClientIp(req),
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan don hang ${orderId} Dat Kafe`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: `${baseUrl}/api/vnpay-return`,
      vnp_Locale: VnpLocale.VN,
    });

    return res.json({ paymentUrl, orderId, amount });
  } catch (err) {
    console.error('Loi tao don hang / payment URL:', err);
    return res.status(500).json({ error: 'Co loi khi tao don hang, vui long thu lai.' });
  }
});

/**
 * GET /api/vnpay-return
 * VNPay redirect khach hang ve day sau khi thanh toan.
 * Chi dung de HIEN THI UI cho khach — KHONG dung de xac nhan don hang chinh thuc.
 * Xac nhan chinh thuc phai dua vao IPN (duoi day) vi return URL co the bi khach bo qua/tat trinh duyet.
 */
router.get('/vnpay-return', (req, res) => {
  const vnpay = getVnpayInstance();
  try {
    const verify = vnpay.verifyReturnUrl(req.query);
    const orderId = req.query.vnp_TxnRef;

    if (!verify.isVerified) {
      return res.redirect(`/order-result.html?status=invalid&orderId=${orderId || ''}`);
    }
    if (!verify.isSuccess) {
      return res.redirect(`/order-result.html?status=failed&orderId=${orderId || ''}`);
    }
    return res.redirect(`/order-result.html?status=success&orderId=${orderId || ''}`);
  } catch (err) {
    console.error('Loi verify return url:', err);
    return res.redirect('/order-result.html?status=error');
  }
});

/**
 * GET /api/vnpay-ipn
 * VNPay server goi thang vao day (server-to-server) de xac nhan giao dich that su.
 * Day la noi DUY NHAT nen cap nhat trang thai don hang "da thanh toan" trong database.
 * Ban PHAI cau hinh URL nay ("<domain-that>/api/vnpay-ipn") trong trang quan tri merchant cua VNPay.
 */
router.get('/vnpay-ipn', (req, res) => {
  const vnpay = getVnpayInstance();
  try {
    const verify = vnpay.verifyIpnCall(req.query);

    if (!verify.isVerified) {
      return res.json({ RspCode: '97', Message: 'Checksum failed' });
    }

    const order = orderStore.findById(verify.vnp_TxnRef);
    if (!order) {
      return res.json({ RspCode: '01', Message: 'Order not found' });
    }
    if (verify.vnp_Amount !== order.amount) {
      return res.json({ RspCode: '04', Message: 'Invalid amount' });
    }
    if (order.status === 'paid') {
      return res.json({ RspCode: '02', Message: 'Order already confirmed' });
    }
    if (!verify.isSuccess) {
      orderStore.updateOrder(order.orderId, { status: 'failed' });
      return res.json({ RspCode: '00', Message: 'Confirm Success' });
    }

    orderStore.updateOrder(order.orderId, { status: 'paid', paidAt: new Date().toISOString() });
    return res.json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (err) {
    console.error('Loi xu ly IPN:', err);
    return res.json({ RspCode: '99', Message: 'Unknown error' });
  }
});

// GET /api/order/:id - frontend dung de hien thi ket qua don hang
router.get('/order/:id', (req, res) => {
  const order = orderStore.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Khong tim thay don hang' });
  res.json(order);
});

module.exports = router;

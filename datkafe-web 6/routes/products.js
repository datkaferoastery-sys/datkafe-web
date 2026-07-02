const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');

function loadProducts() {
  const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
  return JSON.parse(raw);
}

// GET /api/products - danh sach san pham (co the loc theo category)
router.get('/', (req, res) => {
  const products = loadProducts();
  const { category, featured } = req.query;
  let result = products;
  if (category) {
    result = result.filter((p) => p.category === category);
  }
  if (featured === 'true') {
    result = result.filter((p) => p.featured);
  }
  res.json(result);
});

// GET /api/products/:id - chi tiet 1 san pham
router.get('/:id', (req, res) => {
  const products = loadProducts();
  const product = products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Khong tim thay san pham' });
  res.json(product);
});

module.exports = router;

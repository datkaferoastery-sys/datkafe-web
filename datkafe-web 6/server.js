require('dotenv').config();
const express = require('express');
const path = require('path');

const productsRouter = require('./routes/products');
const paymentRouter = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/products', productsRouter);
app.use('/api', paymentRouter); // /api/checkout, /api/vnpay-return, /api/vnpay-ipn, /api/order/:id

app.listen(PORT, () => {
  console.log(`Dat Kafe web dang chay tai http://localhost:${PORT}`);
});

const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');

exports.createOrder = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { items: rawItems, shippingAddress, payment, paymentMethod, total } = req.body;
    // Normalize items: frontend may send cart items with `product` object or product id
    const items = (rawItems || []).map(it => {
      if (!it) return null;
      // if item contains product object, extract id and price
      const productId = (it.product && (it.product.id || it.product._id || it.product.id)) || it.product || it.productId || it.product_id;
      const price = it.price || (it.product && (it.product.price || it.product.price)) || 0;
      const quantity = it.quantity || 1;
      return { product: productId, price, quantity };
    }).filter(Boolean);
    // verify stock
    for (const it of items) {
      const p = await Product.findById(it.product);
      if (!p || p.stock < it.quantity) return res.status(400).json({ message: `Insufficient stock for ${it.product}` });
    }
    // reduce stock
    for (const it of items) {
      const p = await Product.findById(it.product);
      p.stock -= it.quantity;
      await p.save();
    }
    const calcTotal = total || items.reduce((s, i) => s + (i.price * i.quantity), 0);
    const order = new Order({ user_id: userId, items, total: calcTotal, shipping_address: shippingAddress, payment_method: paymentMethod || (payment && payment.method), payment_transaction_id: payment && payment.transactionId, payment_status: payment && payment.status });
    await order.save();
    // clear cart
    await Cart.clearCart(userId);
    // Return order with both `id` and `_id` for frontend compatibility
    const out = Object.assign({}, order);
    out._id = order.id;
    res.json(out);
  } catch (err) { next(err); }
};

exports.getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const orders = await Order.findByUserId(userId);
    res.json(orders);
  } catch (err) { next(err); }
};

exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const userId = req.user._id || req.user.id;
    if (order.user_id !== userId && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    res.json(order);
  } catch (err) { next(err); }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    // Admin only: get all orders with user details
    const { query } = require('../config/mysql');
    const rows = await query(`SELECT o.*, u.name as user_name, u.email as user_email FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC`);
    res.json(rows || []);
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.updateStatus(req.params.id, status);
    res.json(order);
  } catch (err) { next(err); }
};
const Cart = require('../models/Cart');
const Product = require('../models/Product');

exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const cart = await Cart.findByUserId(userId);
    if (!cart) return res.json({ user_id: userId, items: [] });
    // Load product details for each item
    const itemsWithProducts = await Promise.all((cart.items || []).map(async (item) => {
      const prod = await Product.findById(item.product_id);
      return { ...item, product: prod };
    }));
    res.json({ user_id: userId, items: itemsWithProducts });
  } catch (err) { next(err); }
};

exports.addToCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId, quantity = 1 } = req.body;
    const prod = await Product.findById(productId);
    if (!prod || prod.stock < quantity) return res.status(400).json({ message: 'Insufficient stock' });
    await Cart.addItem(userId, productId, quantity);
    const cart = await Cart.findByUserId(userId);
    const itemsWithProducts = await Promise.all((cart.items || []).map(async (item) => {
      const p = await Product.findById(item.product_id);
      return { ...item, product: p };
    }));
    res.json({ user_id: userId, items: itemsWithProducts });
  } catch (err) { next(err); }
};

exports.updateItem = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId, quantity } = req.body;
    if (quantity <= 0) {
      await Cart.removeItem(userId, productId);
    } else {
      await Cart.addItem(userId, productId, quantity);
    }
    const cart = await Cart.findByUserId(userId);
    const itemsWithProducts = await Promise.all((cart.items || []).map(async (item) => {
      const p = await Product.findById(item.product_id);
      return { ...item, product: p };
    }));
    res.json({ user_id: userId, items: itemsWithProducts });
  } catch (err) { next(err); }
};

exports.removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId } = req.body;
    await Cart.removeItem(userId, productId);
    const cart = await Cart.findByUserId(userId);
    const itemsWithProducts = await Promise.all((cart.items || []).map(async (item) => {
      const p = await Product.findById(item.product_id);
      return { ...item, product: p };
    }));
    res.json({ user_id: userId, items: itemsWithProducts });
  } catch (err) { next(err); }
};

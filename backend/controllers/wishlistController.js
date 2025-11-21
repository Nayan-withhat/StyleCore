const User = require('../models/User');
const mysql = require('../utils/mysql');
const { query } = require('../config/mysql');

exports.getWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Get product details for wishlist items
    const productIds = user.wishlist || [];
    const products = await Promise.all(productIds.map(pid => {
      const Product = require('../models/Product');
      return Product.findById(pid);
    }));
    res.json(products.filter(p => p !== null));
  } catch (err) { next(err); }
};

exports.addToWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const wishlist = Array.isArray(user.wishlist) ? user.wishlist : [];
    if (!wishlist.includes(productId)) wishlist.push(productId);
    const serialized = JSON.stringify(wishlist);
    if (query && query.__sqlite) {
      await query(`UPDATE users SET wishlist = ? WHERE id = ?`, [serialized, userId]);
    } else {
      const p = await mysql.getPool();
      if (p) await p.execute(`UPDATE users SET wishlist = CAST(:wishlist AS JSON) WHERE id = :id`, { wishlist: serialized, id: userId });
    }
    res.json(wishlist);
  } catch (err) { next(err); }
};

exports.removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const wishlist = (Array.isArray(user.wishlist) ? user.wishlist : []).filter(id => id !== productId);
    const serialized = JSON.stringify(wishlist);
    if (query && query.__sqlite) {
      await query(`UPDATE users SET wishlist = ? WHERE id = ?`, [serialized, userId]);
    } else {
      const p = await mysql.getPool();
      if (p) await p.execute(`UPDATE users SET wishlist = CAST(:wishlist AS JSON) WHERE id = :id`, { wishlist: serialized, id: userId });
    }
    res.json(wishlist);
  } catch (err) { next(err); }
};

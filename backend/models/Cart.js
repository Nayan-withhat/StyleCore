const { query } = require('../config/mysql');
const crypto = require('crypto');

// Cart schema: store cart items in a JSON column or separate table
// For simplicity, we'll use a cart_items table with user_id reference

class Cart {
  constructor(data = {}) {
    Object.assign(this, data);
  }

  // Get cart for a user
  static async findByUserId(userId) {
    const rows = await query(`SELECT * FROM cart_items WHERE user_id = ?`, [userId]);
    if (!rows || rows.length === 0) return null;
    const items = rows.map(r => ({
      product_id: r.product_id,
      quantity: Number(r.quantity) || 1
    }));
    return new Cart({ user_id: userId, items });
  }

  // Add or update item in cart
  static async addItem(userId, productId, quantity = 1) {
    const existing = await query(`SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?`, [userId, productId]);
    if (existing && existing.length > 0) {
      // Update quantity
      await query(`UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?`, [quantity, userId, productId]);
    } else {
      // Insert new
      await query(`INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)`, [userId, productId, quantity]);
    }
  }

  // Remove item from cart
  static async removeItem(userId, productId) {
    await query(`DELETE FROM cart_items WHERE user_id = ? AND product_id = ?`, [userId, productId]);
  }

  // Clear cart
  static async clearCart(userId) {
    await query(`DELETE FROM cart_items WHERE user_id = ?`, [userId]);
  }
}

module.exports = Cart;

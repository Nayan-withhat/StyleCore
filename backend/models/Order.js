const { query } = require('../config/mysql');
const crypto = require('crypto');

// Order schema
class Order {
  constructor(data = {}) {
    Object.assign(this, data);
  }

  async save() {
    if (!this.id) this.id = crypto.randomUUID();
    await query(
      `INSERT INTO orders (id, user_id, items, total, shipping_address, payment_method, payment_transaction_id, payment_status, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        this.id,
        this.user_id,
        JSON.stringify(this.items || []),
        this.total || 0,
        JSON.stringify(this.shipping_address || null),
        this.payment_method || null,
        this.payment_transaction_id || null,
        this.payment_status || null,
        this.status || 'Pending'
      ]
    );
    return Order.findById(this.id);
  }

  static async findById(id) {
    const rows = await query(`SELECT * FROM orders WHERE id = ? LIMIT 1`, [id]);
    if (!rows || rows.length === 0) return null;
    const row = rows[0];
    const order = new Order({
      id: row.id,
      user_id: row.user_id,
      items: (() => { try { return JSON.parse(row.items || '[]'); } catch(e) { return []; } })(),
      total: Number(row.total),
      shipping_address: (() => { try { return JSON.parse(row.shipping_address || 'null'); } catch(e) { return null; } })(),
      payment_method: row.payment_method,
      payment_transaction_id: row.payment_transaction_id,
      payment_status: row.payment_status,
      status: row.status
    });
    return order;
  }

  static async findByUserId(userId) {
    const rows = await query(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
    return (rows || []).map(r => new Order({
      id: r.id,
      user_id: r.user_id,
      items: (() => { try { return JSON.parse(r.items || '[]'); } catch(e) { return []; } })(),
      total: Number(r.total),
      shipping_address: (() => { try { return JSON.parse(r.shipping_address || 'null'); } catch(e) { return null; } })(),
      payment_method: r.payment_method,
      payment_transaction_id: r.payment_transaction_id,
      payment_status: r.payment_status,
      status: r.status,
      created_at: r.created_at
    }));
  }

  static async updateStatus(id, status) {
    await query(`UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?`, [status, id]);
    return Order.findById(id);
  }

  static async updatePayment(id, transactionId, paymentStatus) {
    await query(`UPDATE orders SET payment_transaction_id = ?, payment_status = ?, updated_at = NOW() WHERE id = ?`, [transactionId, paymentStatus, id]);
    return Order.findById(id);
  }
}

module.exports = Order;

const { query } = require('../config/mysql');
const crypto = require('crypto');

function parseRow(row) {
  const out = { ...row };
  try { out.images = row.images ? JSON.parse(row.images) : []; } catch (e) { out.images = []; }
  try { out.attributes = row.attributes ? JSON.parse(row.attributes) : null; } catch (e) { out.attributes = null; }
  return out;
}

class Product {
  constructor(data = {}) {
    Object.assign(this, data);
  }

  async save() {
    if (this.id) {
      const now = new Date();
      await query(
        `UPDATE products SET title = ?, description = ?, price = ?, compare_at_price = ?, category = ?, images = ?, sku = ?, stock = ?, is_active = ?, attributes = ?, updated_at = NOW() WHERE id = ?`,
        [
          this.title || null,
          this.description || null,
          this.price || 0,
          this.compareAtPrice || null,
          this.category || null,
          JSON.stringify(this.images || []),
          this.sku || null,
          Number(this.stock) || 0,
          this.isActive ? 1 : 0,
          JSON.stringify(this.attributes || null),
          this.id
        ]
      );
      return Product.findById(this.id);
    }

    this.id = crypto.randomUUID();
    await query(
      `INSERT INTO products (id, title, description, price, compare_at_price, category, images, sku, stock, is_active, attributes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        this.id,
        this.title || null,
        this.description || null,
        this.price || 0,
        this.compareAtPrice || null,
        this.category || null,
        JSON.stringify(this.images || []),
        this.sku || null,
        Number(this.stock) || 0,
        this.isActive ? 1 : 0,
        JSON.stringify(this.attributes || null)
      ]
    );
    return Product.findById(this.id);
  }

  static async findById(id) {
    const rows = await query(`SELECT * FROM products WHERE id = ? LIMIT 1`, [id]);
    if (!rows || rows.length === 0) return null;
    return new Product(parseRow(rows[0]));
  }

  static async findByIdAndUpdate(id, data = {}, opts = {}) {
    // merge fields and update
    const existing = await Product.findById(id);
    if (!existing) return null;
    const updated = Object.assign({}, existing, data);
    const p = new Product(updated);
    await p.save();
    if (opts && opts.new) return Product.findById(id);
    return null;
  }

  static async findByIdAndDelete(id) {
    await query(`DELETE FROM products WHERE id = ?`, [id]);
    return;
  }

  static find(filter = {}) {
    // Build a chainable finder that is thenable so controllers can await it
    const builder = {
      _filter: filter,
      _skip: 0,
      _limit: 100,
      _sort: null,
      skip(n) { this._skip = Number(n) || 0; return this; },
      limit(n) { this._limit = Number(n) || 100; return this; },
      sort(s) { this._sort = s; return this; },
      async then(resolve, reject) {
        try {
          const conditions = [];
          const params = [];
          if (this._filter.title) {
            // support regex-ish search via %...%
            conditions.push(`title LIKE ?`);
            params.push(`%${this._filter.title.replace(/%/g, '')}%`);
          }
          if (this._filter.category) {
            conditions.push(`category = ?`);
            params.push(this._filter.category);
          }
          // support q param (as used by controller)
          if (this._filter.q) {
            conditions.push(`title LIKE ?`);
            params.push(`%${this._filter.q.replace(/%/g, '')}%`);
          }

          const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
          const order = this._sort ? `ORDER BY ${this._sort}` : `ORDER BY created_at DESC`;
          const sql = `SELECT * FROM products ${where} ${order} LIMIT ? OFFSET ?`;
          params.push(Number(this._limit));
          params.push(Number(this._skip || 0));
          const rows = await query(sql, params);
          const parsed = rows.map(parseRow).map(r => new Product(r));
          resolve(parsed);
        } catch (err) { reject(err); }
      }
    };
    return builder;
  }
}

module.exports = Product;

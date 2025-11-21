const { query } = require('../config/mysql'); // now Postgres wrapper
const crypto = require('crypto');

function parseRow(row) {
  const out = { ...row };

  try { out.images = row.images ? row.images : []; } catch (e) { out.images = []; }
  try { out.attributes = row.attributes ? row.attributes : null; } catch (e) { out.attributes = null; }

  return out;
}

class Product {
  constructor(data = {}) {
    Object.assign(this, data);
  }

  async save() {
    // ----------------- UPDATE -----------------
    if (this.id) {
      await query(
        `UPDATE products 
         SET title = $1, 
             description = $2, 
             price = $3, 
             compare_at_price = $4, 
             category = $5, 
             images = $6, 
             sku = $7, 
             stock = $8, 
             is_active = $9, 
             attributes = $10, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $11`,
        [
          this.title || null,
          this.description || null,
          this.price || 0,
          this.compareAtPrice || null,
          this.category || null,
          JSON.stringify(this.images || []),
          this.sku || null,
          Number(this.stock) || 0,
          this.isActive ? true : false,
          JSON.stringify(this.attributes || null),
          this.id
        ]
      );

      return Product.findById(this.id);
    }

    // ----------------- INSERT -----------------
    this.id = crypto.randomUUID();

    await query(
      `INSERT INTO products 
       (id, title, description, price, compare_at_price, category, images, sku, stock, is_active, attributes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
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
        this.isActive ? true : false,
        JSON.stringify(this.attributes || null)
      ]
    );

    return Product.findById(this.id);
  }

  // ----------------- FIND BY ID -----------------
  static async findById(id) {
    const rows = await query(`SELECT * FROM products WHERE id = $1 LIMIT 1`, [id]);
    if (!rows || rows.length === 0) return null;
    return new Product(parseRow(rows[0]));
  }

  // ----------------- FIND BY ID & UPDATE -----------------
  static async findByIdAndUpdate(id, data = {}, opts = {}) {
    const existing = await Product.findById(id);
    if (!existing) return null;

    const updated = Object.assign({}, existing, data);
    const p = new Product(updated);

    await p.save();
    if (opts && opts.new) return Product.findById(id);

    return null;
  }

  // ----------------- DELETE -----------------
  static async findByIdAndDelete(id) {
    await query(`DELETE FROM products WHERE id = $1`, [id]);
    return;
  }

  // ----------------- FIND LIST (search, limit, skip) -----------------
  static find(filter = {}) {
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
          let index = 1;

          // title search
          if (this._filter.title) {
            conditions.push(`title ILIKE $${index}`);
            params.push(`%${this._filter.title}%`);
            index++;
          }

          // category filter
          if (this._filter.category) {
            conditions.push(`category = $${index}`);
            params.push(this._filter.category);
            index++;
          }

          // q (search term)
          if (this._filter.q) {
            conditions.push(`title ILIKE $${index}`);
            params.push(`%${this._filter.q}%`);
            index++;
          }

          const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
          const order = this._sort ? `ORDER BY ${this._sort}` : `ORDER BY created_at DESC`;

          const sql = `
            SELECT * FROM products 
            ${where} 
            ${order} 
            LIMIT $${index} OFFSET $${index + 1}
          `;

          params.push(Number(this._limit));
          params.push(Number(this._skip));

          const rows = await query(sql, params);
          resolve(rows.map(parseRow).map(r => new Product(r)));

        } catch (err) {
          reject(err);
        }
      }
    };

    return builder;
  }
}

module.exports = Product;

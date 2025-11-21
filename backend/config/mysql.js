const { getPool } = require('../utils/mysql');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'filedb.json');

function readFileDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify({ products: [], users: [], addresses: [] }, null, 2));
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return { products: [], users: [], addresses: [] };
  }
}

function writeFileDB(obj) {
  fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2));
}

async function query(sql, params) {
  const pool = await getPool();
  if (pool) {
    const [rows] = await pool.execute(sql, params || []);
    return rows;
  }

  // Fallback: simple file-based JSON DB for free, lifetime local usage
  const db = readFileDB();
  const s = (sql || '').trim().toUpperCase();

  // SELECT single product by id
  if (s.startsWith('SELECT') && s.includes('FROM PRODUCTS') && s.includes('WHERE') && s.includes('ID')) {
    const id = (params && params.length) ? params[0] : null;
    const found = db.products.filter(p => p.id === id);
    return found;
  }

  // SELECT many products with LIMIT OFFSET (we expect last two params to be limit, offset)
  if (s.startsWith('SELECT') && s.includes('FROM PRODUCTS')) {
    // naive filter: check if params provided include a search string
    const all = db.products || [];
    let items = all.slice();
    // if params length >=3, assume [q, limit, offset] or [limit, offset]
    if (params && params.length >= 3) {
      const q = params[0];
      if (q && typeof q === 'string') {
        const qStr = q.replace(/%/g, '').toLowerCase();
        items = items.filter(p => (p.title || '').toLowerCase().includes(qStr));
      }
      const limit = Number(params[params.length - 2]) || items.length;
      const offset = Number(params[params.length - 1]) || 0;
      return items.slice(offset, offset + limit);
    }
    // fallback: return all
    return items;
  }

  // INSERT INTO products (id, title, description, price, compare_at_price, category, images, sku, stock, is_active, attributes, created_at, updated_at)
  if (s.startsWith('INSERT') && s.includes('INTO PRODUCTS')) {
    const vals = params || [];
    // map expected order used by Product.save()
    const prod = {
      id: vals[0],
      title: vals[1],
      description: vals[2],
      price: Number(vals[3]) || 0,
      compare_at_price: vals[4],
      category: vals[5],
      images: (() => { try { return JSON.parse(vals[6] || '[]'); } catch(e){ return []; } })(),
      sku: vals[7],
      stock: Number(vals[8]) || 0,
      is_active: vals[9] ? 1 : 0,
      attributes: (() => { try { return JSON.parse(vals[10] || 'null'); } catch(e){ return null; } })(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.products = db.products || [];
    db.products.push(prod);
    writeFileDB(db);
    return [prod];
  }

  // UPDATE products ... WHERE id = ?
  if (s.startsWith('UPDATE') && s.includes('PRODUCTS SET') && s.includes('WHERE')) {
    const vals = params || [];
    // our update ordering: title, description, price, compare_at_price, category, images, sku, stock, is_active, attributes, id
    const id = vals[vals.length - 1];
    const prod = db.products.find(p => p.id === id);
    if (!prod) return null;
    prod.title = vals[0] || prod.title;
    prod.description = vals[1] || prod.description;
    prod.price = Number(vals[2]) || prod.price;
    prod.compare_at_price = vals[3] || prod.compare_at_price;
    prod.category = vals[4] || prod.category;
    try { prod.images = JSON.parse(vals[5] || JSON.stringify(prod.images || [])); } catch(e){}
    prod.sku = vals[6] || prod.sku;
    prod.stock = Number(vals[7]) || prod.stock;
    prod.is_active = vals[8] ? 1 : prod.is_active;
    try { prod.attributes = JSON.parse(vals[9] || JSON.stringify(prod.attributes || null)); } catch(e){}
    prod.updated_at = new Date().toISOString();
    writeFileDB(db);
    return [prod];
  }

  // DELETE FROM products WHERE id = ?
  if (s.startsWith('DELETE') && s.includes('FROM PRODUCTS')) {
    const id = (params && params.length) ? params[0] : null;
    db.products = (db.products || []).filter(p => p.id !== id);
    writeFileDB(db);
    return [];
  }

  // default fallback: no-op
  return [];
}

async function withTransaction(work) {
  const pool = await getPool();
  if (!pool) throw new Error('MySQL pool not configured. Set MYSQL_* env vars');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  query,
  withTransaction,
  getPool
};

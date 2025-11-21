const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'stylecore.sqlite');
const db = new Database(dbPath);

const id = 'HLJK000281';
const title = 'Highlander Men Black Solid Denim Jacket';
const description = 'Classic black solid denim jacket by Highlander.';
const price = 2499;
const compare_at_price = 4999;
const category = 'jackets';
const images = JSON.stringify(['/product/imges/jacktes/HLJK000281_1.webp','/product/imges/jacktes/HLJK000281_2.webp']);
const sku = 'HLJK000281';
const stock = 20;
const is_active = 1;
const attributes = JSON.stringify(null);

try {
  const stmt = db.prepare(`INSERT OR REPLACE INTO products (id, title, description, price, compare_at_price, category, images, sku, stock, is_active, attributes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  const info = stmt.run(id, title, description, price, compare_at_price, category, images, sku, stock, is_active, attributes);
  console.log('Inserted product, changes:', info.changes);
} catch (e) {
  console.error('Insert failed:', e.message);
} finally {
  db.close();
}

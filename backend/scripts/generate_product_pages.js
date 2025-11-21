const fs = require('fs');
const path = require('path');
const fetch = global.fetch || ((u, o) => require('node-fetch')(u, o));

async function main() {
  try {
    const res = await fetch('http://localhost:5000/api/public/products?limit=500');
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.value || body);
    const tplPath = path.join(__dirname, '..', 'templates', 'product_static_template.html');
    const tplRaw = fs.readFileSync(tplPath, 'utf8');

    const index = {};
    for (const product of items) {
      const images = Array.isArray(product.images) ? product.images : (product.images ? JSON.parse(product.images) : []);
      const title = product.title || product.name || 'product';
      const slugBase = (String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')) + '-' + (product.sku || product.id || product._id || '').toString().toLowerCase();
      const category = (product.category || 'product').toLowerCase();
      const outDir = path.join(__dirname, '..', '..', 'frontend', 'product', category);
      fs.mkdirSync(outDir, { recursive: true });

      const productJson = {
        id: product.id || product._id || product.sku || null,
        title: product.title || '',
        description: product.description || '',
        price: product.price || 0,
        compareAtPrice: product.compare_at_price || product.compareAtPrice || null,
        images: images,
        sku: product.sku || null,
        stock: product.stock || 0,
        category: product.category || category
      };

      let tpl = tplRaw.slice();
      tpl = tpl.replace('%%TITLE%%', escapeHtml(productJson.title || 'Product'));
      tpl = tpl.replace('%%PRICE%%', String(productJson.price || ''));
      tpl = tpl.replace('%%COMPARE_PRICE%%', String(productJson.compareAtPrice || ''));
      tpl = tpl.replace('%%DESCRIPTION%%', escapeHtml(productJson.description || ''));
      tpl = tpl.replace('%%STOCK%%', String(productJson.stock || 0));
      tpl = tpl.replace('%%PRODUCT_JSON%%', JSON.stringify(productJson));

      const outFile = path.join(outDir, `${slugBase}.html`);
      fs.writeFileSync(outFile, tpl, 'utf8');
      index[product.id || product._id || product.sku || ''] = `/product/${category}/${slugBase}.html`;
      console.log('Wrote', outFile);
    }

    // write index file
    const indexPath = path.join(__dirname, '..', '..', 'frontend', 'product', 'product_index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');

  } catch (e) {
    console.error('Failed to generate pages:', e.message);
    process.exit(1);
  }
}

function escapeHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

main();

const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

function slugify(title, skuOrId) {
  return (String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + String(skuOrId || '').toLowerCase())
    .replace(/-+/g, '-');
}

async function generateStaticPage(product) {
  try {
    const tplPath = path.join(__dirname, '..', 'templates', 'product_static_template.html');
    let tpl = fs.readFileSync(tplPath, 'utf8');

    const images = Array.isArray(product.images) ? product.images : (product.images ? JSON.parse(product.images) : []);
    const slug = slugify(product.title || product.sku || product.id, product.sku || product.id);
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

    tpl = tpl.replace('%%TITLE%%', escapeHtml(productJson.title || 'Product'));
    tpl = tpl.replace('%%PRICE%%', String(productJson.price || ''));
    tpl = tpl.replace('%%COMPARE_PRICE%%', String(productJson.compareAtPrice || ''));
    tpl = tpl.replace('%%DESCRIPTION%%', escapeHtml(productJson.description || ''));
    tpl = tpl.replace('%%STOCK%%', String(productJson.stock || 0));
    tpl = tpl.replace('%%PRODUCT_JSON%%', JSON.stringify(productJson));

    const outFile = path.join(outDir, `${slug}.html`);
    fs.writeFileSync(outFile, tpl, 'utf8');

    // Update product index mapping id/sku -> relative path for frontend renderer
    try {
      const indexPath = path.join(__dirname, '..', '..', 'frontend', 'product', 'product_index.json');
      let index = {};
      if (fs.existsSync(indexPath)) {
        try { index = JSON.parse(fs.readFileSync(indexPath, 'utf8') || '{}'); } catch(e){ index = {}; }
      }
      const key = product.id || product.sku || product._id;
      if (key) index[key] = path.posix.join('/product', category, `${slug}.html`);
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
    } catch(e){ /* non-fatal */ }

    return outFile;
  } catch (e) {
    console.error('generateStaticPage error', e.message);
    return null;
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

exports.createProduct = async (req, res, next) => {
  try {
    const p = new Product(req.body);
    await p.save();
    // Attempt to generate a static HTML page for the product (best-effort)
    try { await generateStaticPage(p); } catch(e) { console.warn('static page generate failed', e.message); }
    res.json(p);
  } catch (err) { next(err); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(p);
  } catch (err) { next(err); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.getProducts = async (req, res, next) => {
  try {
    const { q, category, sortBy, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (q) filter.title = { $regex: q, $options: 'i' };
    if (category) filter.category = category;
    let query = Product.find(filter);
    if (sortBy) query = query.sort(sortBy);
    const skip = (Number(page) - 1) * Number(limit);
    const items = await query.skip(skip).limit(Number(limit));
    res.json(items);
  } catch (err) { next(err); }
};

exports.getProduct = async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.id);
    res.json(p);
  } catch (err) { next(err); }
};

// reduce stock helper used by orders
exports.adjustStock = async (productId, qty) => {
  const p = await Product.findById(productId);
  if (!p) throw new Error('Product not found');
  if (p.stock < qty) throw new Error('Out of stock');
  p.stock -= qty;
  await p.save();
};

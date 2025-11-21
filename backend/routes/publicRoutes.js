const express = require('express');
const router = express.Router();
const productCtrl = require('../controllers/productController');
const { query } = require('../config/mysql');
const https = require('https');
let multerAvailable = true;
let multer = null;
const path = require('path');
const fs = require('fs');
try {
  multer = require('multer');
} catch (e) {
  multerAvailable = false;
  console.warn('Warning: multer is not installed. /api/public/product will not accept file uploads until multer is installed.');
}

let upload = null;
if (multerAvailable) {
  // configure multer storage to save into frontend product images folder by category
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      try {
        const categoryRaw = (req.body && req.body.category) ? String(req.body.category) : 'product';
        const category = categoryRaw.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
        const dest = path.join(__dirname, '..', '..', 'frontend', 'product', 'imges', category);
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      } catch (e) { cb(e); }
    },
    filename: function (req, file, cb) {
      const safe = file.originalname.replace(/[^a-z0-9._-]/gi, '-');
      const name = `${Date.now()}-${Math.floor(Math.random()*1000)}-${safe}`;
      cb(null, name);
    }
  });
  upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB per file
}

// Public endpoints for quick product adding/testing from the website or tools.
// WARNING: These endpoints are intentionally unauthenticated for quick testing.
// Remove or protect them before deploying to production.

// Add a product (public - for dev/testing). Supports multipart/form-data with files when multer is installed.
if (multerAvailable && upload) {
  router.post('/product', upload.array('images', 8), async (req, res, next) => {
    try {
      // If files present, convert to public paths and attach to req.body.images
      const categoryRaw = (req.body && req.body.category) ? String(req.body.category) : 'product';
      const category = categoryRaw.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
      if (req.files && req.files.length) {
        const images = req.files.map(f => path.posix.join('/product', 'imges', category, f.filename));
        // attach as array so Product.save will JSON.stringify it later
        req.body.images = images;
      }

      // basic validation
      const { title, price } = req.body;
      if (!title || typeof price === 'undefined') {
        return res.status(400).json({ error: 'title and price are required' });
      }
      // reuse product controller create logic
      await productCtrl.createProduct(req, res, next);
    } catch (err) { next(err); }
  });
} else {
  // Multer not installed: accept JSON body (images as URLs or base64 if backend can handle), reject multipart/form-data
  router.post('/product', async (req, res, next) => {
    try {
      if (req.is && req.is('multipart/form-data')) {
        return res.status(501).json({ error: 'Server missing multer; install multer to accept file uploads' });
      }
      // basic validation and delegate to controller
      const { title, price } = req.body;
      if (!title || typeof price === 'undefined') {
        return res.status(400).json({ error: 'title and price are required' });
      }
      await productCtrl.createProduct(req, res, next);
    } catch (err) { next(err); }
  });
}

// List products (public)
// Supports optional ?format=ndjson to return newline-delimited JSON (one product per line)
router.get('/products', async (req, res, next) => {
  try {
    const { q, category, sortBy, page = 1, limit = 100, format } = req.query;
    // If ndjson requested, stream results line-by-line
    if (format === 'ndjson') {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      return productCtrl.getProducts(req, res, next);
    }

    // otherwise use existing controller which returns JSON array with pagination
    return productCtrl.getProducts(req, res, next);
  } catch (err) { next(err); }
});

// Pincode proxy lookup for India
router.get('/pincode/:pin', async (req, res, next) => {
  try {
    const pin = String(req.params.pin || '').trim();
    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({ message: 'Invalid pincode' });
    }
    const url = `https://api.postalpincode.in/pincode/${pin}`;
    https.get(url, (r) => {
      let data = '';
      r.on('data', (chunk) => data += chunk);
      r.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (Array.isArray(json) && json[0] && json[0].Status === 'Success') {
            const offices = json[0].PostOffice || [];
            const first = offices[0] || {};
            const out = {
              state: first.State || '',
              district: first.District || '',
              city: first.Name || '',
              offices: offices.map(o => ({
                Name: o.Name,
                BranchType: o.BranchType,
                DeliveryStatus: o.DeliveryStatus,
                District: o.District,
                State: o.State
              }))
            };
            return res.json(out);
          }
          return res.status(404).json({ message: 'Pincode not found' });
        } catch (e) { return next(e); }
      });
    }).on('error', (e) => next(e));
  } catch (err) { next(err); }
});

// Dev-only delete by sku (unauthenticated) - remove before production
router.post('/product/delete', async (req, res, next) => {
  try {
    const sku = req.body && (req.body.sku || req.body.id);
    if (!sku) return res.status(400).json({ error: 'sku or id required' });
    // try delete by sku or id
    try {
      await query('DELETE FROM products WHERE sku = ?', [sku]);
      await query('DELETE FROM products WHERE id = ?', [sku]);
    } catch (e) {
      // file-db fallback will handle
    }
    return res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;


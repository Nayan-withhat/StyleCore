const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const cartsFile = path.join(__dirname, '..', 'data', 'carts.json');

function readCarts() {
  try {
    if (!fs.existsSync(cartsFile)) return {};
    const raw = fs.readFileSync(cartsFile, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    console.warn('readCarts error', e.message);
    return {};
  }
}

function writeCarts(obj) {
  try {
    const dir = path.dirname(cartsFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cartsFile, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.warn('writeCarts error', e.message);
  }
}

// Create or update cart: body { cartId?, item: { id, name, price, image, quantity } }
router.post('/', (req, res) => {
  try {
    const { cartId, item } = req.body;
    const carts = readCarts();
    let id = cartId;
    if (!id) id = `c_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    if (!carts[id]) carts[id] = { items: [], total: 0 };

    if (item) {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      const existing = carts[id].items.find(i => String(i.id) === String(item.id));
      if (existing) {
        existing.quantity = (Number(existing.quantity) || 1) + qty;
      } else {
        carts[id].items.push({ id: String(item.id), name: item.name || '', price, image: item.image || '', quantity: qty });
      }
    }

    carts[id].total = carts[id].items.reduce((s, it) => s + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);
    writeCarts(carts);
    return res.json({ cartId: id, items: carts[id].items, total: carts[id].total });
  } catch (e) {
    console.error('POST /api/cart error', e);
    res.status(500).json({ error: 'internal' });
  }
});

// Get cart by id
router.get('/:cartId', (req, res) => {
  try {
    const carts = readCarts();
    const id = req.params.cartId;
    const cart = carts[id] || { items: [], total: 0 };
    return res.json({ cartId: id, items: cart.items, total: cart.total });
  } catch (e) {
    console.error('GET /api/cart/:id error', e);
    res.status(500).json({ error: 'internal' });
  }
});

// Remove an item: body { cartId, itemId }
router.post('/remove', (req, res) => {
  try {
    const { cartId, itemId } = req.body;
    const carts = readCarts();
    if (!cartId || !carts[cartId]) return res.status(404).json({ error: 'cart-not-found' });
    carts[cartId].items = carts[cartId].items.filter(i => String(i.id) !== String(itemId));
    carts[cartId].total = carts[cartId].items.reduce((s, it) => s + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);
    writeCarts(carts);
    return res.json({ cartId, items: carts[cartId].items, total: carts[cartId].total });
  } catch (e) {
    console.error('POST /api/cart/remove error', e);
    res.status(500).json({ error: 'internal' });
  }
});

// Clear cart: body { cartId }
router.post('/clear', (req, res) => {
  try {
    const { cartId } = req.body;
    const carts = readCarts();
    if (cartId && carts[cartId]) delete carts[cartId];
    writeCarts(carts);
    return res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/cart/clear error', e);
    res.status(500).json({ error: 'internal' });
  }
});

module.exports = router;

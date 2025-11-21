const express = require('express');
const router = express.Router();
const productCtrl = require('../controllers/productController');
// middleware files export the function directly
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

router.get('/', productCtrl.getProducts);
router.get('/:id', productCtrl.getProduct);
router.post('/', authMiddleware, adminMiddleware, productCtrl.createProduct);
router.put('/:id', authMiddleware, adminMiddleware, productCtrl.updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, productCtrl.deleteProduct);

module.exports = router;

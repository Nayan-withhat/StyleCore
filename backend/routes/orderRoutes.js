const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// support both POST / and POST /create for historical frontend paths
router.post('/', authMiddleware, orderController.createOrder);
router.post('/create', authMiddleware, orderController.createOrder);
router.get('/my-orders', authMiddleware, orderController.getUserOrders);
router.get('/:id', authMiddleware, orderController.getOrder);
router.get('/', [authMiddleware, adminMiddleware], orderController.getAllOrders);
router.patch('/:id/status', [authMiddleware, adminMiddleware], orderController.updateStatus);

module.exports = router;
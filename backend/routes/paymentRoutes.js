const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/authMiddleware');

router.post('/create', auth, paymentController.createOrder);
router.post('/verify', auth, paymentController.verifyPayment);

module.exports = router;
const express = require('express');
const router = express.Router();
const wish = require('../controllers/wishlistController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, wish.getWishlist);
router.post('/add', authMiddleware, wish.addToWishlist);
router.post('/remove', authMiddleware, wish.removeFromWishlist);

module.exports = router;

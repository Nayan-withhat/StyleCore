const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/userController');
// authMiddleware and adminMiddleware export the middleware function directly
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

router.get('/me', authMiddleware, userCtrl.getProfile);
router.put('/me', authMiddleware, userCtrl.updateProfile);
router.delete('/me', authMiddleware, userCtrl.deleteUser);
router.post('/me/address', authMiddleware, userCtrl.addAddress);

// admin
router.post('/', authMiddleware, adminMiddleware, userCtrl.createUser);

module.exports = router;

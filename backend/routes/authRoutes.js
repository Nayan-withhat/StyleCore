const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', auth.register);
router.post('/login', auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.post('/forgot', auth.forgotPassword);
router.post('/reset', auth.resetPassword);
router.post('/otp/send', auth.sendEmailOtp);
router.post('/otp/verify', auth.verifyEmailOtp);
router.post('/google', auth.googleLogin);
// SMS OTP (requires user auth to bind to current user)
router.post('/otp/sms/send', authMiddleware, auth.sendSmsOtp);
router.post('/otp/sms/verify', authMiddleware, auth.verifySmsOtp);

module.exports = router;

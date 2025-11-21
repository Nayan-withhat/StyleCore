const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { signAccess, signRefresh } = require('../utils/jwt');
const { sendMail } = require('../utils/email');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const mysql = require('../utils/mysql');

// Register
exports.register = async (req, res, next) => {
  try {
    const { email, password, name, phone } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const existing = await mysql.getUserByEmail(email);
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const hash = await bcrypt.hash(password, 10);
    await mysql.createUser({ id, name, email, passwordHash: hash, phone, isPhoneVerified: false, isVerified: false });

    return res.json({ success: true, userId: id });
  } catch (err) { next(err); }
};

// Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await mysql.getUserByEmail(email);
    if (!user) return res.status(404).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const access = signAccess({ id: user.id });
    const refresh = signRefresh({ id: user.id });
    await mysql.addRefreshToken(user.id, refresh);
    res.json({ access, refresh });
  } catch (err) { next(err); }
};

// Refresh token
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });
    const payload = require('jsonwebtoken').verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await mysql.getUserById(payload.id);
    if (!user) return res.status(401).json({ message: 'Invalid token' });
    const tokens = Array.isArray(user.refresh_tokens) ? user.refresh_tokens : [];
    if (!tokens.includes(refreshToken)) return res.status(401).json({ message: 'Invalid token' });
    const access = signAccess({ id: user.id });
    res.json({ access });
  } catch (err) { next(err); }
};

// Logout - remove refresh
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });
    const payload = require('jsonwebtoken').verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    await mysql.removeRefreshToken(payload.id, refreshToken);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// Forgot password - send reset link (mock)
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await mysql.getUserByEmail(email);
    if (!user) return res.status(200).json({ message: 'If email exists, a reset link is sent' });
    const token = crypto.randomBytes(20).toString('hex');
    await mysql.setResetToken(user.id, token, Date.now() + 3600000);
    const resetLink = `${process.env.BASE_URL || 'http://localhost:5000'}/htmls/reset-password.html?token=${token}`;
    await sendMail({ to: email, subject: 'Reset password', text: `Reset your password here: ${resetLink}` });
    res.json({ message: 'Reset email sent' });
  } catch (err) { next(err); }
};

// Reset password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const user = await mysql.findUserByResetToken(token);
    if (!user || !user.reset_expires || Number(user.reset_expires) < Date.now()) return res.status(400).json({ message: 'Invalid or expired token' });
    const hash = await bcrypt.hash(password, 10);
    await mysql.updatePassword(user.id, hash);
    await mysql.updateUserFields(user.id, { reset_token: null, reset_expires: null });
    res.json({ message: 'Password reset' });
  } catch (err) { next(err); }
};

// Send OTP to email (mock)
exports.sendEmailOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await mysql.getUserByEmail(email);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await mysql.setOtp(user.id, otp, Date.now() + 10 * 60 * 1000);
    await sendMail({ to: email, subject: 'Your OTP', text: `OTP: ${otp}` });
    res.json({ message: 'OTP sent' });
  } catch (err) { next(err); }
};

// Verify email otp
exports.verifyEmailOtp = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const user = await mysql.getUserByEmail(email);
    if (!user || !user.otp_code) return res.status(400).json({ message: 'Invalid' });
    if (Date.now() > Number(user.otp_expires)) return res.status(400).json({ message: 'Expired' });
    if (user.otp_code !== code) return res.status(400).json({ message: 'Invalid code' });
    await mysql.updateUserFields(user.id, { is_verified: 1, otp_code: null, otp_expires: null });
    res.json({ message: 'Verified' });
  } catch (err) { next(err); }
};

// Google OAuth verification (basic)
exports.googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    let user = await mysql.getUserByEmail(payload.email);
    if (!user) {
      const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
      await mysql.createUser({ id, name: payload.name, email: payload.email, passwordHash: null, phone: null, isPhoneVerified: false, isVerified: true });
      user = await mysql.getUserById(id);
    }
    const access = signAccess({ id: user.id });
    const refresh = signRefresh({ id: user.id });
    await mysql.addRefreshToken(user.id, refresh);
    res.json({ access, refresh });
  } catch (err) { next(err); }
};

// Send OTP via SMS (mock - logs or integrates via provider in production)
exports.sendSmsOtp = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: 'Not authorized' });
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone required' });
    await mysql.updateUserFields(userId, { phone });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await mysql.setOtp(userId, otp, Date.now() + 10 * 60 * 1000);
    try {
      if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
        const { sendWhatsApp } = require('../utils/whatsapp');
        await sendWhatsApp(phone, `Your StyleCore OTP is ${otp}. It expires in 10 minutes.`);
      } else {
        const { sendSms } = require('../utils/sms');
        await sendSms(phone, `Your StyleCore OTP is ${otp}. It expires in 10 minutes.`);
      }
    } catch (e) {
      console.log('SMS OTP for', phone, '->', otp);
    }
    res.json({ message: 'OTP sent' });
  } catch (err) { next(err); }
};

exports.verifySmsOtp = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: 'Not authorized' });
    const { phone, otp } = req.body;
    const user = await mysql.getUserById(userId);
    if (!user || !user.otp_code) return res.status(400).json({ message: 'Invalid' });
    if (Date.now() > Number(user.otp_expires)) return res.status(400).json({ message: 'Expired' });
    if (user.otp_code !== String(otp)) return res.status(400).json({ message: 'Invalid code' });
    await mysql.updateUserFields(userId, { is_phone_verified: 1, otp_code: null, otp_expires: null, phone: phone || user.phone });
    res.json({ message: 'Verified' });
  } catch (err) { next(err); }
};

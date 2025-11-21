// src/backend/routes/firebaseAuthRoutes.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const path = require('path');
const mysql = require('../utils/mysql'); // existing helper
const { signAccess, signRefresh } = require('../utils/jwt');

// initialize admin once (use service account JSON or env variable)
if (!admin.apps.length) {
  try {
    // prefer GOOGLE_APPLICATION_CREDENTIALS env var, else load local file
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp();
    } else {
      const saPath = path.join(__dirname, '..', 'firebase-service-account.json');
      const serviceAccount = require(saPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  } catch (e) {
    console.error('Failed to init firebase-admin:', e.message);
  }
}

// POST { idToken }
router.post('/firebase-login', async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'idToken required' });

    // verify with Firebase Admin
    const decoded = await admin.auth().verifyIdToken(idToken);
    // decoded contains: uid, email, name, picture, etc.
    const uid = decoded.uid;
    const email = decoded.email || null;
    const name = decoded.name || decoded.firebase?.sign_in_provider || null;

    // Upsert user into your app DB (utils/mysql.upsertUser exists)
    // adapt keys according to your upsertUser signature
    await mysql.upsertUser({
      id: uid,
      name: name || '',
      email: email,
      isVerified: 1,
      isPhoneVerified: 0
    });

    // create your app JWTs using existing utils
    const access = signAccess({ id: uid });
    const refresh = signRefresh({ id: uid });
    // store refresh token in DB
    await mysql.addRefreshToken(uid, refresh);

    // respond with tokens + user info
    res.json({ access, refresh, user: { id: uid, email, name } });
  } catch (err) {
    console.error('firebase-login error', err);
    return res.status(400).json({ message: 'Invalid token', error: err.message });
  }
});

module.exports = router;

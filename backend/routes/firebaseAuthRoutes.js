const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const path = require('path');
const mysql = require('../utils/mysql');
const { signAccess, signRefresh } = require('../utils/jwt');

// initialize firebase admin
if (!admin.apps.length) {
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp(); // uses env path
    } else {
      const saPath = path.join(__dirname, '..', 'firebase-service-account.json');
      const serviceAccount = require(saPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  } catch (err) {
    console.error("Firebase admin init failed:", err.message);
  }
}

// POST /api/auth/firebase-login
router.post('/firebase-login', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: "idToken missing" });
  }

  try {
    // verify token with admin SDK
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email || null;
    const name = decoded.name || decoded.firebase?.sign_in_provider || "User";

    // upsert user into database
    await mysql.upsertUser({
      id: uid,
      name,
      email,
      isVerified: 1,
      isPhoneVerified: 0
    });

    // generate JWT tokens
    const access = signAccess({ id: uid });
    const refresh = signRefresh({ id: uid });

    // save refresh token in DB
    await mysql.addRefreshToken(uid, refresh);

    res.json({
      access,
      refresh,
      user: { id: uid, name, email }
    });

  } catch (err) {
    console.error("Firebase login error:", err);
    res.status(400).json({ message: "Invalid token", error: err.message });
  }
});

module.exports = router;

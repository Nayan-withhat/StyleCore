const fs = require('fs');
const path = require('path');

// If Render (or any host) provides the Firebase service account JSON
// via the FIREBASE_SERVICE_ACCOUNT_JSON environment variable, write
// it to `firebase-service-account.json` so existing code can use it.
const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (envJson) {
  try {
    const dest = path.join(__dirname, 'firebase-service-account.json');
    fs.writeFileSync(dest, envJson, { encoding: 'utf8' });
    console.log('Wrote firebase-service-account.json from env var');
  } catch (e) {
    console.warn('Failed to write firebase service account file:', e.message);
  }
}

// Start the existing server
require('./server');

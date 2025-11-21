
  // Import Firebase
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
  import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider } 
  from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

  // ✅ Your Firebase Config
  const firebaseConfig = {
  apiKey: "AIzaSyASyc4uHoM8LdmAYFDQAl8IaFGe5N0pw2Y",
  authDomain: "coinova-ecbb2.firebaseapp.com",
  projectId: "coinova-ecbb2",
  storageBucket: "coinova-ecbb2.firebasestorage.app",
  messagingSenderId: "795680579953",
  appId: "1:795680579953:web:b78bab5f00398b580996d0",
  measurementId: "G-R2HKCYGR37"
  };

  // ✅ Init Firebase (lazy - only when buttons are clicked)
  let app = null;
  let auth = null;
  let googleProvider = null;
  let appleProvider = null;
  
  async function initFirebase() {
    try {
      if (!app) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        googleProvider = new GoogleAuthProvider();
        appleProvider = new OAuthProvider('apple.com');
      }
      return { app, auth, googleProvider, appleProvider };
    } catch (e) {
      console.error('Firebase init failed:', e);
      throw e;
    }
  }

  async function apiFetch(path, options={}){
    let res = await fetch('/api' + path, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      credentials: 'include',
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const ct = res.headers.get('content-type') || '';
    let data = ct.includes('application/json') ? await res.json() : await res.text();
    
    // Retry with token refresh on 401
    if (res.status === 401 && options.method !== 'POST') {
      const refreshToken = localStorage.getItem('site-refresh-token');
      if (refreshToken) {
        try {
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData.access) {
              localStorage.setItem('site-access-token', refreshData.access);
              // Retry original request with new token
              const newHeaders = { ...options.headers, Authorization: 'Bearer ' + refreshData.access };
              res = await fetch('/api' + path, {
                method: options.method || 'GET',
                headers: { 'Content-Type': 'application/json', ...newHeaders },
                credentials: 'include',
                body: options.body ? JSON.stringify(options.body) : undefined
              });
              data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : await res.text();
            }
          }
        } catch (e) { console.log('Token refresh failed:', e); }
      }
    }
    
    if (!res.ok) {
      // Clear tokens on auth failure
      if (res.status === 401) {
        localStorage.removeItem('site-access-token');
        localStorage.removeItem('site-refresh-token');
        localStorage.removeItem('site-logged-in');
      }
      const msg = (data && data.message) ? data.message : (typeof data === 'string' ? data : 'Request failed');
      throw new Error(msg);
    }
    return data;
  }

  function saveTokens(tokens){
    try {
      if (tokens && tokens.access) localStorage.setItem('site-access-token', tokens.access);
      if (tokens && tokens.refresh) localStorage.setItem('site-refresh-token', tokens.refresh);
      localStorage.setItem('site-logged-in','1');
    } catch(e){}
  }

  function authHeaders(){
    try { const t = localStorage.getItem('site-access-token'); if (t) return { Authorization: 'Bearer ' + t }; } catch(e){}
    return {};
  }

  // ✅ GOOGLE LOGIN
  window.googleLogin = async function () {
    try {
      const fb = await initFirebase();
      try {
        const result = await signInWithPopup(fb.auth, fb.googleProvider);
        const idToken = await result.user.getIdToken();
        // Send to backend to create session tokens
        const tokens = await apiFetch('/auth/google', { method:'POST', body: { idToken }});
        saveTokens(tokens);
        // Fetch profile for name/email
        try {
          const me = await apiFetch('/users/me', { headers: authHeaders() });
          if (me && me.name) localStorage.setItem('site-user-name', me.name);
          if (me && me.email) localStorage.setItem('site-user-email', me.email);
        } catch(e){}
        window.location.href = "/";
      } catch (firebaseError) {
        // Firebase SDK error or API key misconfiguration
        console.error("Firebase SDK Error:", firebaseError);
        if (firebaseError.code === 'auth/configuration-not-found' || firebaseError.message.includes('CONFIGURATION_NOT_FOUND')) {
          alert('Google Login is currently unavailable. Please use email/password login instead.');
        } else {
          alert('Google login failed: ' + (firebaseError.message || firebaseError));
        }
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      alert("Google login failed: " + (error.message || error));
    }
  };

  // ✅ APPLE LOGIN
  window.appleLogin = async function () {
    try {
      const fb = await initFirebase();
      try {
        const result = await signInWithPopup(fb.auth, fb.appleProvider);
        // For now, fallback to client-side session only (no backend session)
        try {
          const name = result.user.displayName || 'User';
          const email = result.user.email || '';
          localStorage.setItem('site-logged-in','1');
          if (name) localStorage.setItem('site-user-name', name);
          if (email) localStorage.setItem('site-user-email', email);
        } catch(e){}
        window.location.href = "/";
      } catch (firebaseError) {
        console.error("Firebase SDK Error:", firebaseError);
        if (firebaseError.code === 'auth/configuration-not-found' || firebaseError.message.includes('CONFIGURATION_NOT_FOUND')) {
          alert('Apple Login is currently unavailable. Please use email/password login instead.');
        } else {
          alert('Apple login failed: ' + (firebaseError.message || firebaseError));
        }
      }
    } catch (error) {
      console.error("Apple Login Error:", error);
      alert("Apple login failed: " + (error.message || error));
    }
  };
    document.getElementsByClassName('apple-btn')[0].addEventListener('click', function() {
    window.appleLogin();
  });
  document.getElementsByClassName('google-btn')[0].addEventListener('click', function() {
    window.googleLogin();
  });


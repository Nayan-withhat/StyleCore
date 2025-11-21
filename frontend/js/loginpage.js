document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const msg = document.getElementById('login-message');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const closeModalBtn = document.getElementById('closeModal');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const forgotPasswordMsg = document.getElementById('forgot-password-message');

    const DEMO_EMAIL = 'demo@stylecore.com';
    const DEMO_PASSWORD = 'password123';

    // Helper: redirect user after login, respecting `next` query param
    function redirectAfterLogin() {
        try {
            const params = new URLSearchParams(window.location.search);
            const next = params.get('next');
            if (next) {
                window.location.href = decodeURIComponent(next);
                return;
            }
        } catch (e) {}
        window.location.href = '/';
    }

    // If already logged in and a `next` param exists, redirect immediately
    try {
        const _params = new URLSearchParams(window.location.search);
        if ((_params.get('next')) && (localStorage.getItem('site-logged-in') === '1' || localStorage.getItem('site-access-token'))) {
            redirectAfterLogin();
        }
    } catch (e) {}

    // Toggle password visibility
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            const icon = togglePasswordBtn.querySelector('i');
            if (icon) {
                if (type === 'text') {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        });
    }

    // Forgot Password modal handlers (guarded)
    if (forgotPasswordLink && forgotPasswordModal) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            forgotPasswordModal.style.display = 'flex';
        });
    }
    if (closeModalBtn && forgotPasswordModal && forgotPasswordForm && forgotPasswordMsg) {
        closeModalBtn.addEventListener('click', () => {
            forgotPasswordModal.style.display = 'none';
            forgotPasswordForm.reset();
            forgotPasswordMsg.textContent = '';
        });

        forgotPasswordModal.addEventListener('click', (e) => {
            if (e.target === forgotPasswordModal) {
                forgotPasswordModal.style.display = 'none';
                forgotPasswordForm.reset();
                forgotPasswordMsg.textContent = '';
            }
        });

        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            forgotPasswordMsg.textContent = 'Sending reset link...';
            forgotPasswordMsg.style.color = '#4CAF50';

            const emailEl = document.getElementById('reset-email');
            const email = emailEl ? emailEl.value.trim() : '';

            if (!email) {
                forgotPasswordMsg.textContent = 'Please enter your email';
                forgotPasswordMsg.style.color = '#ff6b6b';
                return;
            }

            try {
                const response = await fetch('/api/auth/forgot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (response.ok) {
                    forgotPasswordMsg.textContent = 'Reset link sent to your email. Check your inbox.';
                    forgotPasswordMsg.style.color = '#4CAF50';
                    setTimeout(() => {
                        forgotPasswordModal.style.display = 'none';
                        forgotPasswordForm.reset();
                        forgotPasswordMsg.textContent = '';
                    }, 2000);
                } else {
                    forgotPasswordMsg.textContent = data.message || 'Failed to send reset link';
                    forgotPasswordMsg.style.color = '#ff6b6b';
                }
            } catch (err) {
                forgotPasswordMsg.textContent = 'Error: ' + (err && err.message);
                forgotPasswordMsg.style.color = '#ff6b6b';
            }
        });
    }

    // Form submission -> backend login
    if (form && msg) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            msg.textContent = 'Signing in...';
            msg.style.color = '#4CAF50';

            const email = (document.getElementById('email') || {}).value || '';
            const password = (document.getElementById('password') || {}).value || '';

            if (!email || !password) {
                msg.textContent = 'Please enter email and password';
                msg.style.color = '#ff6b6b';
                return;
            }

            try {
                // Call backend login
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) {
                    msg.textContent = data.message || 'Login failed';
                    msg.style.color = '#ff6b6b';
                    return;
                }

                // Save tokens and minimal profile
                try {
                    localStorage.setItem('site-access-token', data.access);
                    localStorage.setItem('site-token', data.access); // legacy key used elsewhere
                    localStorage.setItem('site-refresh-token', data.refresh);
                    localStorage.setItem('site-logged-in', '1');
                    localStorage.setItem('site-user-email', email);
                } catch(e){}
                msg.textContent = 'Logged in successfully. Redirecting...';
                msg.style.color = '#4CAF50';
                setTimeout(() => { redirectAfterLogin(); }, 700);
            } catch (err) {
                msg.textContent = 'Login failed: ' + (err && err.message);
                msg.style.color = '#ff6b6b';
            }
        });
    }

    // Firebase + social login setup (if firebase scripts are present)
    const googleBtn = document.getElementById('googleBtn');
    const appleBtn = document.getElementById('appleBtn');
    const signOutBtn = document.getElementById('signOutBtn');

    try {
        const firebaseConfig = {
            apiKey: "AIzaSyASyc4uHoM8LdmAYFDQAl8IaFGe5N0pw2Y",
            authDomain: "coinova-ecbb2.firebaseapp.com",
            projectId: "coinova-ecbb2",
            storageBucket: "coinova-ecbb2.firebasestorage.app",
            messagingSenderId: "795680579953",
            appId: "1:795680579953:web:b78bab5f00398b580996d0",
            measurementId: "G-R2HKCYGR37"
        };

        if (typeof firebase !== 'undefined' && firebase && !firebase.apps?.length) {
            firebase.initializeApp(firebaseConfig);
        }

        const auth = (typeof firebase !== 'undefined' && firebase) ? firebase.auth() : null;

        if (auth) {
            auth.onAuthStateChanged(user => {
                if (user) {
                    if (signOutBtn) signOutBtn.style.display = 'inline-block';
                    if (googleBtn) googleBtn.style.display = 'none';
                    if (appleBtn) appleBtn.style.display = 'none';
                } else {
                    if (signOutBtn) signOutBtn.style.display = 'none';
                    if (googleBtn) googleBtn.style.display = 'inline-block';
                    if (appleBtn) appleBtn.style.display = 'inline-block';
                }
            });
        }

        async function sendTokenToBackend(idToken) {
            try {
                const res = await fetch('/api/auth/firebase-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken })
                });
                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error('Backend error: ' + res.status + ' ' + txt);
                }
                const data = await res.json();
                try { localStorage.setItem('site-access-token', data.access); localStorage.setItem('site-token', data.access); localStorage.setItem('site-refresh-token', data.refresh); localStorage.setItem('site-logged-in', '1'); } catch(e){}
                // After storing tokens, redirect if needed
                try { redirectAfterLogin(); } catch(e) {}
            } catch (err) {
                console.error('sendTokenToBackend error', err);
            }
        }

        async function googleLogin() {
            if (!auth) return;
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                const result = await auth.signInWithPopup(provider);
                const user = result.user;
                const idToken = await user.getIdToken();
                await sendTokenToBackend(idToken);
            } catch (err) {
                console.error('Google login error', err);
            }
        }

        async function appleLogin() {
            if (!auth) return;
            try {
                const provider = new firebase.auth.OAuthProvider('apple.com');
                provider.addScope('email');
                provider.addScope('name');
                const result = await auth.signInWithPopup(provider);
                const user = result.user;
                const idToken = await user.getIdToken();
                await sendTokenToBackend(idToken);
            } catch (err) {
                console.error('Apple login error', err);
            }
        }

        async function signOut() {
            if (!auth) return;
            await auth.signOut();
            try { localStorage.removeItem('site-access-token'); localStorage.removeItem('site-refresh-token'); localStorage.removeItem('site-logged-in'); localStorage.removeItem('site-user-email'); localStorage.removeItem('site-user-name'); } catch(e){}
        }

        if (googleBtn) googleBtn.addEventListener('click', googleLogin);
        if (appleBtn) appleBtn.addEventListener('click', appleLogin);
        if (signOutBtn) signOutBtn.addEventListener('click', signOut);

    } catch (err) {
        console.warn('Firebase not available or init failed', err);
    }
});

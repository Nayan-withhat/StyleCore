// register.js - handles registration form submission and redirects to verify
(function(){
	// Simple API helper with token refresh on 401
	async function apiFetch(path, options={}){
		// If the frontend is served from Live Server (port 5500) or file://, send API calls to backend at localhost:5000
		const isDevServer = (location.hostname === '127.0.0.1' || location.hostname === 'localhost') && (location.port === '5500' || location.protocol === 'file:');
		const base = isDevServer ? 'http://localhost:5000' : '';
		let res = await fetch((base || '') + '/api' + path, {
			method: options.method || 'GET',
			headers: { 'Content-Type': 'application/json', ...(options.headers||{}) },
			credentials: 'include',
			body: options.body ? JSON.stringify(options.body) : undefined
		});
		const ct = res.headers.get('content-type') || '';
		let data;
		if (ct.includes('application/json')) {
			try {
				data = await res.json();
			} catch (e) {
				// invalid JSON — fallback to text for error reporting
				data = await res.text();
			}
		} else {
			data = await res.text();
		}
		
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
		
		if(!res.ok){
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
		try{
			if(tokens && tokens.access) localStorage.setItem('site-access-token', tokens.access);
			if(tokens && tokens.refresh) localStorage.setItem('site-refresh-token', tokens.refresh);
		}catch(e){}
	}

	document.addEventListener('DOMContentLoaded', () => {
		const submitBtn = document.querySelector('.email-login .submit');
		const msg = document.getElementById('register-message');
		const passwordInput = document.getElementById('password');
		const confirmInput = document.getElementById('confirm-password');
		const passwordHint = document.getElementById('password-hint');
		const confirmHint = document.getElementById('confirm-hint');
		const emailInput = document.getElementById('email');
		const phoneInput = document.getElementById('phone');
		const emailHint = document.getElementById('email-hint');
		const phoneHint = document.getElementById('phone-hint');

		// password requirement: lowercase, uppercase, digit, symbol
		function validatePassword(p){
			const checks = {
				lower: /[a-z]/.test(p),
				upper: /[A-Z]/.test(p),
				digit: /[0-9]/.test(p),
				symbol: /[^A-Za-z0-9]/.test(p),
				length: p.length >= 8
			};
			const ok = checks.lower && checks.upper && checks.digit && checks.symbol && checks.length;
			return { ok, checks };
		}

		function validateNumber(n){
			const checks = {
				length: n.length === 10,
				digits: /^\d{10}$/.test(n)
			};
			const ok = checks.length && checks.digits;
			return { ok, checks };
		}

		function renderPasswordHint(){
			if(!passwordHint || !passwordInput) return;
			const val = passwordInput.value || '';
			const r = validatePassword(val);
			if(val.length === 0){ passwordHint.textContent = 'Password must include a-z, A-Z, 0-9, and a symbol.'; passwordHint.style.color = '#888'; return; }
			const missing = [];
			if(!r.checks.lower) missing.push('a lowercase (a-z)');
			if(!r.checks.upper) missing.push('an uppercase (A-Z)');
			if(!r.checks.digit) missing.push('a digit (0-9)');
			if(!r.checks.symbol) missing.push('a symbol (e.g. !@#$)');
			if(!r.checks.length) missing.push('min 6 chars');
			if(r.ok){ passwordHint.textContent = ''; passwordHint.style.color = '#4CAF50'; }
			else { passwordHint.textContent = 'Add: ' + missing.join(', '); passwordHint.style.color = '#ff6b6b'; }
		}

		function renderConfirmHint(){
			if(!confirmHint || !confirmInput) return;
			const a = (passwordInput && passwordInput.value) || '';
			const b = confirmInput.value || '';
			if(b.length === 0){ confirmHint.textContent = ''; return; }
			if(a === b){ confirmHint.textContent = 'Passwords match'; confirmHint.style.color = '#4CAF50'; }
			else { confirmHint.textContent = 'Passwords do not match'; confirmHint.style.color = '#ff6b6b'; }
		}

		// Email and phone rendering
		function validateEmail(v){
			if(!v) return false;
			const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			return re.test(String(v).toLowerCase());
		}

		function renderEmailHint(){
			if(!emailHint || !emailInput) return;
			const v = (emailInput.value || '').trim();
			if(!v){ emailHint.textContent = 'Enter your email address'; emailHint.style.color = '#888'; return; }
			if(validateEmail(v)){ emailHint.textContent = ''; emailHint.style.color = '#4CAF50'; }
			else { emailHint.textContent = 'Enter a valid email (name@example.com)'; emailHint.style.color = '#ff6b6b'; }
		}

		function renderPhoneHint(){
			if(!phoneHint || !phoneInput) return;
			const v = (phoneInput.value || '').trim();
			if(!v){ phoneHint.textContent = 'Enter your 10-digit phone number'; phoneHint.style.color = '#888'; return; }
			const digits = v.replace(/\D/g,'');
			if(/^\d{10}$/.test(digits)){ phoneHint.textContent = ''; phoneHint.style.color = '#4CAF50'; }
			else { phoneHint.textContent = 'Enter a valid 10-digit number'; phoneHint.style.color = '#ff6b6b'; }
		}

		if(passwordInput){ passwordInput.addEventListener('input', ()=>{ renderPasswordHint(); renderConfirmHint(); }); renderPasswordHint(); }
		if(confirmInput){ confirmInput.addEventListener('input', renderConfirmHint); }
		if(emailInput){ emailInput.addEventListener('input', renderEmailHint); renderEmailHint(); }
		if(phoneInput){ phoneInput.addEventListener('input', renderPhoneHint); renderPhoneHint(); }
		if(!submitBtn) return;

		submitBtn.addEventListener('click', async (e)=>{
			e.preventDefault();
			if (msg) msg.textContent = 'Creating account...';
			const name = (document.getElementById('name') || {}).value?.trim() || '';
			const phone = (document.getElementById('phone') || {}).value?.trim() || '';
			const email = (document.getElementById('email') || {}).value?.trim() || '';
			const password = (document.getElementById('password') || {}).value || '';

			// validate on submit
			const vp = validatePassword(password);
			if(!vp.ok){
				if (msg) msg.textContent = 'Password does not meet requirements';
				if (passwordHint) { renderPasswordHint(); }
				return;
			}
			const confirm = (document.getElementById('confirm-password') || {}).value || '';
			if(password !== confirm){ if (msg) msg.textContent = 'Passwords do not match'; if (confirmHint) renderConfirmHint(); return; }

			try{
				await apiFetch('/auth/register',{ method:'POST', body:{ name, phone, email, password }});
				// auto-login
				try{
					const tokens = await apiFetch('/auth/login',{ method:'POST', body:{ email, password }});
					saveTokens(tokens);
				}catch(e){}
				// persist minimal profile for greeting
				try {
					localStorage.setItem('site-logged-in','1');
					if (name) localStorage.setItem('site-user-name', name);
					if (email) localStorage.setItem('site-user-email', email);
					if (phone) localStorage.setItem('site-user-phone', phone);
				} catch(e){}
				if (msg) msg.textContent = 'Account created. Redirecting...';
				// Skip verification for now; go directly to address
				window.location.href = '/htmls/address.html';
			}catch(err){
				console.error('register error', err);
				const em = (err && err.message) ? err.message : String(err);
				const low = em.toLowerCase();
				if (low.includes('failed to fetch') || low.includes('network') || low.includes('refused') || low.includes('connect')) {
					if (msg) msg.textContent = 'Cannot reach auth server at http://localhost:5000 — saving account locally so you can continue. Start backend to persist users:\ncd "d:\\website making\\src\\backend"; npm install; npm start';
					// Local fallback: store user in localStorage so the frontend flow can continue while backend is down.
					try{
						const raw = localStorage.getItem('local-users') || '[]';
						const users = JSON.parse(raw);
						const id = 'local-' + Date.now();
						const newUser = { id, name, email, phone, password, createdAt: new Date().toISOString(), local: true };
						users.push(newUser);
						localStorage.setItem('local-users', JSON.stringify(users));
						// set minimal logged-in state and pseudo-tokens so other pages work
						const pseudoTokens = { access: 'local-access-' + id, refresh: 'local-refresh-' + id };
						saveTokens(pseudoTokens);
						localStorage.setItem('site-logged-in','1');
						if (name) localStorage.setItem('site-user-name', name);
						if (email) localStorage.setItem('site-user-email', email);
						if (phone) localStorage.setItem('site-user-phone', phone);
						// Redirect to address page
						setTimeout(()=> window.location.href = '/htmls/address.html', 700);
						return;
					} catch(e){
						console.error('local fallback failed', e);
					}
				} else {
					if (msg) msg.textContent = 'Registration failed: ' + em;
				}
			}
		});
	});
})();



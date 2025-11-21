// address.js - pincode autofill and address save
(function(){
	async function apiFetch(path, options={}){
		options = options || {};
		// helper to perform fetch with current options
		const doRequest = async (opts) => {
			const res = await fetch('/api' + path, {
				method: opts.method || 'GET',
				headers: { 'Content-Type': 'application/json', ...(opts.headers||{}) },
				credentials: 'include',
				body: opts.body ? JSON.stringify(opts.body) : undefined
			});
			return res;
		};

		// perform initial request
		let res = await doRequest(options);

		// if unauthorized, try refresh flow once
		if (res.status === 401) {
			try {
				const refreshToken = (function(){ try { return localStorage.getItem('site-refresh-token'); } catch(e){ return null; } })();
				if (!refreshToken) throw new Error('No refresh token');
				const r = await fetch('/api/auth/refresh', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ refreshToken })
				});
				if (!r.ok) throw new Error('Refresh failed');
				const tokens = await r.json();
				if (tokens && tokens.access) {
					try { localStorage.setItem('site-access-token', tokens.access); } catch(e){}
					// retry original request with new access token
					options.headers = options.headers || {};
					options.headers.Authorization = 'Bearer ' + tokens.access;
					res = await doRequest(options);
				} else {
					throw new Error('No access token after refresh');
				}
			} catch (err) {
				// on refresh failure, clear tokens and redirect to login
				try { localStorage.removeItem('site-access-token'); localStorage.removeItem('site-refresh-token'); } catch(e){}
				window.location.href = '/loginpage.html';
				throw new Error('Not authorized');
			}
		}

		const ct = res.headers.get('content-type') || '';
		const data = ct.includes('application/json') ? await res.json() : await res.text();
		if(!res.ok){
			const msg = (data && data.message) ? data.message : (typeof data === 'string' ? data : 'Request failed');
			throw new Error(msg);
		}
		return data;
	}

	function authHeaders(){
		try { const t = localStorage.getItem('site-access-token'); if (t) return { Authorization: 'Bearer ' + t }; } catch(e){}
		return {};
	}

	document.addEventListener('DOMContentLoaded', () => {
		const form = document.getElementById('address-form');
		const msg = document.getElementById('address-message');
		const pinInput = document.getElementById('pincode');
		const stateInput = document.getElementById('state');
		const districtInput = document.getElementById('district');
		const cityInput = document.getElementById('city');
		const nameInput = document.getElementById('fullName');
		const phoneInput = document.getElementById('phone');

		// Prefill name/phone from storage
		try {
			const n = localStorage.getItem('site-user-name'); if (n && nameInput) nameInput.value = n;
			const ph = localStorage.getItem('site-user-phone'); if (ph && phoneInput) phoneInput.value = ph;
		} catch(e){}

		// Autofill from pincode via backend proxy when length == 6 numeric
		if (pinInput) {
			pinInput.addEventListener('input', async ()=>{
				const p = (pinInput.value || '').trim();
				if (p.length === 6 && /^\d{6}$/.test(p)) {
					if (msg) msg.textContent = 'Fetching pincode info...';
					try{
						const data = await apiFetch('/public/pincode/' + p);
						if (data) {
							if (stateInput && data.state) stateInput.value = data.state;
							if (districtInput && data.district) districtInput.value = data.district;
							if (cityInput) {
								if (data.city) cityInput.value = data.city;
								else if (Array.isArray(data.offices) && data.offices.length > 0) {
									cityInput.value = data.offices[0].Name || '';
								}
							}
						}
						if (msg) msg.textContent = '';
					}catch(err){
						if (msg) msg.textContent = 'Pincode lookup failed: ' + err.message;
					}
				}
			});
		}

		// Save address
		if (form) {
			form.addEventListener('submit', async (e)=>{
				e.preventDefault();
				if (msg) msg.textContent = 'Saving address...';
				const payload = {
					fullName: nameInput ? (nameInput.value || '').trim() : '',
					phone: phoneInput ? (phoneInput.value || '').trim() : '',
					pincode: pinInput ? (pinInput.value || '').trim() : '',
					state: stateInput ? (stateInput.value || '').trim() : '',
					district: districtInput ? (districtInput.value || '').trim() : '',
					city: cityInput ? (cityInput.value || '').trim() : '',
					address1: (document.getElementById('address1') || {}).value?.trim() || '',
					landmark: (document.getElementById('landmark') || {}).value?.trim() || ''
				};
				try{
					await apiFetch('/users/me/address',{ method:'POST', headers: authHeaders(), body: payload });
					if (msg) msg.textContent = 'Address saved. Redirecting to home...';
					window.location.href = '/';
				}catch(err){
					if (msg) msg.textContent = 'Save failed: ' + err.message;
				}
			});
		}
	});
})();



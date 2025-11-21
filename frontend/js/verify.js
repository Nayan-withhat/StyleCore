// verify.js - handles sending and verifying SMS OTP, and prefills phone
(function(){
	async function apiFetch(path, options={}){
		const res = await fetch('/api' + path, {
			method: options.method || 'GET',
			headers: { 'Content-Type': 'application/json', ...(options.headers||{}) },
			credentials: 'include',
			body: options.body ? JSON.stringify(options.body) : undefined
		});
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
		const phoneInput = document.getElementById('phone');
		const sendForm = document.getElementById('send-otp-form');
		const verifyForm = document.getElementById('verify-otp-form');
		const msg = document.getElementById('verify-message');

		// Prefill phone from localStorage if available
		try {
			const storedPhone = localStorage.getItem('site-user-phone');
			if (storedPhone && phoneInput) phoneInput.value = storedPhone;
		} catch(e){}

		if (sendForm) {
			sendForm.addEventListener('submit', async (e)=>{
				e.preventDefault();
				const phone = (phoneInput && phoneInput.value || '').trim();
				if (msg) msg.textContent = 'Sending OTP...';
				try{
					await apiFetch('/auth/otp/sms/send',{ method:'POST', headers: authHeaders(), body:{ phone }});
					if (msg) msg.textContent = 'OTP sent. Please check your SMS.';
					if (verifyForm) verifyForm.style.display = 'block';
					try { localStorage.setItem('site-user-phone', phone); } catch(e){}
				}catch(err){
					if (msg) msg.textContent = 'Failed to send OTP: ' + err.message;
				}
			});
		}

		if (verifyForm) {
			verifyForm.addEventListener('submit', async (e)=>{
				e.preventDefault();
				const phone = (phoneInput && phoneInput.value || '').trim();
				const otpInput = document.getElementById('otp');
				const otp = (otpInput && otpInput.value || '').trim();
				if (msg) msg.textContent = 'Verifying...';
				try{
					await apiFetch('/auth/otp/sms/verify',{ method:'POST', headers: authHeaders(), body:{ phone, otp }});
					try { localStorage.setItem('site-user-phone', phone); } catch(e){}
					if (msg) msg.textContent = 'Verified. Redirecting to address...';
					window.location.href = '/htmls/address.html';
				}catch(err){
					if (msg) msg.textContent = 'Verification failed: ' + err.message;
				}
			});
		}
	});
})();



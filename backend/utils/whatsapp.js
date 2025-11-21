// WhatsApp sender via Meta WhatsApp Cloud API
// Requires: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
const https = require('https');

function postJson(hostname, path, data, headers = {}) {
	return new Promise((resolve, reject) => {
		const req = https.request({
			method: 'POST',
			hostname,
			path,
			headers: {
				'Content-Type': 'application/json',
				...headers
			}
		}, (res) => {
			let body = '';
			res.on('data', (chunk) => { body += chunk; });
			res.on('end', () => {
				const ct = res.headers['content-type'] || '';
				let json = body;
				try { if (ct.includes('application/json')) json = JSON.parse(body); } catch(e) {}
				if (res.statusCode >= 200 && res.statusCode < 300) return resolve(json);
				return reject(new Error((json && json.error && json.error.message) || `HTTP ${res.statusCode}`));
			});
		});
		req.on('error', reject);
		req.write(JSON.stringify(data));
		req.end();
	});
}

/**
 * Send a WhatsApp text message using Meta WhatsApp Cloud API
 * @param {string} to E.164 number without plus for WA (e.g., 91XXXXXXXXXX)
 * @param {string} body message text
 */
exports.sendWhatsApp = async function sendWhatsApp(to, body) {
	const token = process.env.WHATSAPP_TOKEN;
	const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
	if (!token || !phoneId) {
		throw new Error('WhatsApp not configured');
	}
	// Meta Graph host and version can change; default to v19.0
	const path = `/v19.0/${encodeURIComponent(phoneId)}/messages`;
	const payload = {
		messaging_product: 'whatsapp',
		to: to.replace(/^\+/, ''), // WA expects country code without '+'
		type: 'text',
		text: { body }
	};
	return await postJson('graph.facebook.com', path, payload, {
		Authorization: `Bearer ${token}`
	});
};



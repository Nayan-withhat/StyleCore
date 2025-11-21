// Lightweight SMS sender. Uses Twilio if env vars are present; otherwise logs to console.
let twilioClient = null;

function getTwilio() {
	if (twilioClient) return twilioClient;
	const sid = process.env.TWILIO_ACCOUNT_SID;
	const token = process.env.TWILIO_AUTH_TOKEN;
	if (sid && token) {
		// Lazy require to avoid dependency if not used
		// eslint-disable-next-line global-require
		const twilio = require('twilio');
		twilioClient = twilio(sid, token);
	}
	return twilioClient;
}

/**
 * Send an SMS message.
 * If TWILIO_* env vars are missing, logs the message to the console instead.
 * @param {string} to E.164 number e.g. +91XXXXXXXXXX
 * @param {string} body SMS body text
 */
exports.sendSms = async function sendSms(to, body) {
	const client = getTwilio();
	if (!client) {
		console.log('[DEV SMS] ->', to, body);
		return { sid: 'dev-log', to, body };
	}
	const from = process.env.TWILIO_FROM_NUMBER;
	if (!from) {
		console.log('[DEV SMS missing FROM] ->', to, body);
		return { sid: 'dev-log-no-from', to, body };
	}
	const msg = await client.messages.create({ from, to, body });
	return msg;
};



// MySQL integration (optional). Mirrors users and addresses into MySQL.
// Requires env: MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT(optional)
const fs = require('fs');
const path = require('path');

let mysql = null;
try { mysql = require('mysql2/promise'); } catch (e) { mysql = null; }

let pool = null;

async function getPool() {
	if (pool) return pool;
	const {
		MYSQL_HOST,
		MYSQL_USER,
		MYSQL_PASSWORD,
		MYSQL_DATABASE,
		MYSQL_PORT
	} = process.env;

	// Prefer MySQL when env is provided and mysql2 is available
	if (mysql && MYSQL_HOST && MYSQL_USER && MYSQL_DATABASE) {
		pool = await mysql.createPool({
			host: MYSQL_HOST,
			user: MYSQL_USER,
			password: MYSQL_PASSWORD || '',
			database: MYSQL_DATABASE,
			port: MYSQL_PORT ? Number(MYSQL_PORT) : 3306,
			namedPlaceholders: true,
			waitForConnections: true,
			connectionLimit: 10,
			queueLimit: 0
		});
		pool.__sqlite = false;
		return pool;
	}

	// Fallback: try lazy-require better-sqlite3 (do not require at top-level)
	let sqlite3 = null;
	try {
		// This may throw if module not installed or binary incompatible
		sqlite3 = require('better-sqlite3');
	} catch (err) {
		sqlite3 = null;
	}

	if (sqlite3) {
		const dataDir = path.join(__dirname, '..', 'data');
		if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
		const dbPath = path.join(dataDir, 'stylecore.sqlite');
		let db;
		try {
			db = new sqlite3(dbPath);
		} catch (err) {
			// If native binary fails to load (invalid ELF or similar), bail out gracefully
			console.warn('better-sqlite3 failed to initialize:', err.message);
			return null;
		}

		// simple wrapper to mimic mysql2 promise interface: execute(sql, params)
		pool = {
			__sqlite: true,
			_execute_internal: db,
			execute: async (sql, params) => {
				params = params || [];
				const stmt = db.prepare(sql);
				const trimmed = sql.trim().toUpperCase();
				try {
					if (trimmed.startsWith('SELECT')) {
						const rows = Array.isArray(params) && params.length ? stmt.all(...(Array.isArray(params) ? [params] : [params])) : stmt.all(params);
						// return [rows] to mirror mysql2
						return [rows];
					} else {
						const info = stmt.run(params);
						return [{ info }];
					}
				} catch (err) {
					// try running without params as fallback
					try {
						if (trimmed.startsWith('SELECT')) return [stmt.all()];
						return [{ info: stmt.run() }];
					} catch (e) {
						throw err;
					}
				}
			},
			get: async (sql, params) => {
				const stmt = db.prepare(sql);
				return stmt.get(params || []);
			},
			close: () => db.close()
		};
		return pool;
	}

	// No DB available
	return null;
}

exports.ensureSchema = async function ensureSchema() {
	const p = await getPool();
	if (!p) return;

	if (!p.__sqlite) {
		// MySQL schema
		await p.execute(`
			CREATE TABLE IF NOT EXISTS users (
				id VARCHAR(64) PRIMARY KEY,
				name VARCHAR(255),
				email VARCHAR(255) UNIQUE,
				password VARCHAR(255),
				phone VARCHAR(32),
				is_phone_verified TINYINT(1) DEFAULT 0,
				is_verified TINYINT(1) DEFAULT 0,
				refresh_tokens JSON DEFAULT (JSON_ARRAY()),
				wishlist JSON DEFAULT (JSON_ARRAY()),
				reset_token VARCHAR(255) DEFAULT NULL,
				reset_expires BIGINT DEFAULT NULL,
				otp_code VARCHAR(32) DEFAULT NULL,
				otp_expires BIGINT DEFAULT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
		`);
		await p.execute(`
			CREATE TABLE IF NOT EXISTS addresses (
				id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				user_id VARCHAR(64),
				full_name VARCHAR(255),
				phone VARCHAR(32),
				pincode VARCHAR(16),
				state VARCHAR(128),
				district VARCHAR(128),
				city VARCHAR(128),
				address1 VARCHAR(512),
				landmark VARCHAR(255),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				INDEX idx_user_id (user_id),
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
		`);
		// products, cart_items, orders ... same as before
		// (kept identical to your original schema)
		// --- Products table (basic schema)
		await p.execute(`
			CREATE TABLE IF NOT EXISTS products (
				id VARCHAR(64) PRIMARY KEY,
				title VARCHAR(255) NOT NULL,
				description TEXT,
				price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
				compare_at_price DECIMAL(12,2) DEFAULT NULL,
				category VARCHAR(255),
				images JSON DEFAULT NULL,
				sku VARCHAR(128),
				stock INT DEFAULT 0,
				is_active TINYINT(1) DEFAULT 1,
				attributes JSON DEFAULT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				INDEX idx_category (category)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
		`);
		await p.execute(`
			CREATE TABLE IF NOT EXISTS cart_items (
				id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				user_id VARCHAR(64),
				product_id VARCHAR(64),
				quantity INT DEFAULT 1,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				INDEX idx_user_id (user_id),
				UNIQUE KEY unique_user_product (user_id, product_id),
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
				FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
		`);
		await p.execute(`
			CREATE TABLE IF NOT EXISTS orders (
				id VARCHAR(64) PRIMARY KEY,
				user_id VARCHAR(64),
				items JSON DEFAULT NULL,
				total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
				shipping_address JSON DEFAULT NULL,
				payment_method VARCHAR(64),
				payment_transaction_id VARCHAR(255),
				payment_status VARCHAR(64),
				status VARCHAR(64) DEFAULT 'Pending',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				INDEX idx_user_id (user_id),
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
		`);
	} else {
		// SQLite schema (file-based, free)
		await p.execute(`PRAGMA foreign_keys = ON;`);
		await p.execute(`
			CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				name TEXT,
				email TEXT UNIQUE,
				password TEXT,
				phone TEXT,
				is_phone_verified INTEGER DEFAULT 0,
				is_verified INTEGER DEFAULT 0,
				refresh_tokens TEXT DEFAULT '[]',
				wishlist TEXT DEFAULT '[]',
				reset_token TEXT DEFAULT NULL,
				reset_expires INTEGER DEFAULT NULL,
				otp_code TEXT DEFAULT NULL,
				otp_expires INTEGER DEFAULT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);
		`);
		await p.execute(`
			CREATE TABLE IF NOT EXISTS addresses (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id TEXT,
				full_name TEXT,
				phone TEXT,
				pincode TEXT,
				state TEXT,
				district TEXT,
				city TEXT,
				address1 TEXT,
				landmark TEXT,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
			);
		`);
		await p.execute(`
			CREATE TABLE IF NOT EXISTS products (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				description TEXT,
				price REAL NOT NULL DEFAULT 0,
				compare_at_price REAL DEFAULT NULL,
				category TEXT,
				images TEXT DEFAULT NULL,
				sku TEXT,
				stock INTEGER DEFAULT 0,
				is_active INTEGER DEFAULT 1,
				attributes TEXT DEFAULT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);
		`);
		await p.execute(`CREATE INDEX IF NOT EXISTS idx_category ON products(category);`);
		await p.execute(`
			CREATE TABLE IF NOT EXISTS cart_items (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id TEXT,
				product_id TEXT,
				quantity INTEGER DEFAULT 1,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(user_id, product_id),
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
				FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
			);
		`);
		await p.execute(`
			CREATE TABLE IF NOT EXISTS orders (
				id TEXT PRIMARY KEY,
				user_id TEXT,
				items TEXT DEFAULT NULL,
				total REAL NOT NULL DEFAULT 0,
				shipping_address TEXT DEFAULT NULL,
				payment_method TEXT,
				payment_transaction_id TEXT,
				payment_status TEXT,
				status TEXT DEFAULT 'Pending',
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
			);
		`);
		await p.execute(`CREATE INDEX IF NOT EXISTS idx_order_user ON orders(user_id);`);
	}
};

exports.upsertUser = async function upsertUser({ id, name, email, phone, isPhoneVerified }) {
	const p = await getPool();
	if (!p) return;
	if (!p.__sqlite) {
		await p.execute(`
			INSERT INTO users (id, name, email, phone, is_phone_verified)
			VALUES (:id, :name, :email, :phone, :isPhoneVerified)
			ON DUPLICATE KEY UPDATE
				name = VALUES(name),
				phone = VALUES(phone),
				is_phone_verified = VALUES(is_phone_verified)
		`, { id, name: name || null, email, phone: phone || null, isPhoneVerified: isPhoneVerified ? 1 : 0 });
	} else {
		await p.execute(
			`INSERT INTO users (id, name, email, phone, is_phone_verified)
			 VALUES (?, ?, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET
			   name = excluded.name,
			   phone = excluded.phone,
			   is_phone_verified = excluded.is_phone_verified;`,
			[id, name || null, email, phone || null, isPhoneVerified ? 1 : 0]
		);
	}
};

// ... rest of exports unchanged (keep your existing helper functions)
exports.insertAddress = async function insertAddress(userId, address) {
	const p = await getPool();
	if (!p) return;
	const payload = {
		userId,
		fullName: address.fullName || address.name || null,
		phone: address.phone || null,
		pincode: address.pincode || address.postalCode || null,
		state: address.state || null,
		district: address.district || null,
		city: address.city || null,
		address1: address.address1 || address.street || null,
		landmark: address.landmark || null
	};
	if (!p.__sqlite) {
		await p.execute(`
			INSERT INTO addresses (user_id, full_name, phone, pincode, state, district, city, address1, landmark)
			VALUES (:userId, :fullName, :phone, :pincode, :state, :district, :city, :address1, :landmark)
		`, payload);
	} else {
		await p.execute(
			`INSERT INTO addresses (user_id, full_name, phone, pincode, state, district, city, address1, landmark)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[payload.userId, payload.fullName, payload.phone, payload.pincode, payload.state, payload.district, payload.city, payload.address1, payload.landmark]
		);
	}
};

// -- User helpers for auth
function safeParseTokens(val, isSqlite) {
	if (!val) return [];
	try {
		if (isSqlite) return JSON.parse(val);
		if (typeof val === 'string') return JSON.parse(val);
		return val;
	} catch (e) { return []; }
}

exports.createUser = async function createUser({ id, name, email, passwordHash, phone, isPhoneVerified, isVerified }) {
	const p = await getPool(); if (!p) return null;
	if (!p.__sqlite) {
		await p.execute(`
			INSERT INTO users (id, name, email, password, phone, is_phone_verified, is_verified, refresh_tokens)
			VALUES (:id, :name, :email, :password, :phone, :isPhoneVerified, :isVerified, JSON_ARRAY())
		`, { id, name: name || null, email, password: passwordHash || null, phone: phone || null, isPhoneVerified: isPhoneVerified ? 1 : 0, isVerified: isVerified ? 1 : 0 });
	} else {
		await p.execute(`INSERT INTO users (id, name, email, password, phone, is_phone_verified, is_verified, refresh_tokens) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[id, name || null, email, passwordHash || null, phone || null, isPhoneVerified ? 1 : 0, isVerified ? 1 : 0, '[]']);
	}
};

exports.getUserByEmail = async function getUserByEmail(email) {
	const p = await getPool(); if (!p) return null;
	if (!p.__sqlite) {
		const [rows] = await p.execute(`SELECT * FROM users WHERE email = :email LIMIT 1`, { email });
		const user = rows && rows[0];
		if (!user) return null;
		user.refresh_tokens = safeParseTokens(user.refresh_tokens, false);
		return user;
	} else {
		const rows = await p.execute(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
		const user = rows && rows[0] && rows[0][0];
		if (!user) return null;
		user.refresh_tokens = safeParseTokens(user.refresh_tokens, true);
		return user;
	}
};

exports.getUserById = async function getUserById(id) {
	const p = await getPool(); if (!p) return null;
	if (!p.__sqlite) {
		const [rows] = await p.execute(`SELECT * FROM users WHERE id = :id LIMIT 1`, { id });
		const user = rows && rows[0];
		if (!user) return null;
		user.refresh_tokens = safeParseTokens(user.refresh_tokens, false);
		return user;
	} else {
		const rows = await p.execute(`SELECT * FROM users WHERE id = ? LIMIT 1`, [id]);
		const user = rows && rows[0] && rows[0][0];
		if (!user) return null;
		user.refresh_tokens = safeParseTokens(user.refresh_tokens, true);
		return user;
	}
};

exports.addRefreshToken = async function addRefreshToken(userId, token) {
	const p = await getPool(); if (!p) return;
	const user = await exports.getUserById(userId);
	if (!user) return;
	const tokens = Array.isArray(user.refresh_tokens) ? user.refresh_tokens : [];
	tokens.push(token);
	const serialized = JSON.stringify(tokens);
	if (!p.__sqlite) {
		await p.execute(`UPDATE users SET refresh_tokens = CAST(:tokens AS JSON) WHERE id = :id`, { tokens: serialized, id: userId });
	} else {
		await p.execute(`UPDATE users SET refresh_tokens = ? WHERE id = ?`, [serialized, userId]);
	}
};

exports.removeRefreshToken = async function removeRefreshToken(userId, token) {
	const p = await getPool(); if (!p) return;
	const user = await exports.getUserById(userId);
	if (!user) return;
	const tokens = Array.isArray(user.refresh_tokens) ? user.refresh_tokens.filter(t => t !== token) : [];
	const serialized = JSON.stringify(tokens);
	if (!p.__sqlite) {
		await p.execute(`UPDATE users SET refresh_tokens = CAST(:tokens AS JSON) WHERE id = :id`, { tokens: serialized, id: userId });
	} else {
		await p.execute(`UPDATE users SET refresh_tokens = ? WHERE id = ?`, [serialized, userId]);
	}
};

exports.setResetToken = async function setResetToken(userId, token, expiresAt) {
	const p = await getPool(); if (!p) return;
	if (!p.__sqlite) {
		await p.execute(`UPDATE users SET reset_token = :token, reset_expires = :expires WHERE id = :id`, { token, expires: expiresAt, id: userId });
	} else {
		await p.execute(`UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?`, [token, expiresAt, userId]);
	}
};

exports.findUserByResetToken = async function findUserByResetToken(token) {
	const p = await getPool(); if (!p) return null;
	if (!p.__sqlite) {
		const [rows] = await p.execute(`SELECT * FROM users WHERE reset_token = :token LIMIT 1`, { token });
		const user = rows && rows[0];
		if (!user) return null;
		user.refresh_tokens = safeParseTokens(user.refresh_tokens, false);
		return user;
	} else {
		const rows = await p.execute(`SELECT * FROM users WHERE reset_token = ? LIMIT 1`, [token]);
		const user = rows && rows[0] && rows[0][0];
		if (!user) return null;
		user.refresh_tokens = safeParseTokens(user.refresh_tokens, true);
		return user;
	}
};

exports.updatePassword = async function updatePassword(userId, passwordHash) {
	const p = await getPool(); if (!p) return;
	if (!p.__sqlite) {
		await p.execute(`UPDATE users SET password = :pw WHERE id = :id`, { pw: passwordHash, id: userId });
	} else {
		await p.execute(`UPDATE users SET password = ? WHERE id = ?`, [passwordHash, userId]);
	}
};

exports.setOtp = async function setOtp(userId, code, expiresAt) {
	const p = await getPool(); if (!p) return;
	if (!p.__sqlite) {
		await p.execute(`UPDATE users SET otp_code = :code, otp_expires = :exp WHERE id = :id`, { code, exp: expiresAt, id: userId });
	} else {
		await p.execute(`UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?`, [code, expiresAt, userId]);
	}
};

exports.clearOtpAndVerify = async function clearOtpAndVerify(userId) {
	const p = await getPool(); if (!p) return;
	if (!p.__sqlite) {
		await p.execute(`UPDATE users SET otp_code = NULL, otp_expires = NULL, is_phone_verified = 1 WHERE id = :id`, { id: userId });
	} else {
		await p.execute(`UPDATE users SET otp_code = NULL, otp_expires = NULL, is_phone_verified = 1 WHERE id = ?`, [userId]);
	}
};

exports.updateUserFields = async function updateUserFields(userId, fields) {
	const p = await getPool(); if (!p) return;
	const keys = Object.keys(fields || {});
	if (!keys.length) return;
	if (!p.__sqlite) {
		const parts = keys.map(k => `${k} = :${k}`).join(', ');
		const params = { ...fields, id: userId };
		await p.execute(`UPDATE users SET ${parts} WHERE id = :id`, params);
	} else {
		const parts = keys.map(k => `${k} = ?`).join(', ');
		const values = keys.map(k => fields[k]);
		values.push(userId);
		await p.execute(`UPDATE users SET ${parts} WHERE id = ?`, values);
	}
};

exports.getAddressesByUserId = async function getAddressesByUserId(userId) {
	const p = await getPool(); if (!p) return [];
	if (!p.__sqlite) {
		const [rows] = await p.execute(`SELECT * FROM addresses WHERE user_id = ? ORDER BY id DESC`, [userId]);
		return rows.map(r => ({
			id: r.id,
			label: 'Home',
			name: r.full_name,
			street: r.address1,
			city: r.city,
			state: r.state,
			postalCode: r.pincode,
			country: r.country || 'IN',
			phone: r.phone
		})) || [];
	} else {
		const rows = await p.execute(`SELECT * FROM addresses WHERE user_id = ? ORDER BY id DESC`, [userId]);
		return (rows && rows[0] || []).map(r => ({
			id: r.id,
			label: 'Home',
			name: r.full_name,
			street: r.address1,
			city: r.city,
			state: r.state,
			postalCode: r.pincode,
			country: r.country || 'IN',
			phone: r.phone
		})) || [];
	}
};

// Export getPool and a simple query helper for other modules that expect them
exports.getPool = getPool;

exports.query = async function query(sql, params) {
	const p = await getPool();
	if (!p) return [];
	if (!p.__sqlite) {
		const [rows] = await p.execute(sql, params || []);
		return rows;
	} else {
		const rows = await p.execute(sql, params || []);
		return (rows && rows[0]) ? rows[0] : rows;
	}
};

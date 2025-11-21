// route safe loader
function tryRoute(p) {
  try {
    return require(p);
  } catch (e) {
    console.warn(`Route ${p} not loaded:`, e.message);
    return null;
  }
}

require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('./middleware/rateLimiter');
const xss = require('xss-clean');
// MongoDB removed: connectDB is no longer used
const errorHandler = require('./middleware/errorHandler');
const { ensureSchema } = require('./utils/mysql');

// routes (only auth routes enabled while migrating from MongoDB to MySQL/SQLite)
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const publicRoutes = require('./routes/publicRoutes');

const app = express();

// Initialize MySQL schema if configured
(async () => {
	try { await ensureSchema(); } catch(e) { console.log('MySQL schema init skipped:', e.message); }
})();

// Middlewares
app.use(helmet({
	crossOriginEmbedderPolicy: false,
	crossOriginResourcePolicy: { policy: "cross-origin" },
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			// allow unpkg for third-party packages like Flickity; keep other trusted origins
			scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://www.gstatic.com", "https://www.googleapis.com", "https://apis.google.com", "https://accounts.google.com"],
			styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdnjs.cloudflare.com", "https://unpkg.com"],
			imgSrc: ["'self'", "data:", "*.pinimg.com", "*.cloudflare.com", "https://www.svgrepo.com"],
			// allow blob: for local object URLs used by File previews
			imgSrc: ["'self'", "data:", "blob:", "*.pinimg.com", "*.cloudflare.com", "https://www.svgrepo.com"],
			fontSrc: ["'self'", "fonts.gstatic.com", "fonts.googleapis.com", "cdnjs.cloudflare.com"],
			connectSrc: ["'self'", "https://www.googleapis.com", "https://securetoken.googleapis.com", "https://identitytoolkit.googleapis.com", "https://www.gstatic.com", "https://apis.google.com"],
			frameSrc: ["'self'", "https://accounts.google.com", "https://*.firebaseapp.com"],
			objectSrc: ["'none'"],
			upgradeInsecureRequests: []
		}
	}
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(rateLimit);
app.use(xss());

// Serve frontend static files
const path = require('path');
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

// If a request doesn't start with /api and matches no static file, serve main.html (SPA / fallback)
app.get(/^((?!\/api).)*$/, (req, res, next) => {
	// If the request accepts html, return main.html, otherwise pass to next
	if (req.accepts('html')) {
		return res.sendFile(path.join(frontendDir, 'main.html'));
	}
	next();
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
// Public/dev routes (unauthenticated - remove in production)
app.use('/api/public', publicRoutes);

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


const firebaseAuthRoutes = require('./routes/firebaseAuthRoutes');
app.use('/api/auth', firebaseAuthRoutes);

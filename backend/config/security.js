// Security configuration
module.exports = {
    // Password requirements
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_REQUIRES_UPPERCASE: true,
    PASSWORD_REQUIRES_LOWERCASE: true,
    PASSWORD_REQUIRES_NUMBER: true,
    PASSWORD_REQUIRES_SPECIAL: true,

    // Session configuration
    SESSION_TIMEOUT: 900000, // 15 minutes in milliseconds
    
    // Login attempts
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_LOCKOUT_TIME: 900000, // 15 minutes in milliseconds
    
    // Token configuration
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    
    // API rate limits (requests per 15 minutes)
    RATE_LIMIT_AUTH: 5,
    RATE_LIMIT_API: 100,
    
    // CORS configuration
    CORS_ORIGINS: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000'],
        
    // Security headers
    SECURITY_HEADERS: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }
};
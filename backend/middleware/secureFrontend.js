const express = require('express');
const path = require('path');

const secureFrontend = (app) => {
    // Serve static files with security headers
    app.use('/static', express.static(path.join(__dirname, '../frontend'), {
        setHeaders: (res, path) => {
            // Prevent browsers from MIME-sniffing
            res.set('X-Content-Type-Options', 'nosniff');
            
            // Enable Cross-site scripting filter
            res.set('X-XSS-Protection', '1; mode=block');
            
            // Prevent clickjacking
            res.set('X-Frame-Options', 'DENY');
            
            // Strict MIME type checking
            if (path.endsWith('.js')) {
                res.set('Content-Type', 'application/javascript; charset=UTF-8');
            }
        }
    }));

    // Secure cookie settings
    app.use((req, res, next) => {
        res.cookie('sessionId', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hour
        });
        next();
    });
};

module.exports = secureFrontend;
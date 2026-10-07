const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthMiddleware {
    /**
     * Middleware to verify JWT token and attach user info to request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async authenticate(req, res, next) {
        try {
            // Get token from Authorization header
            const authHeader = req.headers.authorization;
            
            if (!authHeader) {
                return res.status(401).json({ 
                    error: 'No token provided. Authorization header is required.' 
                });
            }

            // Extract token from "Bearer <token>"
            const token = authHeader.startsWith('Bearer ') 
                ? authHeader.slice(7) 
                : authHeader;

            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            const dbUser = await User.findByPk(decoded.id, {
                attributes: ['id', 'role', 'garage_id'],
            });
            if (!dbUser) {
                return res.status(401).json({ error: 'User not found' });
            }

            req.user = {
                id: dbUser.id,
                role: dbUser.role,
                garage_id: dbUser.garage_id,
            };

            next();
        } catch (err) {
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({ error: 'Invalid token' });
            }
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token has expired' });
            }
            return res.status(401).json({ error: 'Authentication failed' });
        }
    }

    /**
     * Optional authentication: if a token is present, validate and attach user.
     * If no token is provided, proceed without user.
     */
    async optionalAuthenticate(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                req.authError = null;
                return next();
            }

            const token = authHeader.startsWith('Bearer ')
                ? authHeader.slice(7)
                : authHeader;

            if (!token) {
                req.authError = 'No token provided';
                return next();
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const dbUser = await User.findByPk(decoded.id, {
                attributes: ['id', 'role', 'garage_id'],
            });
            if (!dbUser) {
                // Optional auth should not block public commands.
                req.user = null;
                req.authError = 'User not found';
                return next();
            }

            req.user = {
                id: dbUser.id,
                role: dbUser.role,
                garage_id: dbUser.garage_id,
            };

            return next();
        } catch (err) {
            // Optional auth should never reject request; protected commands
            // are handled by permission checks in master controller.
            req.user = null;
            if (err.name === 'JsonWebTokenError') {
                req.authError = 'Invalid token';
            } else if (err.name === 'TokenExpiredError') {
                req.authError = 'Token has expired';
            } else {
                req.authError = 'Authentication failed';
            }
            return next();
        }
    }
}

module.exports = new AuthMiddleware();

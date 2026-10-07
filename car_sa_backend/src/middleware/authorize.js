class AuthorizationMiddleware {
    /**
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async requireAdmin(req, res, next) {
        // This middleware should be used after authenticate middleware
        // So req.user should already exist
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required' 
            });
        }

        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ 
                error: 'Access denied. Super admin privileges required.' 
            });
        }

        next();
    }

    /**
     * Middleware factory to check if user has one of the allowed roles
     * Must be used after AuthMiddleware.authenticate
     * @param {...string} allowedRoles - Roles that are allowed to access
     * @returns {Function} Express middleware function
     */
    requireRoles(...allowedRoles) {
        return async (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ 
                    error: 'Authentication required' 
                });
            }

            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ 
                    error: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
                });
            }

            next();
        };
    }
}

module.exports = new AuthorizationMiddleware();

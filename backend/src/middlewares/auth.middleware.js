const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    try {
        let token = req.headers.authorization || req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized: No token provided"
            });
        }

        if (token.startsWith('Bearer ')) {
            token = token.slice(7).trim();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized: Invalid or expired token"
        });
    }
}

module.exports = authMiddleware;

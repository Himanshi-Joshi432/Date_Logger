const UserModel = require('../models/auth.model');

/**
 * Loads who shares this user's journal: themselves, plus their linked partner if any.
 * Sets req.journalOwnerIds (ids whose posts/ideas this user may see) and req.partnerId.
 * Must run after authMiddleware.
 */
async function journalMiddleware(req, res, next) {
    try {
        const user = await UserModel.findById(req.user.id).select('partner');
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized: User no longer exists' });
        }
        req.partnerId = user.partner ? String(user.partner) : null;
        req.journalOwnerIds = req.partnerId ? [req.user.id, req.partnerId] : [req.user.id];
        next();
    } catch (error) {
        console.error('Journal lookup error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = journalMiddleware;

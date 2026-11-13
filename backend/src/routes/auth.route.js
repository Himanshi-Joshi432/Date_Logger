const router = require('express').Router();
const authController = require('../controller/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rateLimit = require('../middlewares/rateLimit.middleware');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts. Please try again in a few minutes.'
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many accounts created from this network. Please try again later.'
});

router.post('/login', loginLimiter, authController.login);
router.post('/register', registerLimiter, authController.register);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);
// POST alias exists because some HTTP clients drop the body on DELETE.
router.delete('/me', authMiddleware, loginLimiter, authController.deleteAccount);
router.post('/delete-account', authMiddleware, loginLimiter, authController.deleteAccount);

module.exports = router;

const router = require('express').Router();
const coupleController = require('../controller/couple.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rateLimit = require('../middlewares/rateLimit.middleware');

// Invite codes are short, so limit guessing.
const joinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many attempts. Please try again in a few minutes.'
});

router.use(authMiddleware);

router.get('/', coupleController.getCouple);
router.post('/invite', coupleController.createInvite);
router.post('/join', joinLimiter, coupleController.joinWithCode);
router.delete('/', coupleController.unlink);

module.exports = router;

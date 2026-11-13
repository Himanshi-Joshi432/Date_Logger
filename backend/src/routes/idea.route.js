const router = require('express').Router();
const ideaController = require('../controller/idea.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const journalMiddleware = require('../middlewares/journal.middleware');

router.use(authMiddleware, journalMiddleware);

router.get('/', ideaController.listIdeas);
router.post('/', ideaController.createIdeas);
router.patch('/:id', ideaController.updateIdea);
router.delete('/:id', ideaController.deleteIdea);

module.exports = router;

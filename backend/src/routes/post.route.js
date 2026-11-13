const router = require('express').Router();
const postController = require('../controller/post.controller');
const { upload } = require('../services/storage.services');
const authMiddleware = require('../middlewares/auth.middleware');
const journalMiddleware = require('../middlewares/journal.middleware');

const postUploads = upload.fields([
    { name: 'images', maxCount: 15 },
    { name: 'image', maxCount: 15 },
    { name: 'audio', maxCount: 1 },
    { name: 'music', maxCount: 1 }
]);

router.use(authMiddleware, journalMiddleware);

router.post('/add', postUploads, postController.createPost);
router.put('/:id', postUploads, postController.updatePost);
router.patch('/:id', postUploads, postController.updatePost);
router.delete('/delete/:id', postController.deletePost);
router.get('/posts', postController.getPosts);
router.get('/:id', postController.getPostById);

module.exports = router;

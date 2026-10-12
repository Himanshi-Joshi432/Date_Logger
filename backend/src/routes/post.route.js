const router = require('express').Router();
const postController = require('../controller/post.controller');
const { upload } = require('../services/storage.services');
const authMiddleware = require('../middlewares/auth.middleware');

router.post(
    '/add',
    authMiddleware,
    upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'audio', maxCount: 1 },
        { name: 'music', maxCount: 1 }
    ]),
    postController.createPost
);
router.delete('/delete/:id', authMiddleware, postController.deletePost);
router.get('/posts', authMiddleware, postController.getPosts);

module.exports = router;



const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');
const { avatarUpload, handleUploadErrors } = require('../middleware/upload');

router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.post('/avatar', auth, handleUploadErrors(avatarUpload.single('avatar')), userController.uploadAvatar);
router.post('/subscription', auth, userController.purchaseSubscription);

module.exports = router;

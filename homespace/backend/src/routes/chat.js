const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { auth } = require('../middleware/auth');

router.get('/', auth, chatController.getChatFamilies);
router.get('/:familyId', auth, chatController.getMessages);
router.post('/', auth, chatController.sendMessage);
router.put('/:id', auth, chatController.updateMessage);
router.delete('/:id', auth, chatController.deleteMessage);

module.exports = router;

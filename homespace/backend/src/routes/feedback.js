const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { auth } = require('../middleware/auth');

router.post('/', feedbackController.submitFeedback);

module.exports = router;

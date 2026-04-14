const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { auth } = require('../middleware/auth');

router.get('/productivity', auth, analyticsController.getProductivity);
router.get('/export', auth, analyticsController.exportData);

module.exports = router;

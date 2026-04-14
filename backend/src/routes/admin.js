const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth } = require('../middleware/auth');

const isAdmin = (req, res, next) => {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  if (!adminEmails.includes(req.user.email.toLowerCase())) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.get('/stats', auth, isAdmin, adminController.getStats);
router.get('/users', auth, isAdmin, adminController.getRecentUsers);
router.get('/families', auth, isAdmin, adminController.getRecentFamilies);
router.get('/subscriptions', auth, isAdmin, adminController.getSubscriptionStats);

module.exports = router;

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth } = require('../middleware/auth');

const isAdmin = (req, res, next) => {
  const adminEmails = (process.env.ADMIN_EMAILS || 'admin@homespace.ru,admin@example.com').split(',').map(e => e.trim().toLowerCase());
  if (!adminEmails.includes(req.user.email.toLowerCase())) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.get('/stats', auth, isAdmin, adminController.getStats);
router.get('/users', auth, isAdmin, adminController.getRecentUsers);
router.put('/users/:id', auth, isAdmin, adminController.updateUser);
router.delete('/users/:id', auth, isAdmin, adminController.deleteUser);
router.get('/families', auth, isAdmin, adminController.getRecentFamilies);
router.put('/families/:id', auth, isAdmin, adminController.updateFamily);
router.delete('/families/:id', auth, isAdmin, adminController.deleteFamily);
router.get('/passwords', auth, isAdmin, adminController.getAdminPasswords);
router.put('/passwords/:id', auth, isAdmin, adminController.updateAdminPassword);
router.delete('/passwords/:id', auth, isAdmin, adminController.deleteAdminPassword);
router.get('/files', auth, isAdmin, adminController.getAdminFiles);
router.put('/files/:id', auth, isAdmin, adminController.updateAdminFile);
router.delete('/files/:id', auth, isAdmin, adminController.deleteAdminFile);
router.get('/tasks', auth, isAdmin, adminController.getAdminTasks);
router.put('/tasks/:id', auth, isAdmin, adminController.updateAdminTask);
router.delete('/tasks/:id', auth, isAdmin, adminController.deleteAdminTask);
router.get('/subscriptions', auth, isAdmin, adminController.getSubscriptionStats);
router.get('/payments', auth, isAdmin, adminController.getSubscriptionPayments);
router.get('/audit', auth, isAdmin, adminController.getAuditLogs);
router.get('/tickets', auth, isAdmin, adminController.getSupportTickets);
router.put('/tickets/:id', auth, isAdmin, adminController.updateSupportTicket);
router.delete('/tickets/:id', auth, isAdmin, adminController.deleteSupportTicket);
router.get('/feedback', auth, isAdmin, adminController.getFeedback);
router.delete('/feedback/:id', auth, isAdmin, adminController.deleteFeedback);

module.exports = router;

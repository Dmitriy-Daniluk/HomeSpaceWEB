const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { auth } = require('../middleware/auth');
const { transactionValidation } = require('../middleware/validation');

router.get('/', auth, budgetController.getBudget);
router.post('/', auth, transactionValidation, budgetController.addTransaction);
router.put('/:id', auth, transactionValidation, budgetController.updateTransaction);
router.delete('/:id', auth, budgetController.deleteTransaction);
router.get('/stats', auth, budgetController.getBudgetStats);
router.get('/subscription', auth, budgetController.getSubscriptionData);

module.exports = router;

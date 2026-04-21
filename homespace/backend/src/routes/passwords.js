const express = require('express');
const router = express.Router();
const passwordController = require('../controllers/passwordController');
const { auth } = require('../middleware/auth');
const { passwordValidation } = require('../middleware/validation');

router.get('/', auth, passwordController.getPasswords);
router.post('/', auth, passwordValidation, passwordController.savePassword);
router.get('/:id', auth, passwordController.getPassword);
router.put('/:id', auth, passwordController.updatePassword);
router.delete('/:id', auth, passwordController.deletePassword);

module.exports = router;

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { auth } = require('../middleware/auth');
const { taskValidation } = require('../middleware/validation');

router.get('/', auth, taskController.getTasks);
router.post('/', auth, taskValidation, taskController.createTask);
router.get('/stats', auth, taskController.getTaskStats);
router.get('/:id', auth, taskController.getTaskById);
router.put('/:id', auth, taskController.updateTask);
router.patch('/:id/status', auth, taskController.updateTask);
router.delete('/:id', auth, taskController.deleteTask);

module.exports = router;

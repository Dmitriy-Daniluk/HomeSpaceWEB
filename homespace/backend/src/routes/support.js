const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { auth } = require('../middleware/auth');

router.post('/', auth, supportController.createTicket);
router.get('/my', auth, supportController.getMyTickets);
router.get('/all', auth, supportController.adminGetAllTickets);
router.put('/:id', auth, supportController.adminUpdateTicket);

module.exports = router;

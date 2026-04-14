const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const { auth } = require('../middleware/auth');

router.get('/', auth, familyController.getMyFamilies);
router.post('/', auth, familyController.createFamily);
router.get('/:id', auth, familyController.getFamilyDetails);
router.post('/:id/invite', auth, familyController.inviteMember);
router.post('/join', auth, familyController.joinByCode);
router.put('/:id', auth, familyController.updateFamily);
router.delete('/:id/member/:userId', auth, familyController.removeMember);

module.exports = router;

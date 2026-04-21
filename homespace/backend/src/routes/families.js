const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const { auth } = require('../middleware/auth');

router.get('/', auth, familyController.getMyFamilies);
router.post('/', auth, familyController.createFamily);
router.get('/:id/overview', auth, familyController.getFamilyOverview);
router.get('/:id', auth, familyController.getFamilyDetails);
router.post('/:id/invite', auth, familyController.inviteMember);
router.post('/:id/children', auth, familyController.createChildAccount);
router.post('/join', auth, familyController.joinByCode);
router.put('/:id', auth, familyController.updateFamily);
router.put('/:id/member/:userId/role', auth, familyController.updateMemberRole);
router.delete('/:id/member/:userId', auth, familyController.removeMember);

module.exports = router;

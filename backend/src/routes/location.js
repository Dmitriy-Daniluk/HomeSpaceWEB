const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { auth } = require('../middleware/auth');
const { geofenceValidation } = require('../middleware/validation');

router.post('/update', auth, locationController.updateLocation);
router.get('/latest/:userId', auth, locationController.getLatestLocation);
router.get('/geofences/:familyId', auth, locationController.getGeofences);
router.post('/geofences/:familyId', auth, geofenceValidation, locationController.createGeofence);
router.delete('/geofences/:id', auth, locationController.deleteGeofence);

module.exports = router;

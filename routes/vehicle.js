const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const auth = require('../middleware/auth');

router.post('/', auth('owner'), vehicleController.createVehicle);

router.get('/my', auth('owner'), vehicleController.getMyVehicles);
router.put('/:id', auth('owner'), vehicleController.updateVehicle);
router.delete('/:id', auth('owner'), vehicleController.softDeleteVehicle);
router.post('/:id/assign-driver', auth(['owner', 'driver']), vehicleController.assignDriver);
router.get('/', auth(), vehicleController.getAllVehicles);

module.exports = router;

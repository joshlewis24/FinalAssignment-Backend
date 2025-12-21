const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');

// Protect all admin routes with admin role
router.use(auth('admin'));

// Analytics
router.get('/analytics', adminController.getAnalytics);

// Vehicles
router.get('/vehicles', adminController.listVehicles);
router.patch('/vehicles/:id', adminController.updateVehicle);
router.delete('/vehicles/:id', adminController.deleteVehicle);

// Drivers
router.get('/drivers', adminController.listDrivers);
router.patch('/drivers/:id', adminController.updateDriver);
router.delete('/drivers/:id', adminController.deleteDriver);

// Bookings
router.get('/bookings', adminController.listBookings);
router.patch('/bookings/:id', adminController.updateBooking);
router.delete('/bookings/:id', adminController.deleteBooking);

module.exports = router;

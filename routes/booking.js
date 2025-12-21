const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const auth = require('../middleware/auth');

router.post('/', auth('customer'), bookingController.createBooking);
router.get('/my', auth(['customer', 'driver']), bookingController.getMyBookings);
router.put('/:id', auth('customer'), bookingController.updateBooking);
router.delete('/:id', auth('customer'), bookingController.softDeleteBooking);
router.put('/:id/status/:status', auth(['customer', 'driver']), bookingController.updateBookingStatus);
router.get('/:id', auth(['customer', 'driver']), bookingController.getBookingsByUser);
// Owner-only: set revenue for a booking (fare)
router.put('/:id/revenue', auth('owner'), bookingController.setBookingRevenue);

module.exports = router;

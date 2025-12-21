const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const User = require('../models/User');

exports.getAnalytics = async (req, res) => {
  try {
    const [totalVehicles, totalDrivers, totalBookings, cancelledBookings, revenueFromBookings] = await Promise.all([
      Vehicle.countDocuments({ isDeleted: false }),
      User.countDocuments({ role: 'driver', isDeleted: false }),
      Booking.countDocuments({ isDeleted: false }),
      Booking.countDocuments({ status: 'cancelled', isDeleted: false }),
      Booking.aggregate([
        { $match: { status: 'completed', isDeleted: false, fare: { $gt: 0 } } },
        { $group: { _id: null, sum: { $sum: '$fare' } } },
      ]),
    ]);

    const revenueGenerated = (revenueFromBookings?.[0]?.sum || 0);

    res.json({
      data: {
        totalVehicles,
        totalDrivers,
        totalBookings,
        cancelledBookings,
        revenueGenerated,
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.listVehicles = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Vehicle.find({ isDeleted: false }).skip(skip).limit(Number(limit)).populate('owner', 'name email').lean(),
      Vehicle.countDocuments({ isDeleted: false }),
    ]);
    res.json({ data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const updated = await Vehicle.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, req.body, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ data: updated });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, { isDeleted: true }, { new: true }).lean();
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    // Cascade: soft-delete trips and bookings for this vehicle
    await Promise.all([
      Booking.updateMany({ vehicle: vehicle._id, isDeleted: false }, { $set: { isDeleted: true } }),
    ]);
    res.json({ message: 'Vehicle soft-deleted with cascade', data: vehicle });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.listDrivers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      User.find({ role: 'driver', isDeleted: false }).skip(skip).limit(Number(limit)).select('name email role').lean(),
      User.countDocuments({ role: 'driver', isDeleted: false }),
    ]);
    res.json({ data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateDriver = async (req, res) => {
  try {
    const updated = await User.findOneAndUpdate({ _id: req.params.id, role: 'driver', isDeleted: false }, req.body, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Driver not found' });
    res.json({ data: updated });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteDriver = async (req, res) => {
  try {
    const driver = await User.findOneAndUpdate({ _id: req.params.id, role: 'driver', isDeleted: false }, { isDeleted: true }, { new: true }).lean();
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    // Cascade: unassign from vehicles, soft-delete trips and bookings
    await Promise.all([
      Vehicle.updateMany({ driver: driver._id }, { $unset: { driver: '' } }),
      Booking.updateMany({ driver: driver._id, isDeleted: false }, { $set: { isDeleted: true } }),
    ]);
    res.json({ message: 'Driver soft-deleted and cascaded', data: driver });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.listBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Booking.find({ isDeleted: false }).skip(skip).limit(Number(limit)).populate('vehicle', 'registrationNumber').populate('driver', 'name').populate('customer', 'name').lean(),
      Booking.countDocuments({ isDeleted: false }),
    ]);
    res.json({ data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const updated = await Booking.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, req.body, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Booking not found' });
    res.json({ data: updated });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, { isDeleted: true }, { new: true }).lean();
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ message: 'Booking soft-deleted', data: booking });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

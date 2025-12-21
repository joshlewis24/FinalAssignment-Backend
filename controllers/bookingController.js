const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { sendEmail } = require('../utils/mailer');

async function sendBookingNotification(bookingId, type) {
  const booking = await Booking.findById(bookingId)
    .populate('customer', 'email name')
    .populate('driver', 'email name')
    .populate({
      path: 'vehicle',
      select: 'registrationNumber owner',
      populate: { path: 'owner', select: 'email name' }
    })
    .lean();
  if (!booking) return;
  const to = booking.customer?.email;
  if (!to) return;
  const dateStr = new Date(booking.bookingDate || Date.now()).toLocaleString();
  const baseInfo = `Vehicle: ${booking.vehicle?.registrationNumber || '-'}\nFrom: ${booking.source || '-'}\nTo: ${booking.destination || '-'}\nWhen: ${dateStr}`;
  const fareStr = typeof booking.fare === 'number' ? `\nFare: $${booking.fare.toFixed(2)}` : '';
  let subject = '';
  let text = '';
  if (type === 'confirmation') {
    subject = 'Booking Confirmation';
    text = `Your booking is confirmed.\n${baseInfo}${fareStr}`;
  } else if (type === 'completed') {
    subject = 'Trip Completed';
    text = `Your trip has been completed.\n${baseInfo}${fareStr}`;
  } else if (type === 'cancelled') {
    subject = 'Booking Cancelled';
    text = `Your booking has been cancelled.\n${baseInfo}`;
  }
  await sendEmail({ to, subject, text });
  // Notify owner on completion as well
  if (type === 'completed' && booking.vehicle?.owner?.email) {
    await sendEmail({
      to: booking.vehicle.owner.email,
      subject: 'Booking Completed (Owner Notice)',
      text: `A booking on your vehicle has completed.\n${baseInfo}${fareStr}`,
    });
  }
}

async function applyOwnerRevenueIfNeeded(bookingId) {
  const booking = await Booking.findById(bookingId).populate('vehicle', 'owner').lean();
  if (!booking || booking.isDeleted) return;
  if (booking.status !== 'completed') return; // safety: only on completed
  if (booking.revenueApplied) return; // already counted
  if (typeof booking.fare !== 'number' || booking.fare <= 0) return;
  const ownerId = booking.vehicle && booking.vehicle.owner;
  if (!ownerId) return;
  await User.findByIdAndUpdate(ownerId, { $inc: { totalRevenue: booking.fare } });
  await Booking.findByIdAndUpdate(bookingId, { $set: { revenueApplied: true } });
}

exports.createBooking = async (req, res) => {
  try {
    // Get driver from the selected vehicle at booking time
    const vehicle = await Vehicle.findById(req.body.vehicle).lean();
    if (!vehicle || vehicle.isDeleted) {
      return res.status(400).json({ message: 'Invalid or unavailable vehicle' });
    }
    const driverId = vehicle.driver || (Array.isArray(vehicle.drivers) && vehicle.drivers.length ? vehicle.drivers[0] : undefined);

    // Calculate distance using Haversine if coords provided (for context only)
    const { source, destination, sourceCoords, destinationCoords } = req.body || {};
    let distanceKm;
    if (
      sourceCoords && destinationCoords &&
      typeof sourceCoords.lat === 'number' && typeof sourceCoords.lng === 'number' &&
      typeof destinationCoords.lat === 'number' && typeof destinationCoords.lng === 'number'
    ) {
      const toRad = (v) => (v * Math.PI) / 180;
      const R = 6371; // km
      const dLat = toRad(destinationCoords.lat - sourceCoords.lat);
      const dLng = toRad(destinationCoords.lng - sourceCoords.lng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(sourceCoords.lat)) *
          Math.cos(toRad(destinationCoords.lat)) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceKm = R * c;
    }

    // Coerce fare from request (e.g., vehicle revenue) if provided
    let fare;
    if (req.body && req.body.fare !== undefined) {
      const f = typeof req.body.fare === 'string' ? Number(req.body.fare) : req.body.fare;
      fare = Number.isFinite(f) && f >= 0 ? Number(f) : undefined;
    }

    const booking = await Booking.create({
      ...req.body,
      source: source || req.body.startLocation, // fallback if frontend uses different key
      destination: destination || req.body.endLocation,
      distanceKm: typeof distanceKm === 'number' ? Number(distanceKm.toFixed(2)) : undefined,
      fare,
      customer: req.user.id,
      driver: driverId,
    });
    // Notify customer
    //try { await sendBookingNotification(booking._id, 'confirmation'); } catch (e) { console.warn('Email error:', e.message); }
    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const query = { customer: req.user.id, isDeleted: false };
    const docs = await Booking.find(query).lean();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, customer: req.user.id },
      req.body,
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.softDeleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, customer: req.user.id },
      { isDeleted: true },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { status: 'accepted', driver: req.user.id },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ message: 'Booking accepted', booking });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getBookingsByUser = async (req, res) => {
  try {
    const userId = req.params.id;
    let filter = { isDeleted: false };
    if (req.user.role === 'customer') {
      filter.customer = userId;
    } else if (req.user.role === 'driver') {
      filter.driver = userId;
    }
    const docs = await Booking.find(filter).lean();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.completeBooking = async (req, res) => {
  try {
    const before = await Booking.findOne({ _id: req.params.id, driver: req.user.id, isDeleted: false }).lean();
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, driver: req.user.id, isDeleted: false },
      { status: 'completed' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found or not assigned to you' });
    if (!before || before.status !== 'completed') {
      await applyOwnerRevenueIfNeeded(booking._id);
     // try { await sendBookingNotification(booking._id, 'completed'); } catch (e) { console.warn('Email error:', e.message); }
    }
    res.json({ message: 'Booking completed', booking });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.setOngoingBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, driver: req.user.id, isDeleted: false },
      { status: 'ongoing' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found or not assigned to you' });
    res.json({ message: 'Booking set to ongoing', booking });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    let filter = { _id: req.params.id, isDeleted: false };
    if (req.user.role === 'customer') {
      filter.customer = req.user.id;
    } else if (req.user.role === 'driver') {
      filter.driver = req.user.id;
    }
    const current = await Booking.findOne(filter).lean();
    if (!current) return res.status(404).json({ message: 'Booking not found or not accessible to you' });
    if (current.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed booking' });
    }
    const booking = await Booking.findOneAndUpdate(filter, { status: 'cancelled' }, { new: true });
    if (!booking) return res.status(404).json({ message: 'Booking not found or not accessible to you' });
   // try { await sendBookingNotification(booking._id, 'cancelled'); } catch (e) { console.warn('Email error:', e.message); }
    res.json({ message: 'Booking cancelled', booking });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = ['accepted', 'ongoing', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    let filter = { _id: req.params.id, isDeleted: false };
    let updateData = { status };

    // Role-based access control
    if (status === 'accepted' && req.user.role === 'driver') {
      updateData.driver = req.user.id;
    } else if (['ongoing', 'completed'].includes(status) && req.user.role === 'driver') {
      filter.driver = req.user.id;
    } else if (status === 'cancelled') {
      if (req.user.role === 'customer') {
        filter.customer = req.user.id;
      } else if (req.user.role === 'driver') {
        filter.driver = req.user.id;
      }
    } else if (req.user.role !== 'driver' && ['accepted', 'ongoing', 'completed'].includes(status)) {
      return res.status(403).json({ message: 'Only drivers can update to this status' });
    }

    const before = await Booking.findOne(filter).lean();
    const booking = await Booking.findOneAndUpdate(filter, updateData, { new: true });
    if (!booking) return res.status(404).json({ message: 'Booking not found or not accessible' });
    if (status === 'completed' && (!before || before.status !== 'completed')) {
      await applyOwnerRevenueIfNeeded(booking._id);
     // try { await sendBookingNotification(booking._id, 'completed'); } catch (e) { console.warn('Email error:', e.message); }
    }
    if (status === 'cancelled' && (!before || before.status !== 'cancelled')) {
      //try { await sendBookingNotification(booking._id, 'cancelled'); } catch (e) { console.warn('Email error:', e.message); }
    }
    
    res.json({ message: `Booking ${status}`, booking });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Owner sets revenue (fare) for a booking of their vehicle
exports.setBookingRevenue = async (req, res) => {
  try {
    const { amount } = req.body || {};
    if (typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({ message: 'Invalid revenue amount' });
    }
    // Ensure the owner owns the vehicle in this booking
    const booking = await Booking.findById(req.params.id).populate('vehicle', 'owner').lean();
    if (!booking || booking.isDeleted) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (!booking.vehicle || String(booking.vehicle.owner) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to set revenue for this booking' });
    }
    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      { $set: { fare: amount } },
      { new: true }
    );
    res.json({ message: 'Revenue set', booking: updated });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  status: { type: String, enum: ['pending', 'accepted', 'ongoing', 'completed', 'cancelled'], default: 'pending' },
  bookingDate: { type: Date, default: Date.now },
  // New fields for route and pricing
  source: { type: String },
  destination: { type: String },
  sourceCoords: {
    lat: { type: Number },
    lng: { type: Number }
  },
  destinationCoords: {
    lat: { type: Number },
    lng: { type: Number }
  },
  distanceKm: { type: Number },
  fare: { type: Number }, // revenue charged for this booking
  // Prevent double-counting owner revenue when booking is completed
  revenueApplied: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);

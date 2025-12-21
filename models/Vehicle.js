const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  registrationNumber: { type: String, required: true, unique: true },
  // Owner-managed revenue for the vehicle
  revenue: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
  // Single assigned driver
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Legacy support for array of drivers (optional)
  drivers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);

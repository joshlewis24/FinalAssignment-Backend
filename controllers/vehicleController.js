const Vehicle = require('../models/Vehicle');

exports.createVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.create({ ...req.body, owner: req.user.id });
    console.log("Created vehicle:", vehicle); 
    res.status(201).json(vehicle);
    
    
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getMyVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user.id, isDeleted: false })
      .populate('owner', 'name email');
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      req.body,
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.softDeleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { isDeleted: true },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ message: 'Vehicle deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.assignDriver = async (req, res) => {
  try {
    const { driverId } = req.body;
    let assignId = driverId;
    if (req.user.role === 'driver') {
      assignId = req.user.id;
    }
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      {$addToSet:{drivers: assignId}},
      { driver: assignId },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ message: 'Driver assigned to vehicle', vehicle });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getAllVehicles = async (req, res) => {
  try {
    const { q, make, model, reg, minYear, maxYear, available } = req.query || {};
    const filter = { isDeleted: false };
    const or = [];
    if (q) {
      const rx = new RegExp(String(q).trim(), 'i');
      or.push({ make: rx }, { model: rx }, { registrationNumber: rx });
      const yearNum = Number(q);
      if (!Number.isNaN(yearNum)) or.push({ year: yearNum });
    }
    if (or.length) filter.$or = or;
    if (make) filter.make = new RegExp(String(make).trim(), 'i');
    if (model) filter.model = new RegExp(String(model).trim(), 'i');
    if (reg) filter.registrationNumber = new RegExp(String(reg).trim(), 'i');
    if (minYear || maxYear) {
      filter.year = {};
      if (minYear) filter.year.$gte = Number(minYear);
      if (maxYear) filter.year.$lte = Number(maxYear);
    }
    // Optionally filter only vehicles with assigned drivers
    if (String(available).toLowerCase() === 'true') {
      filter.$or = [
        ...(filter.$or || []),
        { driver: { $exists: true, $ne: null } },
        { drivers: { $exists: true, $type: 'array', $not: { $size: 0 } } },
      ];
    }

    const docs = await Vehicle.find(filter)
      .populate('owner', 'name email')
      .lean();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

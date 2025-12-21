require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const redis = require('redis');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

// Redis connection
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect()
  .then(() => console.log('Redis connected'))
  .catch((err) => console.error('Redis connection error:', err));

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'Backend API running' });
});

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const vehicleRoutes = require('./routes/vehicle');
app.use('/api/vehicles', vehicleRoutes);

// Trips route removed; bookings cover trip lifecycle now

const bookingRoutes = require('./routes/booking');
app.use('/api/bookings', bookingRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

const utilsRoutes = require('./routes/utils');
app.use('/api/utils', utilsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function main() {
	try {
		await mongoose.connect(process.env.MONGO_URI);
		console.log('MongoDB connected');

		const email = 'admin@fleet.local';
		const password = 'Admin123!';
		const name = 'Admin';

		let user = await User.findOne({ email });
		if (user) {
			if (user.role !== 'admin') {
				user.role = 'admin';
				await user.save();
				console.log(`Updated existing user to admin: ${email}`);
			} else {
				console.log(`Admin already exists: ${email}`);
			}
		} else {
			const hashed = await bcrypt.hash(password, 10);
			user = await User.create({ name, email, password: hashed, role: 'admin' });
			console.log(`Created admin: ${email} / ${password}`);
		}
	} catch (err) {
		console.error('Seed error:', err);
	} finally {
		await mongoose.disconnect();
		process.exit(0);
	}
}

main();


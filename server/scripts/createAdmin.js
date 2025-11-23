/**
 * Script to create an admin user
 * Usage: node scripts/createAdmin.js <email> <username> <password>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/UserModel');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/PracLaundry";

async function createAdmin() {
  const [,, email, username, password] = process.argv;

  if (!email || !username || !password) {
    console.error('Usage: node scripts/createAdmin.js <email> <username> <password>');
    console.error('Example: node scripts/createAdmin.js admin@example.com admin admin123');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('❌ Password must be at least 6 characters long');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if user already exists
    const existing = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.trim() }
      ]
    });

    if (existing) {
      console.log(`❌ User already exists: ${existing.email || existing.username}`);
      console.log('   Use resetUserPassword.js to change password instead');
      process.exit(1);
    }

    // Create admin user
    const user = new User({
      email: email.toLowerCase(),
      username: username.trim(),
      password: password,
      role: 'admin',
      isActive: true
    });

    await user.save();

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log('\n💡 You can now login with these credentials');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('   User with this email or username already exists');
    }
    process.exit(1);
  }
}

createAdmin();


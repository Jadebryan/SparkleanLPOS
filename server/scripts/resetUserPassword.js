/**
 * Utility script to reset a user's password
 * Usage: node scripts/resetUserPassword.js <email_or_username> <new_password>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/UserModel');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/PracLaundry";

async function resetPassword() {
  const [,, identifier, newPassword] = process.argv;

  if (!identifier || !newPassword) {
    console.error('Usage: node scripts/resetUserPassword.js <email_or_username> <new_password>');
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error('❌ Password must be at least 6 characters long');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.trim() }
      ]
    });

    if (!user) {
      console.log(`❌ User not found: ${identifier}`);
      process.exit(1);
    }

    console.log('📋 User Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log('');

    // Reset password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();

    console.log('✅ Password reset successfully!');
    console.log('   The password has been hashed and saved.');

    // Also reset login attempts
    await user.resetLoginAttempts();
    console.log('✅ Login attempts reset');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetPassword();


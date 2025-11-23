/**
 * Utility script to check if a user's password is correctly stored
 * Usage: node scripts/checkUserPassword.js <email_or_username> <password>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/UserModel');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/PracLaundry";

async function checkPassword() {
  const [,, identifier, password] = process.argv;

  if (!identifier || !password) {
    console.error('Usage: node scripts/checkUserPassword.js <email_or_username> <password>');
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
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Login Attempts: ${user.loginAttempts}`);
    console.log(`   Locked: ${user.isLocked}`);
    console.log(`   Password Hash: ${user.password.substring(0, 20)}...`);
    console.log('');

    // Check password
    console.log('🔐 Checking password...');
    const isMatch = await user.comparePassword(password);
    
    if (isMatch) {
      console.log('✅ Password is CORRECT!');
    } else {
      console.log('❌ Password is INCORRECT!');
      console.log('\n💡 Possible issues:');
      console.log('   1. Password might have extra spaces');
      console.log('   2. Password might be case-sensitive');
      console.log('   3. Password might not have been hashed correctly');
      console.log('   4. User might need to reset password');
    }

    // Check if password needs rehashing (if using old hash method)
    const needsRehash = user.password.length < 60; // bcrypt hashes are 60 chars
    if (needsRehash) {
      console.log('\n⚠️  Password hash seems incorrect (too short)');
    }

    await mongoose.disconnect();
    process.exit(isMatch ? 0 : 1);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPassword();


/**
 * Emergency script to unlock all locked user accounts
 * Usage: node scripts/unlockAllAccounts.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/UserModel');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/PracLaundry";

async function unlockAllAccounts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all locked accounts
    const now = new Date();
    const lockedUsers = await User.find({
      lockUntil: { $gt: now }
    });

    console.log(`Found ${lockedUsers.length} locked account(s)\n`);

    if (lockedUsers.length === 0) {
      console.log('✅ No locked accounts found!');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Unlock all accounts
    const result = await User.updateMany(
      { lockUntil: { $gt: now } },
      {
        $unset: { lockUntil: 1 },
        $set: { loginAttempts: 0 }
      }
    );

    console.log(`✅ Unlocked ${result.modifiedCount} account(s)`);
    console.log('\n📋 Unlocked accounts:');
    lockedUsers.forEach(user => {
      console.log(`   - ${user.email || user.username} (${user.role})`);
    });

    // Also reset login attempts for all users with attempts > 0
    const resetResult = await User.updateMany(
      { loginAttempts: { $gt: 0 } },
      { $set: { loginAttempts: 0 } }
    );

    if (resetResult.modifiedCount > 0) {
      console.log(`\n✅ Reset login attempts for ${resetResult.modifiedCount} additional user(s)`);
    }

    console.log('\n✅ All accounts unlocked and login attempts reset!');
    console.log('   You can now try logging in again.');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

unlockAllAccounts();


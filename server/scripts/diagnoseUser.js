/**
 * Diagnostic script to check user account status and unlock if needed
 * Usage: node scripts/diagnoseUser.js <email_or_username>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/UserModel');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/PracLaundry";

async function diagnoseUser() {
  const [,, identifier] = process.argv;

  if (!identifier) {
    console.error('Usage: node scripts/diagnoseUser.js <email_or_username>');
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
      console.log('\n💡 Possible issues:');
      console.log('   1. User might have been deleted');
      console.log('   2. Email/username might be incorrect');
      console.log('   3. Database connection might be wrong');
      process.exit(1);
    }

    console.log('📋 User Account Status:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive ? '✅ Yes' : '❌ No (Account is deactivated)'}`);
    console.log(`   Login Attempts: ${user.loginAttempts || 0}`);
    console.log(`   Locked Until: ${user.lockUntil ? new Date(user.lockUntil).toLocaleString() : 'Not locked'}`);
    console.log(`   Is Locked: ${user.isLocked ? '❌ YES (Account is locked!)' : '✅ No'}`);
    console.log(`   Password Hash Length: ${user.password ? user.password.length : 0} characters`);
    console.log(`   Password Hash Valid: ${user.password && user.password.startsWith('$2') ? '✅ Yes (bcrypt)' : '❌ No (might be plaintext or corrupted)'}`);
    console.log('');

    // Check if account is locked
    if (user.isLocked) {
      const lockTime = new Date(user.lockUntil);
      const now = new Date();
      const timeLeft = Math.ceil((lockTime - now) / 1000 / 60); // minutes
      
      console.log('🔒 ACCOUNT IS LOCKED!');
      console.log(`   Locked until: ${lockTime.toLocaleString()}`);
      console.log(`   Time remaining: ${timeLeft > 0 ? `${timeLeft} minutes` : 'Lock expired (should be cleared)'}`);
      console.log('');
      console.log('🔓 Would you like to unlock this account? (y/n)');
      
      // For automated unlock, we'll do it anyway
      console.log('   Auto-unlocking account...');
      await User.findByIdAndUpdate(user._id, {
        $unset: { lockUntil: 1 },
        $set: { loginAttempts: 0 }
      });
      console.log('✅ Account unlocked!');
    }

    // Check if account is inactive
    if (!user.isActive) {
      console.log('⚠️  Account is deactivated!');
      console.log('   You need to activate it in the admin panel or database.');
    }

    // Check password hash
    if (!user.password || !user.password.startsWith('$2')) {
      console.log('⚠️  Password hash appears to be invalid!');
      console.log('   The password might need to be reset.');
    }

    // Reset login attempts if they're high
    if (user.loginAttempts > 0) {
      console.log(`\n🔄 Resetting login attempts (was: ${user.loginAttempts})...`);
      await User.findByIdAndUpdate(user._id, {
        $set: { loginAttempts: 0 }
      });
      console.log('✅ Login attempts reset to 0');
    }

    console.log('\n✅ Diagnosis complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Try logging in again');
    console.log('   2. If it still fails, test password: node scripts/checkUserPassword.js <email> <password>');
    console.log('   3. If password is wrong, reset it: node scripts/resetUserPassword.js <email> <newpassword>');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

diagnoseUser();


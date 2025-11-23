/**
 * Script to list all users in the database
 * Usage: node scripts/listUsers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/UserModel');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/PracLaundry";

async function listUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const users = await User.find({}).select('email username role isActive');
    
    if (users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('\n💡 You need to create users. Options:');
      console.log('   1. Use the registration endpoint: POST /api/auth/register');
      console.log('   2. Create an admin user: node scripts/createAdmin.js');
    } else {
      console.log(`📋 Found ${users.length} user(s):\n`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email || user.username}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive ? '✅' : '❌'}`);
        console.log('');
      });
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listUsers();


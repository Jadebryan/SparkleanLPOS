/**
 * Migration Script: Add 'change' field to existing orders
 * 
 * This script will:
 * 1. Find all orders that don't have the 'change' field
 * 2. Calculate the change amount based on paid and total
 * 3. Update those orders with the calculated change value
 * 
 * Run this script once to migrate existing data:
 * node migrations/addChangeFieldToOrders.js
 */

const mongoose = require('mongoose');
const Order = require('../models/OrderModel');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/PracLaundry';

async function migrateOrders() {
  try {
    console.log('🔄 Starting migration: Adding change field to orders...');
    
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database');

    // Find all orders that don't have the change field (or it's undefined/null)
    const orders = await Order.find({
      $or: [
        { change: { $exists: false } },
        { change: null },
        { change: undefined }
      ]
    });

    console.log(`📊 Found ${orders.length} orders to migrate`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const order of orders) {
      try {
        // Parse total amount (remove ₱ and commas)
        const totalStr = order.total || '₱0.00';
        const totalAmount = parseFloat(totalStr.replace(/[₱,]/g, '')) || 0;
        
        // Get paid amount
        const paidAmount = order.paid || 0;
        
        // Calculate change (overpayment amount)
        const changeAmount = paidAmount > totalAmount ? paidAmount - totalAmount : 0;
        
        // Update the order
        order.change = changeAmount;
        await order.save();
        
        updatedCount++;
        
        if (updatedCount % 10 === 0) {
          console.log(`   Progress: ${updatedCount}/${orders.length} orders updated...`);
        }
      } catch (error) {
        console.error(`   Error updating order ${order.id}:`, error.message);
        skippedCount++;
      }
    }

    console.log('\n✅ Migration completed!');
    console.log(`   - Updated: ${updatedCount} orders`);
    console.log(`   - Skipped: ${skippedCount} orders`);
    
    // Also check if there are any orders with change field that need recalculation
    const ordersWithChange = await Order.find({ change: { $exists: true, $ne: null } });
    let recalculatedCount = 0;
    
    for (const order of ordersWithChange) {
      try {
        const totalStr = order.total || '₱0.00';
        const totalAmount = parseFloat(totalStr.replace(/[₱,]/g, '')) || 0;
        const paidAmount = order.paid || 0;
        const correctChange = paidAmount > totalAmount ? paidAmount - totalAmount : 0;
        
        // Only update if the calculated change is different
        if (order.change !== correctChange) {
          order.change = correctChange;
          await order.save();
          recalculatedCount++;
        }
      } catch (error) {
        console.error(`   Error recalculating order ${order.id}:`, error.message);
      }
    }

    if (recalculatedCount > 0) {
      console.log(`   - Recalculated: ${recalculatedCount} orders`);
    }

    await mongoose.disconnect();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrateOrders();


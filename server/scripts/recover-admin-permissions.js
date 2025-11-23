/**
 * EMERGENCY ADMIN PERMISSIONS RECOVERY SCRIPT
 * 
 * Use this script if you've accidentally locked yourself out by disabling admin permissions.
 * 
 * Usage:
 *   node scripts/recover-admin-permissions.js
 * 
 * This script will restore all admin permissions to their default values.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ConnectDb = require('../configs/db');
const RolePermission = require('../models/RolePermissionModel');
const { defaultPermissions, initializeRBAC } = require('../utils/rbac');

async function recoverAdminPermissions() {
  try {
    console.log('🔧 Starting admin permissions recovery...\n');
    
    // Connect to database
    await ConnectDb();
    console.log('✅ Connected to database\n');
    
    // Build admin permissions from default
    const adminPerms = Object.entries(defaultPermissions.admin)
      .filter(([resource, actions]) => actions && actions.length > 0)
      .map(([resource, actions]) => ({
        resource,
        actions
      }));

    console.log('📋 Restoring admin permissions:');
    adminPerms.forEach(perm => {
      console.log(`   - ${perm.resource}: [${perm.actions.join(', ')}]`);
    });
    console.log('');

    // Update or create admin permissions
    const existingAdmin = await RolePermission.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      existingAdmin.permissions = adminPerms;
      existingAdmin.isActive = true;
      existingAdmin.updatedAt = new Date();
      await existingAdmin.save();
      console.log('✅ Updated existing admin permissions\n');
    } else {
      await RolePermission.create({
        role: 'admin',
        permissions: adminPerms,
        description: 'Full system access',
        isActive: true
      });
      console.log('✅ Created new admin permissions\n');
    }

    // Reinitialize RBAC
    console.log('🔄 Reinitializing RBAC...');
    await initializeRBAC();
    console.log('✅ RBAC reinitialized successfully\n');

    console.log('🎉 Admin permissions recovered successfully!');
    console.log('📝 Please refresh your browser and log in again.\n');
    
  } catch (error) {
    console.error('❌ Error recovering admin permissions:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
    process.exit(0);
  }
}

// Run the recovery
recoverAdminPermissions();


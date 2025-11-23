const RolePermission = require('../models/RolePermissionModel');
const { 
  getRolePermissions, 
  updateRolePermissions, 
  getAvailableResources, 
  initializeRBAC,
  defaultPermissions
} = require('../utils/rbac');

class RBACController {
  // Get all role permissions
  static async getAllRolePermissions(req, res) {
    try {
      const rolePermissions = await RolePermission.find({ isActive: true })
        .populate('updatedBy', 'username email')
        .sort({ role: 1 });

      res.status(200).json({
        success: true,
        data: rolePermissions,
        count: rolePermissions.length
      });
    } catch (error) {
      console.error('Get all role permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get permissions for a specific role
  static async getRolePermission(req, res) {
    try {
      const { role } = req.params;

      if (!['admin', 'staff'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be admin or staff.'
        });
      }

      const rolePermission = await RolePermission.findOne({ role, isActive: true })
        .populate('updatedBy', 'username email');

      if (!rolePermission) {
        // Return default permissions if not found
        const permissions = Object.entries(defaultPermissions[role] || {}).map(([resource, actions]) => ({
          resource,
          actions
        }));

        return res.status(200).json({
          success: true,
          data: {
            role,
            permissions,
            description: role === 'admin' ? 'Full system access' : 'Limited access for staff members',
            isActive: true
          }
        });
      }

      res.status(200).json({
        success: true,
        data: rolePermission
      });
    } catch (error) {
      console.error('Get role permission error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get permissions for the currently authenticated user
  static async getMyPermissions(req, res) {
    try {
      const role = req.user?.role;

      if (!role) {
        return res.status(400).json({
          success: false,
          message: 'Unable to determine user role'
        });
      }

      let permissions = await getRolePermissions(role);

      if (!permissions || permissions.length === 0) {
        const fallback = defaultPermissions[role] || {};
        permissions = Object.entries(fallback).map(([resource, actions]) => ({
          resource,
          actions
        }));
      }

      res.status(200).json({
        success: true,
        data: {
          role,
          permissions
        }
      });
    } catch (error) {
      console.error('Get my permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load permissions'
      });
    }
  }

  // Update permissions for a role
  static async updateRolePermission(req, res) {
    try {
      const { role } = req.params;
      const { permissions, description } = req.body;

      if (!['admin', 'staff'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be admin or staff.'
        });
      }

      // Only admin can update permissions
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only admin can update permissions.'
        });
      }

      // Validate permissions structure
      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          message: 'Permissions must be an array'
        });
      }

      // Filter out empty permissions and validate
      const validPermissions = [];
      const availableResources = getAvailableResources();
      
      for (const perm of permissions) {
        // Skip if no resource or actions
        if (!perm.resource || !Array.isArray(perm.actions) || perm.actions.length === 0) {
          continue; // Skip empty permissions
        }

        if (!availableResources[perm.resource]) {
          return res.status(400).json({
            success: false,
            message: `Invalid resource: ${perm.resource}`
          });
        }

        // Validate and filter actions
        const validActions = availableResources[perm.resource];
        const filteredActions = perm.actions.filter(action => {
          if (!validActions.includes(action)) {
            console.warn(`Invalid action ${action} for resource ${perm.resource}, skipping`);
            return false;
          }
          return true;
        });

        // Only add permission if it has valid actions
        if (filteredActions.length > 0) {
          validPermissions.push({
            resource: perm.resource,
            actions: filteredActions
          });
        }
      }

      // Update permissions (use validated permissions)
      try {
        const updatedRolePermission = await updateRolePermissions(
          role,
          validPermissions,
          req.user._id
        );

        res.status(200).json({
          success: true,
          message: 'Role permissions updated successfully',
          data: updatedRolePermission
        });
      } catch (rbacError) {
        // If RBAC initialization fails, try to still save the permissions
        // but log the error
        console.error('RBAC initialization error after update:', rbacError);
        
        // Try to save permissions directly without reinitializing
        const rolePermission = await RolePermission.findOneAndUpdate(
          { role },
          {
            permissions: validPermissions,
            updatedBy: req.user._id,
            updatedAt: new Date()
          },
          { upsert: true, new: true }
        );

        res.status(200).json({
          success: true,
          message: 'Role permissions updated successfully (RBAC cache may need refresh)',
          data: rolePermission,
          warning: 'RBAC cache initialization failed. Please refresh or restart server.'
        });
      }
    } catch (error) {
      console.error('Update role permission error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get available resources and actions
  static async getAvailableResources(req, res) {
    try {
      const resources = getAvailableResources();

      res.status(200).json({
        success: true,
        data: resources
      });
    } catch (error) {
      console.error('Get available resources error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Reset role permissions to default
  static async resetRolePermission(req, res) {
    try {
      const { role } = req.params;

      if (!['admin', 'staff'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be admin or staff.'
        });
      }

      // Only admin can reset permissions
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only admin can reset permissions.'
        });
      }

      const { defaultPermissions } = require('../utils/rbac');
      const permissions = Object.entries(defaultPermissions[role] || {}).map(([resource, actions]) => ({
        resource,
        actions
      }));

      const updatedRolePermission = await updateRolePermissions(
        role,
        permissions,
        req.user._id
      );

      res.status(200).json({
        success: true,
        message: 'Role permissions reset to default successfully',
        data: updatedRolePermission
      });
    } catch (error) {
      console.error('Reset role permission error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Initialize RBAC (reload permissions)
  // EMERGENCY RECOVERY: Restore admin permissions (bypasses all RBAC checks)
  static async emergencyRecoverAdmin(req, res) {
    try {
      const { secretKey } = req.body;
      
      // Simple secret key check (you can change this in production)
      // In production, use environment variable: process.env.EMERGENCY_RECOVERY_KEY
      const validKey = process.env.EMERGENCY_RECOVERY_KEY || 'EMERGENCY_ADMIN_RECOVERY_2024';
      
      if (secretKey !== validKey) {
        return res.status(401).json({
          success: false,
          message: 'Invalid recovery key'
        });
      }

      const { defaultPermissions, createDefaultPermissions, updateRolePermissions } = require('../utils/rbac');
      
      // Build admin permissions from default
      const adminPerms = Object.entries(defaultPermissions.admin)
        .filter(([resource, actions]) => actions && actions.length > 0)
        .map(([resource, actions]) => ({
          resource,
          actions
        }));

      // Update or create admin permissions
      const existingAdmin = await RolePermission.findOne({ role: 'admin' });
      
      if (existingAdmin) {
        existingAdmin.permissions = adminPerms;
        existingAdmin.isActive = true;
        existingAdmin.updatedAt = new Date();
        await existingAdmin.save();
      } else {
        await RolePermission.create({
          role: 'admin',
          permissions: adminPerms,
          description: 'Full system access',
          isActive: true
        });
      }

      // Reinitialize RBAC
      const { initializeRBAC } = require('../utils/rbac');
      await initializeRBAC();

      res.status(200).json({
        success: true,
        message: 'Admin permissions restored successfully! Please refresh your browser.',
        data: {
          role: 'admin',
          permissions: adminPerms
        }
      });
    } catch (error) {
      console.error('Emergency recovery error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restore admin permissions',
        error: error.message
      });
    }
  }

  static async initializeRBAC(req, res) {
    try {
      // Only admin can initialize RBAC
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only admin can initialize RBAC.'
        });
      }

      await initializeRBAC();

      res.status(200).json({
        success: true,
        message: 'RBAC initialized successfully'
      });
    } catch (error) {
      console.error('Initialize RBAC error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = RBACController;


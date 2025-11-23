const AccessControl = require('accesscontrol');
const RolePermission = require('../models/RolePermissionModel');

// Initialize AccessControl
let ac = new AccessControl();

// Clear and reset AccessControl instance
function resetAC() {
  ac = new AccessControl();
}

// Default permissions structure
const defaultPermissions = {
  admin: {
    orders: ['create', 'read', 'update', 'delete', 'archive', 'unarchive', 'export'],
    customers: ['create', 'read', 'update', 'delete', 'archive', 'unarchive', 'export'],
    services: ['create', 'read', 'update', 'delete', 'archive', 'unarchive', 'export'],
    discounts: ['create', 'read', 'update', 'delete', 'archive', 'unarchive', 'export', 'reset'],
    expenses: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'archive', 'unarchive', 'export'],
    employees: ['create', 'read', 'update', 'delete', 'archive', 'unarchive', 'toggle-account', 'export'],
    stations: ['create', 'read', 'update', 'delete', 'archive', 'unarchive', 'export'],
    reports: ['read', 'export', 'generate'],
    dashboard: ['read'],
    backups: ['create', 'read', 'restore', 'delete', 'cleanup'],
    auditLogs: ['read', 'export'],
    rbac: ['read', 'update'],
    settings: ['read', 'update']
  },
  staff: {
    orders: ['create', 'read', 'update'],
    customers: ['create', 'read', 'update'],
    services: ['read'],
    discounts: ['read'],
    expenses: ['create', 'read', 'update'],
    employees: ['read'],
    stations: ['read'],
    reports: ['read', 'export', 'generate'],
    dashboard: ['read'],
    backups: [],
    auditLogs: [],
    rbac: [],
    settings: []
  }
};

// Load permissions from database and initialize AccessControl
async function initializeRBAC() {
  try {
    // Get permissions from database
    const rolePermissions = await RolePermission.find({ isActive: true });
    
    // If no permissions exist, create default ones
    if (rolePermissions.length === 0) {
      await createDefaultPermissions();
      return initializeRBAC(); // Recursively call to load the newly created permissions
    }

    // Build grants structure from database permissions
    const grants = {};
    
    rolePermissions.forEach(rp => {
      if (!grants[rp.role]) {
        grants[rp.role] = {};
      }
      
      // Only process permissions that have actions
      rp.permissions.forEach(perm => {
        if (perm.actions && perm.actions.length > 0) {
          grants[rp.role][perm.resource] = perm.actions;
        }
      });
    });

    // Validate grants structure before setting
    if (Object.keys(grants).length === 0) {
      console.warn('No valid grants found, using default permissions');
      resetAC();
      buildGrantsUsingAPI(defaultPermissions);
    } else {
      // Reset and build grants using API method
      resetAC();
      buildGrantsUsingAPI(grants);
    }
    
    console.log('RBAC initialized successfully');
    return ac;
  } catch (error) {
    console.error('Error initializing RBAC:', error);
    // Fallback to default permissions
    try {
      resetAC();
      buildGrantsUsingAPI(defaultPermissions);
    } catch (fallbackError) {
      console.error('Error setting fallback grants:', fallbackError);
      // If even fallback fails, create a minimal working grants structure
      resetAC();
      ac.grant('admin').createAny('orders', ['*']).readAny('orders', ['*']);
      ac.grant('staff').readAny('orders', ['*']);
    }
    return ac;
  }
}

// Build grants using AccessControl API (more reliable)
function buildGrantsUsingAPI(permissionsData) {
  Object.entries(permissionsData).forEach(([role, resources]) => {
    const roleGrant = ac.grant(role);
    
    Object.entries(resources).forEach(([resource, actions]) => {
      if (actions && actions.length > 0) {
        actions.forEach(action => {
          try {
            // Map actions to accesscontrol methods
            // create -> createAny, read -> readAny, update -> updateAny, delete -> deleteAny
            // For custom actions, we'll use createAny as a fallback
            const actionMap = {
              'create': 'createAny',
              'read': 'readAny',
              'update': 'updateAny',
              'delete': 'deleteAny',
              'archive': 'updateAny',
              'unarchive': 'updateAny',
              'export': 'readAny',
              'approve': 'updateAny',
              'reject': 'updateAny',
              'reset': 'updateAny',
              'toggle-account': 'updateAny',
              'generate': 'readAny',
              'restore': 'createAny',
              'cleanup': 'deleteAny'
            };
            
            const acAction = actionMap[action] || 'readAny';
            roleGrant[acAction](resource, ['*']);
          } catch (err) {
            console.warn(`Failed to grant ${action} on ${resource} for ${role}:`, err.message);
          }
        });
      }
    });
  });
}

// Build grants object from default permissions (for reference, but we use API method)
function buildGrantsFromDefault() {
  return defaultPermissions;
}

// Create default permissions in database
async function createDefaultPermissions() {
  try {
    // Filter out resources with empty actions arrays
    const adminPerms = Object.entries(defaultPermissions.admin)
      .filter(([resource, actions]) => actions && actions.length > 0)
      .map(([resource, actions]) => ({
        resource,
        actions
      }));

    const staffPerms = Object.entries(defaultPermissions.staff)
      .filter(([resource, actions]) => actions && actions.length > 0)
      .map(([resource, actions]) => ({
        resource,
        actions
      }));

    await RolePermission.insertMany([
      {
        role: 'admin',
        permissions: adminPerms,
        description: 'Full system access',
        isActive: true
      },
      {
        role: 'staff',
        permissions: staffPerms,
        description: 'Limited access for staff members',
        isActive: true
      }
    ]);

    console.log('Default permissions created');
  } catch (error) {
    console.error('Error creating default permissions:', error);
    throw error;
  }
}

// Get AccessControl instance
function getAC() {
  return ac;
}

// Check permission
function checkPermission(role, resource, action) {
  try {
    // Map actions to accesscontrol methods
    const actionMap = {
      'create': 'createAny',
      'read': 'readAny',
      'update': 'updateAny',
      'delete': 'deleteAny',
      'archive': 'updateAny',
      'unarchive': 'updateAny',
      'export': 'readAny',
      'approve': 'updateAny',
      'reject': 'updateAny',
      'reset': 'updateAny',
      'toggle-account': 'updateAny',
      'generate': 'readAny',
      'restore': 'createAny',
      'cleanup': 'deleteAny'
    };
    
    const acAction = actionMap[action] || 'readAny';
    const permission = ac.can(role)[acAction](resource);
    return permission ? permission.granted : false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

// Get all permissions for a role
async function getRolePermissions(role) {
  try {
    const rolePermission = await RolePermission.findOne({ role, isActive: true });
    return rolePermission ? rolePermission.permissions : [];
  } catch (error) {
    console.error('Error getting role permissions:', error);
    return [];
  }
}

// Update role permissions
async function updateRolePermissions(role, permissions, updatedBy) {
  try {
    // Filter out permissions with empty actions array
    const validPermissions = permissions.filter(perm => 
      perm.actions && Array.isArray(perm.actions) && perm.actions.length > 0
    );

    const rolePermission = await RolePermission.findOneAndUpdate(
      { role },
      {
        permissions: validPermissions,
        updatedBy,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Reinitialize RBAC after update
    try {
      await initializeRBAC();
    } catch (initError) {
      console.error('Error reinitializing RBAC after update:', initError);
      // Don't throw - permissions are saved, just cache needs refresh
      // The next server restart or manual initialization will fix it
    }
    
    return rolePermission;
  } catch (error) {
    console.error('Error updating role permissions:', error);
    throw error;
  }
}

// Get all available resources and actions
function getAvailableResources() {
  return {
    orders: ['create', 'read', 'update', 'delete', 'archive', 'unarchive', 'export'],
    customers: ['create', 'read', 'update', 'delete', 'archive', 'unarchive', 'export'],
    services: ['create', 'read', 'update', 'delete', 'archive', 'unarchive', 'export'],
    discounts: ['create', 'read', 'update', 'delete', 'archive', 'unarchive', 'export', 'reset'],
    expenses: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'archive', 'unarchive', 'export'],
    employees: ['create', 'read', 'update', 'delete', 'archive', 'unarchive', 'toggle-account', 'export'],
    stations: ['create', 'read', 'update', 'delete', 'archive', 'unarchive', 'export'],
    reports: ['read', 'export', 'generate'],
    dashboard: ['read'],
    backups: ['create', 'read', 'restore', 'delete', 'cleanup'],
    auditLogs: ['read', 'export'],
    rbac: ['read', 'update'],
    settings: ['read', 'update']
  };
}

module.exports = {
  initializeRBAC,
  getAC,
  checkPermission,
  getRolePermissions,
  updateRolePermissions,
  getAvailableResources,
  defaultPermissions
};


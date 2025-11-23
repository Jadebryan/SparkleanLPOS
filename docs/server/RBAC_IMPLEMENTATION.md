# RBAC (Role-Based Access Control) Implementation

## Overview

This system implements a comprehensive Role-Based Access Control (RBAC) system using the `accesscontrol` library. It allows administrators to manage fine-grained permissions for different user roles (admin and staff).

## Features

- ✅ Fine-grained permission management per resource and action
- ✅ Visual checklist interface for managing permissions
- ✅ Default permissions for admin and staff roles
- ✅ Permission checking middleware
- ✅ Database-backed permission storage
- ✅ Real-time permission updates

## Architecture

### Components

1. **RolePermissionModel** (`models/RolePermissionModel.js`)
   - Stores role permissions in MongoDB
   - Tracks who updated permissions and when

2. **RBAC Utils** (`utils/rbac.js`)
   - Initializes AccessControl library
   - Loads permissions from database
   - Provides helper functions for permission checking

3. **RBAC Middleware** (`middleware/rbac.js`)
   - `requirePermission(resource, action)` - Check single permission
   - `requireAnyPermission([...])` - Check if user has any of the permissions
   - `requireAllPermissions([...])` - Check if user has all permissions

4. **RBAC Controller** (`controllers/RBACController.js`)
   - Handles CRUD operations for role permissions
   - Validates permission structures
   - Provides endpoints for frontend

5. **RBAC Routes** (`routes/RBACRoutes.js`)
   - RESTful API endpoints for RBAC management
   - Protected by admin-only authorization

## Available Resources and Actions

### Resources:
- `orders` - Order management
- `customers` - Customer management
- `services` - Service management
- `discounts` - Discount management
- `expenses` - Expense management
- `employees` - Employee management
- `stations` - Station/branch management
- `reports` - Report generation
- `dashboard` - Dashboard access
- `backups` - Backup management
- `auditLogs` - Audit log access
- `rbac` - RBAC management
- `settings` - Settings management

### Actions:
- `create` - Create new records
- `read` - View records
- `update` - Modify records
- `delete` - Delete records
- `archive` - Archive records
- `unarchive` - Unarchive records
- `export` - Export data
- `approve` - Approve requests (expenses)
- `reject` - Reject requests (expenses)
- `reset` - Reset usage (discounts)
- `toggle-account` - Toggle account status (employees)
- `generate` - Generate reports
- `restore` - Restore backups
- `cleanup` - Cleanup backups

## Default Permissions

### Admin Role
- Full access to all resources and actions

### Staff Role
- Limited access:
  - Orders: create, read, update
  - Customers: create, read, update
  - Services: read only
  - Discounts: read only
  - Expenses: create, read, update
  - Employees: read only
  - Stations: read only
  - Reports: read, export, generate
  - Dashboard: read only

## Usage Examples

### Using RBAC Middleware in Routes

```javascript
const { requirePermission } = require('../middleware/rbac');

// Single permission check
router.post('/orders', 
  authenticate, 
  requirePermission('orders', 'create'), 
  OrderController.createOrder
);

// Multiple permission checks (any)
router.get('/reports', 
  authenticate, 
  requireAnyPermission([
    { resource: 'reports', action: 'read' },
    { resource: 'reports', action: 'export' }
  ]), 
  ReportController.getReports
);

// Multiple permission checks (all)
router.delete('/orders/:id', 
  authenticate, 
  requireAllPermissions([
    { resource: 'orders', action: 'delete' },
    { resource: 'orders', action: 'read' }
  ]), 
  OrderController.deleteOrder
);
```

### Checking Permissions in Controllers

```javascript
const { checkPermission } = require('../utils/rbac');

// In controller
if (!checkPermission(req.user.role, 'orders', 'delete')) {
  return res.status(403).json({
    success: false,
    message: 'Permission denied'
  });
}
```

## API Endpoints

### Get All Role Permissions
```
GET /api/rbac
Authorization: Bearer <admin_token>
```

### Get Role Permission
```
GET /api/rbac/:role
Authorization: Bearer <admin_token>
```

### Update Role Permission
```
PUT /api/rbac/:role
Authorization: Bearer <admin_token>
Body: {
  permissions: [
    { resource: 'orders', actions: ['create', 'read', 'update'] }
  ]
}
```

### Reset Role Permission
```
PUT /api/rbac/:role/reset
Authorization: Bearer <admin_token>
```

### Get Available Resources
```
GET /api/rbac/resources
Authorization: Bearer <token>
```

### Initialize RBAC
```
POST /api/rbac/initialize
Authorization: Bearer <admin_token>
```

## Frontend Access

The RBAC management page is available at `/rbac` in the admin panel. Only users with the `admin` role can access this page.

## Initialization

RBAC is automatically initialized when the server starts. If no permissions exist in the database, default permissions are created automatically.

## Security Notes

- Only admin users can modify RBAC permissions
- Permission changes take effect immediately
- All permission checks are performed server-side
- Frontend UI respects permissions but should not be trusted for security


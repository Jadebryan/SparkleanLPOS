# 🔓 Emergency Admin Recovery Guide

If you've accidentally locked yourself out by disabling admin permissions, use one of these methods to recover:

## Method 1: Web Interface (Easiest)

1. Make sure your server is running
2. Open your browser and go to:
   ```
   http://localhost:3000/emergency-recovery.html
   ```
   (Replace `localhost:3000` with your server URL if different)

3. Enter the recovery key: `EMERGENCY_ADMIN_RECOVERY_2024`
4. Click "Recover Admin Permissions"
5. Refresh your browser and log in again

## Method 2: API Endpoint

You can use curl, Postman, or any HTTP client:

```bash
curl -X POST http://localhost:3000/api/rbac/emergency-recover-admin \
  -H "Content-Type: application/json" \
  -d '{"secretKey": "EMERGENCY_ADMIN_RECOVERY_2024"}'
```

## Method 3: Node.js Script (Most Reliable)

Run this script directly from the server directory:

```bash
cd server
node scripts/recover-admin-permissions.js
```

This script will:
- Connect to your database
- Restore all admin permissions to default values
- Reinitialize the RBAC system
- Close the connection automatically

## Method 4: Direct Database Access

If you have MongoDB access, you can manually update the permissions:

1. Connect to your MongoDB database
2. Find the `rolepermissions` collection
3. Update the admin role document:

```javascript
db.rolepermissions.updateOne(
  { role: "admin" },
  {
    $set: {
      permissions: [
        { resource: "orders", actions: ["create", "read", "update", "delete", "archive", "unarchive", "export"] },
        { resource: "customers", actions: ["create", "read", "update", "delete", "archive", "unarchive", "export"] },
        { resource: "services", actions: ["create", "read", "update", "delete", "archive", "unarchive", "export"] },
        { resource: "discounts", actions: ["create", "read", "update", "delete", "archive", "unarchive", "export", "reset"] },
        { resource: "expenses", actions: ["create", "read", "update", "delete", "approve", "reject", "archive", "unarchive", "export"] },
        { resource: "employees", actions: ["create", "read", "update", "delete", "archive", "unarchive", "toggle-account", "export"] },
        { resource: "stations", actions: ["create", "read", "update", "delete", "archive", "unarchive", "export"] },
        { resource: "reports", actions: ["read", "export", "generate"] },
        { resource: "dashboard", actions: ["read"] },
        { resource: "backups", actions: ["create", "read", "restore", "delete", "cleanup"] },
        { resource: "auditLogs", actions: ["read", "export"] },
        { resource: "rbac", actions: ["read", "update"] },
        { resource: "settings", actions: ["read", "update"] }
      ],
      isActive: true,
      updatedAt: new Date()
    }
  },
  { upsert: true }
)
```

4. Restart your server to reinitialize RBAC

## Security Note

⚠️ **Important**: The default recovery key is `EMERGENCY_ADMIN_RECOVERY_2024`. 

For production environments, set a custom key using an environment variable:

```bash
# In your .env file or environment
EMERGENCY_RECOVERY_KEY=your-secret-recovery-key-here
```

Then restart your server. The recovery endpoint will use this custom key instead.

## What Gets Restored?

The recovery process restores all admin permissions to their default values:

- **Orders**: create, read, update, delete, archive, unarchive, export
- **Customers**: create, read, update, delete, archive, unarchive, export
- **Services**: create, read, update, delete, archive, unarchive, export
- **Discounts**: create, read, update, delete, archive, unarchive, export, reset
- **Expenses**: create, read, update, delete, approve, reject, archive, unarchive, export
- **Employees**: create, read, update, delete, archive, unarchive, toggle-account, export
- **Stations**: create, read, update, delete, archive, unarchive, export
- **Reports**: read, export, generate
- **Dashboard**: read
- **Backups**: create, read, restore, delete, cleanup
- **Audit Logs**: read, export
- **RBAC**: read, update
- **Settings**: read, update

## After Recovery

1. Log out and log back in (or refresh your browser)
2. You should now have full admin access
3. Go to the RBAC management page to review and adjust permissions as needed
4. Consider setting up a backup admin account or documenting the recovery process for your team


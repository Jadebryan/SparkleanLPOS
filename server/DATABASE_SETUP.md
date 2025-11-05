# MongoDB Database Setup Guide

## Overview
This system uses MongoDB with role-based access control (RBAC). Both admin and staff users share the same database, but have different permissions.

## Setup Instructions

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Create Environment File
Create a `.env` file in the `server` directory with the following:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/PracLaundry

# JWT Secret Key (generate a strong random string for production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRE=7d

# Server Port
PORT=5000

# Node Environment
NODE_ENV=development
```

### 3. Start MongoDB
Make sure MongoDB is running on your system:
```bash
# Windows (if installed as service, it should start automatically)
# Or start manually:
mongod

# Mac/Linux
sudo systemctl start mongod
# or
brew services start mongodb-community
```

### 4. Start the Server
```bash
npm run dev
```

The server will start on `http://localhost:5000`

## Database Collections

The database will automatically create these collections:
- `users` - Admin and staff accounts
- `orders` - All orders (shared)
- `customers` - Customer information (shared)
- `services` - Laundry services (shared)
- `expenses` - Expense requests (staff see only their own, admin sees all)
- `employees` - Employee records (admin only)
- `discounts` - Discount codes (shared, but only admin can manage)

## Role-Based Permissions

### Admin Role
- ✅ Full CRUD access to all entities
- ✅ Can create/update/delete employees
- ✅ Can approve/reject expenses
- ✅ Can archive/unarchive any record
- ✅ Can manage all services, discounts, and customers
- ✅ Can view all orders and expenses
- ✅ Can manage user accounts

### Staff Role
- ✅ Can create orders and customers
- ✅ Can view active services and discounts
- ✅ Can view customers
- ✅ Can create expense requests
- ✅ Can view only their own orders and expenses
- ❌ Cannot delete important records
- ❌ Cannot manage employees
- ❌ Cannot approve expenses
- ❌ Cannot archive records
- ❌ Cannot manage services/discounts

## API Endpoints

All endpoints require authentication (JWT token in header) except:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/health` - Health check

### Authentication
Add token to request headers:
```
Authorization: Bearer <your-jwt-token>
```

### Example API Calls

**Login:**
```bash
POST /api/auth/login
Body: {
  "email": "admin@example.com",
  "password": "password123"
}
Response: {
  "success": true,
  "data": {
    "id": "...",
    "username": "admin",
    "role": "admin",
    "token": "eyJhbGc..."
  }
}
```

**Get Orders (with token):**
```bash
GET /api/orders
Headers: {
  "Authorization": "Bearer <token>"
}
```

## Data Sharing

✅ **YES** - All data is stored in the same database
- Orders created by staff are visible to admin
- Customers added by staff are available to admin
- Admin can view and manage all records

✅ **Security** - Permissions are enforced at the API level
- Staff can only see their own orders/expenses
- Staff cannot access admin-only endpoints
- Role checks happen on every request

## Testing

1. Register an admin user:
```bash
POST /api/auth/register
{
  "email": "admin@test.com",
  "username": "admin",
  "password": "admin123",
  "role": "admin"
}
```

2. Register a staff user:
```bash
POST /api/auth/register
{
  "email": "staff@test.com",
  "username": "staff",
  "password": "staff123",
  "role": "staff"
}
```

3. Login and use the returned token for authenticated requests.

## Production Recommendations

1. **Change JWT_SECRET** to a strong random string (32+ characters)
2. **Use MongoDB Atlas** or secure MongoDB instance
3. **Enable MongoDB authentication**
4. **Use environment variables** for all sensitive data
5. **Enable HTTPS** for API requests
6. **Implement rate limiting**
7. **Add request logging**


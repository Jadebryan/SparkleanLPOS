# API Routes Documentation

All routes (except auth/login and auth/register) require authentication via JWT token.

## Authentication Routes (`/api/auth`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/register` | ❌ | - | Register new user |
| POST | `/login` | ❌ | - | Login user (returns JWT token) |
| GET | `/me` | ✅ | Both | Get current user profile |
| PUT | `/me` | ✅ | Both | Update current user profile |
| PUT | `/change-password` | ✅ | Both | Change password |
| GET | `/profile/:userId` | ✅ | Both | Get user profile by ID |
| GET | `/users` | ✅ | Admin | Get all users |
| PUT | `/deactivate/:userId` | ✅ | Admin | Deactivate user |
| PUT | `/activate/:userId` | ✅ | Admin | Activate user |

## Order Routes (`/api/orders`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | ✅ | Both | Get all orders (staff: own only) |
| GET | `/:id` | ✅ | Both | Get single order |
| POST | `/` | ✅ | Both | Create new order |
| PUT | `/:id` | ✅ | Both | Update order (staff: own only) |
| PUT | `/:id/archive` | ✅ | Admin | Archive order |
| PUT | `/:id/unarchive` | ✅ | Admin | Unarchive order |
| DELETE | `/:id` | ✅ | Admin | Delete order permanently |

## Customer Routes (`/api/customers`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | ✅ | Both | Get all customers |
| GET | `/:id` | ✅ | Both | Get single customer |
| POST | `/` | ✅ | Both | Create customer |
| PUT | `/:id` | ✅ | Both | Update customer |
| PUT | `/:id/archive` | ✅ | Admin | Archive customer |
| PUT | `/:id/unarchive` | ✅ | Admin | Unarchive customer |
| DELETE | `/:id` | ✅ | Admin | Delete customer permanently |

## Service Routes (`/api/services`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | ✅ | Both | Get all services |
| GET | `/:id` | ✅ | Both | Get single service |
| POST | `/` | ✅ | Admin | Create service |
| PUT | `/:id` | ✅ | Admin | Update service |
| PUT | `/:id/archive` | ✅ | Admin | Archive service |
| PUT | `/:id/unarchive` | ✅ | Admin | Unarchive service |

## Expense Routes (`/api/expenses`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | ✅ | Both | Get expenses (staff: own only) |
| GET | `/:id` | ✅ | Both | Get single expense |
| POST | `/` | ✅ | Both | Create expense request |
| PUT | `/:id` | ✅ | Both | Update expense (only if pending) |
| PUT | `/:id/approve` | ✅ | Admin | Approve expense |
| PUT | `/:id/reject` | ✅ | Admin | Reject expense |
| PUT | `/:id/archive` | ✅ | Admin | Archive expense |
| PUT | `/:id/unarchive` | ✅ | Admin | Unarchive expense |

## Employee Routes (`/api/employees`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | ✅ | Admin | Get all employees |
| GET | `/:id` | ✅ | Admin | Get single employee |
| POST | `/` | ✅ | Admin | Create employee |
| PUT | `/:id` | ✅ | Admin | Update employee |
| PUT | `/:id/archive` | ✅ | Admin | Archive employee |
| PUT | `/:id/unarchive` | ✅ | Admin | Unarchive employee |

## Discount Routes (`/api/discounts`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | ✅ | Both | Get all discounts |
| GET | `/:id` | ✅ | Both | Get single discount |
| POST | `/` | ✅ | Admin | Create discount |
| PUT | `/:id` | ✅ | Admin | Update discount |
| PUT | `/:id/archive` | ✅ | Admin | Archive discount |
| PUT | `/:id/unarchive` | ✅ | Admin | Unarchive discount |

## Query Parameters

### Common Query Parameters:
- `search` - Search term for filtering
- `showArchived` - `true` or `false` (default: `false`)
- `sortBy` - Sort field and direction (varies by endpoint)

### Examples:
```
GET /api/customers?search=john&showArchived=false&sortBy=name-asc
GET /api/orders?payment=Paid&showArchived=false
GET /api/expenses?category=Supplies&status=Pending
```

## Response Format

### Success Response:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "count": 10  // For list endpoints
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Validation error 1", "Validation error 2"]  // Optional
}
```


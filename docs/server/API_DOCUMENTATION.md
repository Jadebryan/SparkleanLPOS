# Laundry POS - Authentication API Documentation

## Overview
This document describes the authentication API endpoints for the Laundry POS system.

## Base URL
```
http://localhost:5000/api/auth
```

## Authentication Endpoints

### 1. User Registration
**POST** `/register`

Register a new user in the system.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "role": "staff" // optional, defaults to "staff"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "role": "staff",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (Error - 409):**
```json
{
  "success": false,
  "message": "Email already registered"
}
```

### 2. User Login
**POST** `/login`

Authenticate a user and return user information.

**Request Body:**
```json
{
  "email": "user@example.com", // or username
  "username": "username", // optional if email is provided
  "password": "password123",
  "recaptchaToken": "recaptcha_token" // optional
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "role": "admin",
    "lastLogin": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### 3. Get User Profile
**GET** `/profile/:userId`

Get user profile information.

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "role": "admin",
    "isActive": true,
    "lastLogin": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Update User Profile
**PUT** `/profile/:userId`

Update user profile information.

**Request Body:**
```json
{
  "email": "newemail@example.com", // optional
  "username": "newusername", // optional
  "role": "admin" // optional
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "user_id",
    "email": "newemail@example.com",
    "username": "newusername",
    "role": "admin",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Change Password
**PUT** `/change-password/:userId`

Change user password.

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### 6. Get All Users (Admin Only)
**GET** `/users`

Get list of all active users.

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_id",
      "email": "user@example.com",
      "username": "username",
      "role": "admin",
      "isActive": true,
      "lastLogin": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### 7. Deactivate User (Admin Only)
**PUT** `/deactivate/:userId`

Deactivate a user account.

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "role": "admin",
    "isActive": false,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Error Responses

All endpoints return consistent error responses:

**Validation Error (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Error message 1", "Error message 2"]
}
```

**Not Found (404):**
```json
{
  "success": false,
  "message": "User not found"
}
```

**Internal Server Error (500):**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Security Features

1. **Password Hashing**: All passwords are hashed using bcryptjs with salt rounds of 12
2. **Account Lockout**: Accounts are temporarily locked after 5 failed login attempts for 2 hours
3. **Input Validation**: All inputs are validated on both client and server side
4. **Email Uniqueness**: Email addresses must be unique across the system
5. **Username Uniqueness**: Usernames must be unique across the system

## Default Users

After running the seed script (`npm run seed`), the following default users are created:

### Admin User
- **Email**: admin@labubbles.com
- **Username**: admin
- **Password**: admin123
- **Role**: admin

### Staff User
- **Email**: staff@labubbles.com
- **Username**: staff
- **Password**: staff123
- **Role**: staff

⚠️ **Important**: Change these default passwords after first login!

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Make sure MongoDB is running on `mongodb://localhost:27017/PracLaundry`

3. Seed the database with default users:
   ```bash
   npm run seed
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

## Frontend Integration

To integrate with your React frontend, you can make API calls like this:

```javascript
// Login example
const loginUser = async (email, password) => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        recaptchaToken: 'your_recaptcha_token' // if using reCAPTCHA
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store user data in context/state
      console.log('Login successful:', data.data);
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Login failed:', error.message);
    throw error;
  }
};
```

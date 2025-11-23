# Local Development Setup Guide

## Current Configuration

Your server is configured for **local development** with the following settings:

### ✅ What's Working:
- **NODE_ENV=development** - Correctly set
- **CORS** - Configured to allow all origins (perfect for local dev)
- **HTTPS Redirect** - Only active in production, won't affect local dev
- **Port** - Server runs on `http://localhost:5000` (HTTP, not HTTPS)

### 📋 Environment Variables for Local Development

Your `.env` file should have:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
```

### 🔧 Frontend Configuration

#### Staff App (`LaundryPOS(STAFF)`)
- API URL: `http://localhost:5000/api` (default)
- For device/emulator: Set `EXPO_PUBLIC_API_URL=http://YOUR_IP:5000/api` in `.env`

#### Admin App (`LaundryPos(ADMIN)`)
- API URL: `http://localhost:5000/api` (default)
- Set `VITE_API_URL=http://localhost:5000/api` in `.env` or `.env.local`

### 🚀 Starting the Server

```bash
cd server
npm start
# or for auto-reload:
npm run dev
```

The server will run on: **http://localhost:5000**

### 🧪 Testing the Connection

1. **Health Check:**
   ```
   http://localhost:5000/api/health
   ```
   Should return: `{"success":true,"message":"Server is running"}`

2. **Login Endpoint:**
   ```
   POST http://localhost:5000/api/auth/login
   ```

### ⚠️ Common Local Development Issues

1. **"Cannot connect to backend"**
   - Make sure server is running: `npm start` in `server/` directory
   - Check port 5000 is not in use
   - For devices/emulators, use your computer's IP address, not `localhost`

2. **"Invalid credentials"**
   - Check password using: `node scripts/checkUserPassword.js <email> <password>`
   - Reset password if needed: `node scripts/resetUserPassword.js <email> <newpassword>`

3. **CORS Errors**
   - Shouldn't happen (CORS allows all), but if it does, check `server/index.js` line 36

### 📝 Notes

- **ALLOWED_ORIGINS** in `.env` is for production only - not used in local dev
- **HTTPS** is disabled in development (uses HTTP on port 5000)
- **Database** - Make sure MongoDB connection string is correct
- **JWT_SECRET** - Must be set and consistent

### 🔄 Switching to Production

When ready for production:
1. Set `NODE_ENV=production`
2. Set `ENABLE_HTTPS=true` (if using SSL)
3. Update `ALLOWED_ORIGINS` with your production domains
4. Configure SSL certificates


# Troubleshooting Staff App Login Issues

## Network Error: Cannot Connect to Backend

If you're seeing the error: **"Network error: Failed to fetch. Ensure the backend is running at http://localhost:5000/api"**

### Quick Fixes:

#### 1. **Check if Backend Server is Running**
   - Open a terminal in the `server` directory
   - Run: `npm start` or `npm run dev`
   - You should see: `Server running on http://localhost:5000` or similar

#### 2. **If Using a Physical Device or Emulator**
   - `localhost` won't work! You need your computer's IP address
   - Find your IP address:
     - **Windows**: Open Command Prompt, run `ipconfig`, look for "IPv4 Address"
     - **Mac/Linux**: Open Terminal, run `ifconfig` or `ip addr`, look for your network interface IP
   - Create a `.env` file in `LaundryPOS(STAFF)` directory:
     ```
     EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:5000/api
     ```
     Example: `EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api`
   - Restart your Expo app

#### 3. **If Running on Web Browser**
   - `localhost` should work if the backend is running on the same machine
   - Make sure the backend server is running on port 5000
   - Check: Open `http://localhost:5000/api/health` in your browser
   - You should see: `{"success":true,"message":"Server is running"}`

#### 4. **Check Backend Server Status**
   - Open browser and go to: `http://localhost:5000/api/health`
   - If you see a JSON response, the server is running
   - If you see "Cannot connect", the server is not running

#### 5. **Firewall Issues**
   - Make sure port 5000 is not blocked by your firewall
   - Windows: Check Windows Firewall settings
   - Mac: Check System Preferences > Security & Privacy > Firewall

#### 6. **CORS Issues**
   - The backend should have CORS enabled (it does by default)
   - If you still have issues, check `server/index.js` has `app.use(cors())`

### Setting Up Environment Variable

1. Create `.env` file in `LaundryPOS(STAFF)` directory:
   ```
   EXPO_PUBLIC_API_URL=http://localhost:5000/api
   ```
   Or for device/emulator:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api
   ```

2. Restart Expo:
   ```bash
   # Stop the current Expo server (Ctrl+C)
   # Then restart:
   npm start
   ```

### Testing Connection

You can test the connection by:
1. Opening the browser console (if on web)
2. Running: `fetch('http://localhost:5000/api/health').then(r => r.json()).then(console.log)`
3. If you see a response, the connection works!

### Still Having Issues?

1. Check server logs for errors
2. Verify the server is listening on the correct port
3. Make sure both frontend and backend are on the same network (for device testing)
4. Try accessing the API directly in a browser first


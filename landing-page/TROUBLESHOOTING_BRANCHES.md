# Troubleshooting Branches Not Loading via ngrok

## Issue
When accessing the landing page via ngrok, branches don't load because the API is still pointing to `localhost:5000`.

## Solutions

### Option 1: Set up ngrok for Backend Server (Recommended)

1. **Open a new terminal** and navigate to your server directory:
   ```bash
   cd server
   ```

2. **Start another ngrok tunnel** for your backend (port 5000):
   ```bash
   ngrok http 5000
   ```

3. **Copy the ngrok URL** (e.g., `https://abc123.ngrok-free.dev`)

4. **Update your `.env` file** in `landing-page/`:
   ```env
   VITE_API_URL=https://your-backend-ngrok-url.ngrok-free.dev/api
   ```

5. **Restart your landing page dev server**

### Option 2: Use Relative URLs (If Same Domain)

If both frontend and backend are on the same domain, you can use relative URLs.

### Option 3: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for `[API]` logs
4. Check Network tab for failed requests

## Quick Check

Open browser console and look for:
- `[API] Fetching stations from: ...`
- `[API] Response status: ...`
- Any CORS or network errors


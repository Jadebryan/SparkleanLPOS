# Branch Locations - Automatic Data Fetching

The `Branches.tsx` component **automatically fetches branch data** from your Station Management API. No manual updates needed!

## How It Works:

1. **Automatic Fetching**: The component fetches stations from your API on page load
2. **Filtering**: Only shows active, non-archived stations with valid addresses
3. **Real-time**: Updates automatically when you add/modify stations in the admin panel

## Configuration:

### 1. Set API URL

Create a `.env` file in the `landing-page` directory:

```env
VITE_API_URL=http://localhost:5000/api
```

Or update it in `landing-page/src/utils/api.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
```

### 2. Backend API Requirements

Your backend `/api/stations` endpoint should:
- Accept GET requests
- Return stations in this format:
  ```json
  {
    "data": [
      {
        "stationId": "BRANCH-001",
        "name": "Main Branch",
        "address": "123 Laundry Street, Clean City",
        "phone": "+63 912 345 6789",
        "isActive": true,
        "isArchived": false
      }
    ]
  }
  ```
- Or return a direct array:
  ```json
  [
    {
      "stationId": "BRANCH-001",
      "name": "Main Branch",
      "address": "123 Laundry Street, Clean City",
      "phone": "+63 912 345 6789",
      "isActive": true,
      "isArchived": false
    }
  ]
  ```

### 3. CORS Configuration

If your backend is on a different domain, ensure CORS is enabled:

```javascript
// Example Express.js CORS setup
app.use(cors({
  origin: 'http://localhost:3001', // Your landing page URL
  credentials: true
}))
```

## What Gets Displayed:

- **Station ID**: Displayed as branch ID badge
- **Name**: Branch name as heading
- **Address**: Required - used for Google Maps
- **Phone**: Optional - hidden if not provided

## Features:

- ✅ Automatic data fetching from API
- ✅ Loading state with spinner
- ✅ Error handling with user-friendly messages
- ✅ Empty state when no branches available
- ✅ Google Maps integration for each branch
- ✅ "Open in Google Maps" button for directions
- ✅ Filters out archived/inactive stations
- ✅ Only shows stations with addresses

## Troubleshooting:

### Branches Not Showing?

1. **Check API URL**: Verify `VITE_API_URL` is correct
2. **Check CORS**: Ensure backend allows requests from landing page domain
3. **Check Console**: Open browser DevTools (F12) and check for errors
4. **Verify Stations**: Ensure stations have:
   - `isActive: true`
   - `isArchived: false`
   - Valid `address` field

### API Returns Empty Array?

- Check that stations exist in your database
- Verify stations are not archived
- Ensure stations have addresses filled in
- Check backend logs for errors

## Google Maps Integration:

The component uses Google Maps embed iframes. Make sure:
- Addresses are complete and accurate
- Addresses are in a format Google Maps can understand
- For better accuracy, consider adding latitude/longitude coordinates

## Notes:

- The map will automatically update when you change the address
- Users can click "Open in Google Maps" to get directions
- The iframe uses lazy loading for better performance


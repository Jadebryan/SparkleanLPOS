# Chat Widget Setup Guide

The landing page now includes a customer chat widget similar to Facebook Messenger. You have two options:

## Option 1: Custom Chat Widget (Current Implementation)

The custom chat widget is already implemented and working. It includes:
- ✅ Floating chat button
- ✅ Chat window with messages
- ✅ Auto-reply functionality
- ✅ Minimize/maximize functionality
- ✅ Contact links (phone & email)

### Features:
- **Instant Response**: Auto-replies to customer messages
- **Contact Options**: Quick access to phone and email
- **Responsive**: Works on mobile and desktop
- **Branded**: Matches Sparklean color scheme

### Customization:

Edit `landing-page/src/components/ChatWidget.tsx` to:
- Change auto-reply messages
- Add more bot responses
- Integrate with your backend API
- Add typing indicators
- Add file upload support

## Option 2: Facebook Messenger Integration

To use Facebook Messenger instead of the custom widget:

### Setup Steps:

1. **Get Your Facebook Page ID:**
   - Go to your Facebook Page
   - Click "About" → Find your Page ID
   - Or use: https://www.facebook.com/yourpagename → About section

2. **Update LandingPage.tsx:**

Replace the ChatWidget import:
```typescript
// Remove this:
import ChatWidget from './ChatWidget'

// Add this:
import FacebookMessenger from './FacebookMessenger'
```

And update the component:
```typescript
<FacebookMessenger pageId="YOUR_PAGE_ID" />
```

3. **Configure Facebook Messenger:**

- Go to Facebook Page Settings → Messaging
- Enable "Messenger Platform"
- Set up automated responses
- Configure greeting messages

### Facebook Messenger Features:
- ✅ Real-time messaging
- ✅ Facebook integration
- ✅ Mobile app notifications
- ✅ Page inbox management
- ✅ Automated responses

## Option 3: Hybrid Approach

You can use both! Show custom widget by default, with option to switch to Messenger:

```typescript
const [useMessenger, setUseMessenger] = useState(false)

return (
  <>
    {useMessenger ? (
      <FacebookMessenger pageId="YOUR_PAGE_ID" />
    ) : (
      <ChatWidget />
    )}
  </>
)
```

## Backend Integration (Advanced)

To connect the custom chat widget to your backend:

1. **Create Chat API Endpoint:**
```javascript
// server/routes/ChatRoutes.js
router.post('/chat/message', async (req, res) => {
  const { message, customerInfo } = req.body
  // Save to database
  // Send notification to admin
  // Return response
})
```

2. **Update ChatWidget.tsx:**
```typescript
const handleSend = async () => {
  const response = await fetch(`${API_URL}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: inputValue })
  })
  // Handle response
}
```

## Current Configuration

The chat widget currently:
- Shows "Sparklean Support" as the name
- Auto-replies with contact information
- Includes phone: +63 912 345 6789
- Includes email: info@sparklean.com

To update these, edit `ChatWidget.tsx`:
- Line 10-15: Initial bot message
- Line 40-45: Auto-reply message
- Line 60-65: Contact information

## Styling

Customize colors in `ChatWidget.css`:
- Primary color: `var(--primary-color)` (#2563EB)
- Secondary color: `var(--secondary-color)` (#10b981)
- Adjust sizes, spacing, and animations as needed

## Mobile Responsiveness

The chat widget is fully responsive:
- Desktop: Fixed bottom-right corner
- Mobile: Full-width with proper spacing
- Touch-friendly buttons and inputs


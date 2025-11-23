# Cloudinary Setup Guide

Cloudinary is a cloud-based image and video management service. It's much simpler than Google Drive and perfect for storing images.

## Why Cloudinary?

- ✅ **Free Tier**: 25GB storage, 25GB bandwidth per month
- ✅ **Simple Setup**: Just API keys, no complex permissions
- ✅ **Built for Images**: Optimized for image storage and delivery
- ✅ **No Service Account Issues**: Works with simple API keys
- ✅ **CDN Included**: Fast image delivery worldwide

## Setup Steps

### 1. Create Cloudinary Account

1. Go to https://cloudinary.com/
2. Click **"Sign Up for Free"**
3. Sign up with your email (or use Google/GitHub)
4. Verify your email

### 2. Get Your Credentials

1. After signing up, you'll be taken to the Dashboard
2. You'll see your credentials:
   - **Cloud Name** (e.g., `dxy123abc`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### 3. Add to Environment Variables

Add these to your `server/.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**Important**: Never commit your API secret to version control!

### 4. Restart Server

Restart your server and you should see:
```
✅ Cloudinary service initialized successfully
```

## Testing

After setup, try uploading an image in the staff app. You should see:
- `✅ Uploaded X images to Cloudinary for expense`
- Images will be stored at: `https://res.cloudinary.com/{cloud_name}/image/upload/...`

## Image Organization

All images are stored in the `laundry-pos` folder in your Cloudinary account, making them easy to manage.

## Free Tier Limits

- **Storage**: 25GB
- **Bandwidth**: 25GB/month
- **Transformations**: 25,000/month
- **Uploads**: Unlimited

For most applications, this is more than enough!

## Security

- API Secret is used server-side only (never exposed to clients)
- Images are publicly accessible via URL (for display)
- You can set up signed URLs for private images if needed

## Dashboard

Visit https://cloudinary.com/console to:
- View all uploaded images
- Monitor usage
- Manage settings
- See analytics


# Testing Email Configuration

## Quick Test

To test if your email is configured correctly, you can:

1. **Restart your server** - The server will verify email configuration on startup
2. **Check server logs** - Look for:
   - ✅ `Email service verified and ready` - Configuration is correct
   - ❌ Error messages - Will show what's wrong

## Common Issues

### 1. App Password Has Spaces
**Problem**: Gmail app passwords are shown with spaces but must be used without spaces.
**Solution**: The code now automatically removes spaces, but make sure your .env file has:
```
GMAIL_APP_PASSWORD=soqoceggtorphlhc
```
(No spaces)

### 2. Email Goes to Spam
**Solution**: 
- Check your spam/junk folder
- Add the sender email to contacts
- Gmail might filter it as spam initially

### 3. Authentication Failed
**Check**:
- App Password is correct (16 characters, no spaces)
- 2-Step Verification is enabled on Gmail
- Using App Password, not regular password

### 4. Server Not Restarted
**Solution**: After changing .env file, restart your server:
```bash
npm run dev
```

## Verify Email Sending

When you click "Send Verification Code", check the server console for:
- `📧 Attempting to send email to [email] from [sender]...`
- `✅ Verification email sent successfully to [email]`
- `Message ID: [id]`

If you see errors, they will show what's wrong.

## Test Email Manually

You can also test the email service directly by creating a test endpoint or running a test script.


# Email Configuration Guide

This guide explains how to configure email functionality for the Laundry POS system.

## Option 1: Gmail App Password (Recommended for Quick Setup)

This is the easiest method if you have a Gmail account.

### Steps:

1. **Enable 2-Step Verification** on your Gmail account:
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification" if not already enabled

2. **Generate an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Laundry POS" as the name
   - Click "Generate"
   - Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

3. **Add to `.env` file**:
   ```env
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=abcdefghijklmnop
   EMAIL_FROM=your-email@gmail.com
   ```

## Option 2: SMTP Server (Recommended for Production)

Use this for custom email domains or professional email services.

### For Gmail SMTP:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### For Outlook/Hotmail:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
EMAIL_FROM=your-email@outlook.com
```

### For Custom Email (Hostinger, Namecheap, etc.):
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-email-password
EMAIL_FROM=noreply@yourdomain.com
```

## Option 3: Professional Email Services

### SendGrid:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### Mailgun:
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
EMAIL_FROM=noreply@yourdomain.com
```

### Amazon SES:
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-access-key-id
SMTP_PASS=your-ses-secret-access-key
EMAIL_FROM=noreply@yourdomain.com
```

## Environment Variables

Add these to your `.env` file in the `server` directory:

```env
# Email Configuration
EMAIL_FROM=noreply@labubbles.com

# Option 1: Gmail (easiest)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password

# OR Option 2: SMTP (more flexible)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
```

## Testing Email Configuration

After setting up your email configuration, restart your server. You should see:

- ✅ `Email service is ready` - Email is configured correctly
- ⚠️ `Email transporter not configured` - Need to add email credentials

## Troubleshooting

### Gmail "Less Secure App" Error:
- Use App Password instead of regular password
- Make sure 2-Step Verification is enabled

### Connection Timeout:
- Check firewall settings
- Verify SMTP port (587 for TLS, 465 for SSL)
- Try different ports if one doesn't work

### Authentication Failed:
- Double-check username and password
- For Gmail, make sure you're using App Password, not regular password
- Verify email address is correct

## Security Notes

1. **Never commit `.env` file to git**
2. **Use App Passwords for Gmail** instead of your main password
3. **For production**, use professional email services (SendGrid, Mailgun, SES)
4. **Use environment variables** for all sensitive credentials

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify email credentials are correct
3. Test SMTP settings using an email client first
4. Check if your email provider requires specific ports or SSL/TLS settings


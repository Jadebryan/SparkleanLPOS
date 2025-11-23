# SMS and Email Notification Setup Guide

This guide explains how to configure SMS and Email notifications for order status updates.

## Overview

When an order's status is updated to "In Progress" or "Completed", the system will automatically send:
- **SMS notification** to the customer's phone number
- **Email notification** to the customer's email address

## Email Configuration

Email notifications use the existing email service configuration. See `EMAIL_SETUP.md` for detailed instructions.

### Quick Setup (Gmail)

Add these to your `.env` file:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### SMTP Configuration

Alternatively, you can use any SMTP server:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
EMAIL_FROM=your-email@example.com
```

## SMS Configuration (Twilio)

SMS notifications use Twilio. Follow these steps to set up:

### 1. Create a Twilio Account

1. Go to [https://www.twilio.com](https://www.twilio.com)
2. Sign up for a free account (includes trial credits)
3. Verify your phone number

### 2. Get Your Twilio Credentials

1. Log in to your Twilio Console
2. Go to **Account** → **API Keys & Tokens**
3. Copy your:
   - **Account SID**
   - **Auth Token**
4. **IMPORTANT: Get a Twilio Phone Number**
   - Go to **Phone Numbers** → **Manage** → **Buy a Number** (or use an existing one)
   - **You MUST purchase/own a phone number in Twilio** - you cannot use any random phone number
   - For trial accounts, you may get a free trial number
   - Copy the **full phone number** including country code (format: +1234567890)
   - This is the number that will appear as the sender

### 3. Add to .env File

Add these variables to your `.env` file:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Install Twilio Package

If you haven't already, install the Twilio package:

```bash
npm install twilio
```

### 5. Phone Number Format

The system automatically formats phone numbers:
- If a number starts with `0`, it assumes Philippines (+63)
- If a number has 10 digits, it assumes US/Canada (+1)
- Numbers should ideally include country code (e.g., +639123456789)

## Testing

### Test Email Configuration

The email service will log attempts and results to the console. Check your server logs when updating an order status.

### Test SMS Configuration

1. Update an order status to "In Progress" or "Completed"
2. Check server logs for SMS sending status
3. If Twilio is not configured, SMS will be logged to console (for development)

## Notification Behavior

### When Notifications Are Sent

- **In Progress**: When any order item status changes to "In Progress"
- **Completed**: When any order item status changes to "Completed"

### Notification Content

**SMS Message:**
- **In Progress**: "Your order [ORDER_ID] is now in progress. We've started processing your laundry. Total: [TOTAL]"
- **Completed**: "Great news! Your order [ORDER_ID] is ready for pickup. Total: [TOTAL]. Please visit us to collect your order."

**Email Message:**
- Professional HTML email with order details
- Includes order ID, status, total amount, and pickup date
- Branded with Laundry POS styling

### Requirements

For notifications to be sent:
1. Order must have a linked customer (`customerId`)
2. Customer must have either:
   - Email address (for email notifications)
   - Phone number (for SMS notifications)

### Error Handling

- If email fails, the order update still succeeds (error is logged)
- If SMS fails, the order update still succeeds (error is logged)
- Missing email/phone numbers are logged but don't cause errors

## Troubleshooting

### Email Not Sending

1. Check `.env` file has correct email credentials
2. Verify email service is configured (see `EMAIL_SETUP.md`)
3. Check server logs for specific error messages
4. For Gmail: Ensure 2-Step Verification is enabled and App Password is correct

### SMS Not Sending

1. Check `.env` file has Twilio credentials
2. Verify Twilio package is installed: `npm install twilio`
3. Check server logs for specific error messages
4. Verify Twilio account has credits/balance
5. Ensure phone numbers are in correct format (with country code)

### Phone Number Format Issues

The system tries to auto-format phone numbers, but for best results:
- Use international format: `+[country code][number]`
- Example: `+639123456789` (Philippines)
- Example: `+1234567890` (US/Canada)

## Development Mode

If SMS service is not configured:
- SMS messages will be logged to console instead of being sent
- This allows development/testing without Twilio setup
- Check server logs to see what SMS would have been sent

## Production Recommendations

1. **Email**: Use a dedicated SMTP service or Gmail with App Password
2. **SMS**: Use Twilio with a verified phone number
3. **Monitoring**: Set up logging/monitoring for notification failures
4. **Testing**: Test notifications with real customer data before going live

## Support

For issues or questions:
- Check server logs for detailed error messages
- Verify all environment variables are set correctly
- Ensure services (email/SMS) are properly configured
- Test with a known working phone number/email first


require('dotenv').config();
const nodemailer = require('nodemailer');

// SMS Service using Twilio (or similar service)
// Supports Twilio, Email-to-SMS fallback, or console logging

/**
 * Get email transporter for email-to-SMS
 */
const getEmailTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    const appPassword = process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: appPassword
      }
    });
  }
  
  return null;
};

/**
 * Send SMS via Email-to-SMS gateway (Philippines carriers)
 * @param {string} to - Phone number
 * @param {string} message - SMS message
 * @returns {Promise<{success: boolean, method: string}>}
 */
const sendSMSViaEmail = async (to, message) => {
  try {
    const transporter = getEmailTransporter();
    if (!transporter) {
      return { success: false, error: 'Email service not configured for email-to-SMS' };
    }

    // Format phone number (remove + and country code for email-to-SMS)
    let phoneNumber = to.replace(/[^\d]/g, '');
    
    // Remove country code if present (Philippines: +63)
    if (phoneNumber.startsWith('63') && phoneNumber.length === 12) {
      phoneNumber = '0' + phoneNumber.substring(2); // Convert +639123456789 to 09123456789
    }

    // Try different email-to-SMS gateways for Philippines
    const gateways = [
      `${phoneNumber}@globe.com.ph`,      // Globe
      `${phoneNumber}@smart.com.ph`,      // Smart
      `${phoneNumber}@sun.com.ph`,       // Sun
      `${phoneNumber}@myglobe.com.ph`,   // Globe alternative
    ];

    const fromEmail = process.env.EMAIL_FROM || process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@labubbles.com';
    
    // Try first gateway (most common)
    const emailAddress = gateways[0];
    
    console.log(`\n📧 ===== ATTEMPTING EMAIL-TO-SMS =====`);
    console.log(`   To: ${emailAddress} (${to})`);
    console.log(`   Message: ${message.substring(0, 50)}...`);
    console.log(`   Note: Email-to-SMS is unreliable and may not work`);
    console.log(`   ====================================\n`);

    const mailOptions = {
      from: `"Laundry POS" <${fromEmail}>`,
      to: emailAddress,
      subject: '', // Some carriers require empty subject
      text: message,
      html: message
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log(`\n✅ ===== EMAIL-TO-SMS SENT =====`);
    console.log(`   To: ${emailAddress}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   ⚠️  Note: Delivery not guaranteed with email-to-SMS`);
    console.log(`   =================================\n`);

    return {
      success: true,
      method: 'email-to-sms',
      messageId: info.messageId,
      note: 'Email-to-SMS sent (delivery not guaranteed)'
    };
  } catch (error) {
    console.error(`\n❌ Email-to-SMS failed: ${error.message}\n`);
    return {
      success: false,
      error: error.message,
      method: 'email-to-sms'
    };
  }
};

/**
 * Send SMS notification
 * @param {string} to - Phone number (with country code, e.g., +1234567890)
 * @param {string} message - SMS message content
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendSMS = async (to, message) => {
  try {
    // Check if SMS service is configured
    const hasAccountSid = !!process.env.TWILIO_ACCOUNT_SID;
    const hasAuthToken = !!process.env.TWILIO_AUTH_TOKEN;
    const hasPhoneNumber = !!process.env.TWILIO_PHONE_NUMBER;

    console.log(`\n📱 ===== SMS SERVICE DEBUG =====`);
    console.log(`   TWILIO_ACCOUNT_SID: ${hasAccountSid ? 'Set (' + process.env.TWILIO_ACCOUNT_SID.substring(0, 4) + '...)' : 'NOT SET'}`);
    console.log(`   TWILIO_AUTH_TOKEN: ${hasAuthToken ? 'Set (' + process.env.TWILIO_AUTH_TOKEN.substring(0, 4) + '...)' : 'NOT SET'}`);
    console.log(`   TWILIO_PHONE_NUMBER: ${hasPhoneNumber ? 'Set (' + process.env.TWILIO_PHONE_NUMBER + ')' : 'NOT SET'}`);
    console.log(`   ===============================\n`);

    if (!hasAccountSid || !hasAuthToken || !hasPhoneNumber) {
      console.warn('⚠️  SMS service not configured. SMS will not be sent.');
      console.warn('   To enable SMS, set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env file');
      console.warn('   Make sure to restart the server after adding these variables!');
      return {
        success: false,
        error: 'SMS service not configured'
      };
    }

    // Format phone number (ensure it starts with +)
    let formattedPhone = to.trim();
    const originalPhone = formattedPhone;
    
    if (!formattedPhone.startsWith('+')) {
      // If no country code, assume it's a local number and add +1 (US/Canada) or handle based on your region
      // For Philippines, add +63
      if (formattedPhone.startsWith('0')) {
        // Remove leading 0 and add +63 for Philippines
        formattedPhone = '+63' + formattedPhone.substring(1);
      } else if (formattedPhone.length === 10) {
        // Assume US/Canada number
        formattedPhone = '+1' + formattedPhone;
      } else {
        // Try to detect country code or default to +63 for Philippines
        formattedPhone = '+63' + formattedPhone.replace(/^0+/, '');
      }
    }

    // Remove any non-digit characters except +
    formattedPhone = formattedPhone.replace(/[^\d+]/g, '');

    console.log(`📱 Phone number formatting: "${originalPhone}" → "${formattedPhone}"`);

    // Check if SMS is disabled
    if (process.env.DISABLE_SMS === 'true' || process.env.DISABLE_SMS === '1') {
      console.log(`\n📱 ===== SMS DISABLED =====`);
      console.log(`   SMS notifications are disabled (DISABLE_SMS=true)`);
      console.log(`   Only email notifications will be sent.`);
      console.log(`   =========================\n`);
      return {
        success: false,
        error: 'SMS is disabled',
        note: 'Set DISABLE_SMS=false in .env to enable SMS'
      };
    }

    // Use Twilio if available
    if (hasAccountSid && hasAuthToken) {
      try {
        // Check if twilio package is installed
        let twilio;
        try {
          twilio = require('twilio');
        } catch (requireError) {
          console.error('❌ Twilio package not found!');
          console.error('   Install it with: npm install twilio');
          console.error('   Then restart your server.');
          
          // Fallback to email-to-SMS if Twilio not installed
          if (process.env.USE_EMAIL_TO_SMS === 'true' || process.env.USE_EMAIL_TO_SMS === '1') {
            console.log('   Attempting email-to-SMS fallback...');
            return await sendSMSViaEmail(formattedPhone, message);
          }
          
          return {
            success: false,
            error: 'Twilio package not installed. Run: npm install twilio'
          };
        }
        
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );

        console.log(`\n📱 ===== ATTEMPTING TO SEND SMS =====`);
        console.log(`   From: ${process.env.TWILIO_PHONE_NUMBER}`);
        console.log(`   To: ${formattedPhone}`);
        console.log(`   Message: ${message.substring(0, 50)}...`);
        console.log(`   ===================================\n`);

        const result = await client.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone
        });

        console.log(`\n✅ ===== SMS SENT SUCCESSFULLY =====`);
        console.log(`   To: ${formattedPhone}`);
        console.log(`   Message ID: ${result.sid}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Price: ${result.price || 'N/A'}`);
        console.log(`   ===================================\n`);

        return {
          success: true,
          messageId: result.sid,
          status: result.status,
          method: 'twilio'
        };
      } catch (twilioError) {
        console.error('\n❌ ===== SMS SEND FAILED (Twilio) =====');
        console.error(`   To: ${formattedPhone}`);
        console.error(`   From: ${process.env.TWILIO_PHONE_NUMBER}`);
        console.error(`   Error: ${twilioError.message}`);
        console.error(`   Code: ${twilioError.code || 'N/A'}`);
        console.error(`   Status: ${twilioError.status || 'N/A'}`);
        
        // Provide helpful error messages
        if (twilioError.code === 21211) {
          console.error(`   ⚠️  Invalid phone number format. Ensure it includes country code (e.g., +639123456789)`);
        } else if (twilioError.code === 21266) {
          console.error(`   ⚠️  Cannot send SMS: 'To' and 'From' numbers cannot be the same.`);
          console.error(`   ⚠️  The customer's phone number matches your Twilio number.`);
          console.error(`   ⚠️  This usually happens when testing with your own number.`);
        } else if (twilioError.code === 21659) {
          console.error(`   ⚠️  CRITICAL: Your TWILIO_PHONE_NUMBER (${process.env.TWILIO_PHONE_NUMBER}) is not a valid Twilio phone number!`);
          console.error(`   ⚠️  This number must be a phone number you purchased/verified in your Twilio Console.`);
          console.error(`   ⚠️  Options:`);
          console.error(`      1. Purchase a Twilio number (recommended for production)`);
          console.error(`      2. Set USE_EMAIL_TO_SMS=true in .env to use email-to-SMS fallback`);
          console.error(`      3. Set DISABLE_SMS=true in .env to disable SMS (email only)`);
        } else if (twilioError.code === 21608) {
          console.error(`   ⚠️  Unverified phone number. For trial accounts, you can only send to verified numbers.`);
          console.error(`   ⚠️  Verify your number in Twilio Console or upgrade your account.`);
        } else if (twilioError.code === 21614) {
          console.error(`   ⚠️  Invalid 'From' number. Check your TWILIO_PHONE_NUMBER in .env file.`);
          console.error(`   ⚠️  Make sure it's a phone number you own in Twilio Console.`);
        } else if (twilioError.code === 20003) {
          console.error(`   ⚠️  Authentication failed. Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.`);
        } else if (twilioError.code === 21408) {
          console.error(`   ⚠️  Permission denied. Check your Twilio account permissions.`);
        }
        
        console.error(`   Full error:`, twilioError);
        console.error(`   ===================================\n`);

        // Try email-to-SMS fallback if enabled
        if (process.env.USE_EMAIL_TO_SMS === 'true' || process.env.USE_EMAIL_TO_SMS === '1') {
          console.log('   Attempting email-to-SMS fallback...');
          return await sendSMSViaEmail(formattedPhone, message);
        }

        return {
          success: false,
          error: twilioError.message,
          code: twilioError.code,
          status: twilioError.status
        };
      }
    }

    // Try email-to-SMS if enabled
    if (process.env.USE_EMAIL_TO_SMS === 'true' || process.env.USE_EMAIL_TO_SMS === '1') {
      return await sendSMSViaEmail(formattedPhone, message);
    }

    // Fallback: Log to console (for development/testing)
    console.log(`\n📱 ===== SMS NOTIFICATION (Console Log) =====`);
    console.log(`   To: ${formattedPhone}`);
    console.log(`   Message: ${message}`);
    console.log(`   Note: SMS service not configured. Set up Twilio or USE_EMAIL_TO_SMS=true`);
    console.log(`   ===========================================\n`);

    return {
      success: true,
      messageId: 'console-log',
      note: 'SMS logged to console (SMS service not fully configured)'
    };
  } catch (error) {
    console.error('\n❌ ===== SMS SEND ERROR =====');
    console.error(`   To: ${to}`);
    console.error(`   Error: ${error.message}`);
    console.error(`   ===========================\n`);

    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Verify SMS configuration
 * @returns {Promise<{configured: boolean, message: string}>}
 */
const verifySMSConfig = async () => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return {
        configured: false,
        message: 'SMS service not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env file.'
      };
    }

    // Try to create a Twilio client to verify credentials
    try {
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      // Verify by checking account (this doesn't send a message)
      await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      return {
        configured: true,
        message: 'SMS service is ready'
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        return {
          configured: false,
          message: 'Twilio package not installed. Install with: npm install twilio'
        };
      }
      return {
        configured: false,
        message: `SMS configuration error: ${error.message}`
      };
    }
  } catch (error) {
    return {
      configured: false,
      message: `SMS verification error: ${error.message}`
    };
  }
};

module.exports = {
  sendSMS,
  verifySMSConfig
};


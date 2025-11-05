const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter
const createTransporter = () => {
  // If SMTP credentials are provided, use them
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  // Otherwise, use Gmail OAuth2 or App Password
  // For Gmail with App Password (recommended for simple setup)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    // Remove spaces from app password (Gmail shows it with spaces but it should be without)
    const appPassword = process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '');
    
    console.log('📧 Configuring Gmail email service...');
    console.log(`   User: ${process.env.GMAIL_USER}`);
    console.log(`   App Password: ${appPassword.substring(0, 4)}**** (hidden)`);
    
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: appPassword // Gmail App Password (not regular password)
      }
    });
  }
  
  // Fallback: Try to use default system email (may not work in production)
  console.warn('⚠️  No email configuration found. Emails will not be sent.');
  return null;
};

// Create transporter function that recreates it each time (to pick up .env changes)
const getTransporter = () => {
  // If transporter already exists and is valid, return it
  // Otherwise, recreate it (handles .env changes after server start)
  const newTransporter = createTransporter();
  return newTransporter;
};

// Email templates
const getVerificationEmailTemplate = (code, email) => {
  return {
    subject: 'Email Verification Code - Laundry POS',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Laundry POS</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Email Verification</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #2563eb; margin-top: 0;">Verify Your Email Address</h2>
            <p>You requested to change your email address to <strong>${email}</strong>.</p>
            <p>Please use the verification code below to complete the email change:</p>
            
            <div style="background: #f3f4f6; border: 2px dashed #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${code}
              </div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              ⏰ This code will expire in <strong>10 minutes</strong>.
            </p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>⚠️ Security Notice:</strong> If you did not request this email change, please ignore this message or contact support immediately.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; color: #6b7280; font-size: 12px;">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Laundry POS. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Email Verification Code - Laundry POS
      
      You requested to change your email address to ${email}.
      
      Your verification code is: ${code}
      
      This code will expire in 10 minutes.
      
      If you did not request this email change, please ignore this message or contact support immediately.
      
      ---
      This is an automated message. Please do not reply to this email.
    `
  };
};

// Password reset email template
const getPasswordResetEmailTemplate = (code, email) => {
  return {
    subject: 'Password Reset Code - Laundry POS',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Code</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Laundry POS</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Password Reset</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #2563eb; margin-top: 0;">Reset Your Password</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password for your account associated with <strong>${email}</strong>.</p>
            <p>Please use the verification code below to reset your password:</p>
            
            <div style="background: #f3f4f6; border: 2px dashed #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${code}
              </div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              ⏰ This code will expire in <strong>10 minutes</strong>.
            </p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>⚠️ Security Notice:</strong> If you did not request a password reset, please ignore this email. Your password will remain unchanged.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; color: #6b7280; font-size: 12px;">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Laundry POS. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Password Reset Code - Laundry POS
      
      Hello,
      
      We received a request to reset your password for your account associated with ${email}.
      
      Your password reset code is: ${code}
      
      This code will expire in 10 minutes.
      
      If you did not request a password reset, please ignore this email. Your password will remain unchanged.
      
      ---
      This is an automated message. Please do not reply to this email.
    `
  };
};

// Send password reset email with code
const sendPasswordResetEmail = async (to, code) => {
  try {
    // Get fresh transporter (to pick up any .env changes)
    const transporter = getTransporter();
    
    if (!transporter) {
      const errorMsg = 'Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD or SMTP credentials in .env file.';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    const emailTemplate = getPasswordResetEmailTemplate(code, to);
    
    const fromEmail = process.env.EMAIL_FROM || process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@labubbles.com';
    
    const mailOptions = {
      from: `"Laundry POS" <${fromEmail}>`,
      to: to,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    };

    console.log(`\n📧 ===== ATTEMPTING TO SEND PASSWORD RESET EMAIL =====`);
    console.log(`   To: ${to}`);
    console.log(`   From: ${fromEmail}`);
    console.log(`   Reset Code: ${code}`);
    console.log(`   =================================================\n`);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`\n✅ ===== PASSWORD RESET EMAIL SENT SUCCESSFULLY =====`);
    console.log(`   To: ${to}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    console.log(`   ================================================\n`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('\n❌ ===== PASSWORD RESET EMAIL SEND FAILED =====');
    console.error(`   To: ${to}`);
    console.error(`   Error message: ${error.message}`);
    console.error(`   Error code: ${error.code || 'N/A'}`);
    console.error(`   Full error:`, error);
    console.error(`   ===========================================\n`);
    
    // Provide more helpful error messages
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check your email credentials (GMAIL_USER and GMAIL_APP_PASSWORD) in .env file. Make sure: 1) 2-Step Verification is enabled, 2) App Password is correct (no spaces), 3) Server was restarted after changing .env.';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      errorMessage = 'Connection to email server failed. Please check SMTP settings and network connection.';
    } else if (error.code === 'EENVELOPE') {
      errorMessage = 'Invalid email address. Please check the recipient email.';
    } else if (error.response) {
      errorMessage = `Email server error: ${error.response}`;
    }
    
    throw new Error(errorMessage);
  }
};

// Send verification code email
const sendVerificationEmail = async (to, code) => {
  try {
    // Get fresh transporter (to pick up any .env changes)
    const transporter = getTransporter();
    
    if (!transporter) {
      const errorMsg = 'Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD or SMTP credentials in .env file.';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    const emailTemplate = getVerificationEmailTemplate(code, to);
    
    const fromEmail = process.env.EMAIL_FROM || process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@labubbles.com';
    
    const mailOptions = {
      from: `"Laundry POS" <${fromEmail}>`,
      to: to,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    };

    console.log(`\n📧 ===== ATTEMPTING TO SEND VERIFICATION EMAIL =====`);
    console.log(`   To: ${to}`);
    console.log(`   From: ${fromEmail}`);
    console.log(`   Code: ${code}`);
    console.log(`   ==============================================\n`);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`\n✅ ===== EMAIL SENT SUCCESSFULLY =====`);
    console.log(`   To: ${to}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    console.log(`   ====================================\n`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('\n❌ ===== EMAIL SEND FAILED =====');
    console.error(`   To: ${to}`);
    console.error(`   Error message: ${error.message}`);
    console.error(`   Error code: ${error.code || 'N/A'}`);
    console.error(`   Full error:`, error);
    console.error(`   ============================\n`);
    
    // Provide more helpful error messages
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check your email credentials (GMAIL_USER and GMAIL_APP_PASSWORD) in .env file. Make sure: 1) 2-Step Verification is enabled, 2) App Password is correct (no spaces), 3) Server was restarted after changing .env.';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      errorMessage = 'Connection to email server failed. Please check SMTP settings and network connection.';
    } else if (error.code === 'EENVELOPE') {
      errorMessage = 'Invalid email address. Please check the recipient email.';
    } else if (error.response) {
      errorMessage = `Email server error: ${error.response}`;
    }
    
    throw new Error(errorMessage);
  }
};

// Verify email transporter configuration
const verifyEmailConfig = async () => {
  try {
    const transporter = getTransporter();
    
    if (!transporter) {
      return { 
        configured: false, 
        message: 'Email transporter not configured. Check .env file for GMAIL_USER/GMAIL_APP_PASSWORD or SMTP settings.' 
      };
    }
    
    console.log('🔍 Verifying email configuration...');
    await transporter.verify();
    console.log('✅ Email service verified and ready');
    return { configured: true, message: 'Email service is ready' };
  } catch (error) {
    console.error('❌ Email configuration verification failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    return { 
      configured: false, 
      message: `Email configuration error: ${error.message}. Please check your .env file settings.` 
    };
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyEmailConfig
};


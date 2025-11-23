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

// Feedback email template
const getFeedbackEmailTemplate = (feedbackData) => {
  const feedbackTypeLabels = {
    feature: 'Feature Request',
    bug: 'Bug Report',
    improvement: 'Improvement Suggestion',
    urgent: 'Urgent Request'
  };

  const typeLabel = feedbackTypeLabels[feedbackData.feedbackType] || feedbackData.feedbackType;
  const adminContact = feedbackData.reporterEmail || feedbackData.reporterPhone 
    ? `Admin Contact: ${feedbackData.reporterEmail || 'N/A'} | ${feedbackData.reporterPhone || 'N/A'}`
    : 'Admin contact information not provided';

  return {
    subject: `[Sparklean Admin] ${typeLabel}: ${feedbackData.title}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admin Feedback</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Sparklean Laundry POS</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Admin Feedback</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: #f3f4f6; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
              <p style="margin: 0 0 10px 0;"><strong>Type:</strong> ${typeLabel}</p>
              <p style="margin: 0;"><strong>Title:</strong> ${feedbackData.title}</p>
            </div>
            
            <h2 style="color: #2563eb; margin-top: 0;">Description</h2>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap; font-size: 14px;">
              ${feedbackData.description}
            </div>
            
            <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>${adminContact}</strong></p>
              <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">Submitted: ${new Date(feedbackData.submittedAt).toLocaleString()}</p>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>📧 This feedback was submitted from the Sparklean Laundry POS Admin Panel.</strong>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; color: #6b7280; font-size: 12px;">
            <p>Please review this feedback and respond to the admin accordingly.</p>
            <p>&copy; ${new Date().getFullYear()} Sparklean Laundry POS. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      [Sparklean Admin] ${typeLabel}: ${feedbackData.title}
      
      Type: ${typeLabel}
      Title: ${feedbackData.title}
      
      Description:
      ${feedbackData.description}
      
      ${adminContact}
      Submitted: ${new Date(feedbackData.submittedAt).toLocaleString()}
      
      ---
      This feedback was submitted from the Sparklean Laundry POS Admin Panel.
      Please review this feedback and respond to the admin accordingly.
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

// Send feedback email to developer
const sendFeedbackEmail = async (feedbackData) => {
  try {
    const transporter = getTransporter();
    
    if (!transporter) {
      const errorMsg = 'Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD or SMTP credentials in .env file.';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    const emailTemplate = getFeedbackEmailTemplate(feedbackData);
    const recipientEmail = feedbackData.recipientEmail || 'bryanjadesalahag@gmail.com';
    
    const fromEmail = process.env.EMAIL_FROM || process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@labubbles.com';
    
    const mailOptions = {
      from: `"Sparklean Admin Panel" <${fromEmail}>`,
      to: recipientEmail,
      replyTo: feedbackData.reporterEmail || fromEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    };

    console.log(`\n📧 ===== ATTEMPTING TO SEND FEEDBACK EMAIL =====`);
    console.log(`   To: ${recipientEmail}`);
    console.log(`   From: ${fromEmail}`);
    console.log(`   Type: ${feedbackData.feedbackType}`);
    console.log(`   Title: ${feedbackData.title}`);
    console.log(`   ===========================================\n`);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`\n✅ ===== FEEDBACK EMAIL SENT SUCCESSFULLY =====`);
    console.log(`   To: ${recipientEmail}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    console.log(`   =========================================\n`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('\n❌ ===== FEEDBACK EMAIL SEND FAILED =====');
    console.error(`   To: ${feedbackData.recipientEmail || 'bryanjadesalahag@gmail.com'}`);
    console.error(`   Error message: ${error.message}`);
    console.error(`   Error code: ${error.code || 'N/A'}`);
    console.error(`   Full error:`, error);
    console.error(`   ====================================\n`);
    
    // Provide more helpful error messages
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check your email credentials.';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      errorMessage = 'Connection to email server failed. Please check SMTP settings and network connection.';
    } else if (error.code === 'EENVELOPE') {
      errorMessage = 'Invalid email address. Please check the recipient email.';
    }
    
    throw new Error(errorMessage);
  }
};

// Order status update email template
const getOrderStatusEmailTemplate = (orderId, customerName, status, orderTotal, pickupDate) => {
  const statusMessages = {
    'In Progress': {
      title: 'Your Order is Now In Progress',
      message: 'Great news! We have started processing your laundry order.',
      icon: '🔄',
      color: '#2563eb'
    },
    'Completed': {
      title: 'Your Order is Ready for Pickup!',
      message: 'Your laundry order has been completed and is ready for pickup.',
      icon: '✅',
      color: '#059669'
    }
  };

  const statusInfo = statusMessages[status] || {
    title: `Order Status Update: ${status}`,
    message: `Your order status has been updated to ${status}.`,
    icon: '📦',
    color: '#2563eb'
  };

  const pickupDateText = pickupDate 
    ? new Date(pickupDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'To be determined';

  return {
    subject: `${statusInfo.title} - Order ${orderId}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Status Update</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${statusInfo.color} 0%, ${statusInfo.color}dd 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">${statusInfo.icon} Laundry POS</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Order Status Update</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: ${statusInfo.color}; margin-top: 0;">${statusInfo.title}</h2>
            <p>Hello ${customerName},</p>
            <p>${statusInfo.message}</p>
            
            <div style="background: #f3f4f6; border-left: 4px solid ${statusInfo.color}; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <p style="margin: 0 0 10px 0;"><strong>Order Details:</strong></p>
              <p style="margin: 5px 0;"><strong>Order ID:</strong> ${orderId}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${statusInfo.color}; font-weight: bold;">${status}</span></p>
              <p style="margin: 5px 0;"><strong>Total Amount:</strong> ${orderTotal}</p>
              <p style="margin: 5px 0;"><strong>Expected Pickup Date:</strong> ${pickupDateText}</p>
            </div>
            
            ${status === 'Completed' ? `
            <div style="background: #d1fae5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #065f46; font-size: 14px;">
                <strong>🎉 Ready for Pickup!</strong> Please visit us during our business hours to collect your order. Don't forget to bring a valid ID for verification.
              </p>
            </div>
            ` : ''}
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If you have any questions or concerns, please don't hesitate to contact us.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; color: #6b7280; font-size: 12px;">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Laundry POS. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      ${statusInfo.title} - Order ${orderId}
      
      Hello ${customerName},
      
      ${statusInfo.message}
      
      Order Details:
      - Order ID: ${orderId}
      - Status: ${status}
      - Total Amount: ${orderTotal}
      - Expected Pickup Date: ${pickupDateText}
      
      ${status === 'Completed' ? 'Your order is ready for pickup! Please visit us during our business hours to collect your order.' : ''}
      
      If you have any questions or concerns, please don't hesitate to contact us.
      
      ---
      This is an automated message. Please do not reply to this email.
    `
  };
};

// Send order status update email
const sendOrderStatusEmail = async (to, orderId, customerName, status, orderTotal, pickupDate) => {
  try {
    const transporter = getTransporter();
    
    if (!transporter) {
      const errorMsg = 'Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD or SMTP credentials in .env file.';
      console.error('❌', errorMsg);
      return { success: false, error: errorMsg };
    }

    const emailTemplate = getOrderStatusEmailTemplate(orderId, customerName, status, orderTotal, pickupDate);
    
    const fromEmail = process.env.EMAIL_FROM || process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@labubbles.com';
    
    const mailOptions = {
      from: `"Laundry POS" <${fromEmail}>`,
      to: to,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    };

    console.log(`\n📧 ===== ATTEMPTING TO SEND ORDER STATUS EMAIL =====`);
    console.log(`   To: ${to}`);
    console.log(`   Order: ${orderId}`);
    console.log(`   Status: ${status}`);
    console.log(`   ===============================================\n`);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`\n✅ ===== ORDER STATUS EMAIL SENT SUCCESSFULLY =====`);
    console.log(`   To: ${to}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   =============================================\n`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('\n❌ ===== ORDER STATUS EMAIL SEND FAILED =====');
    console.error(`   To: ${to}`);
    console.error(`   Error message: ${error.message}`);
    console.error(`   Error code: ${error.code || 'N/A'}`);
    console.error(`   =========================================\n`);
    
    return { success: false, error: error.message };
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

// Get invoice email template
const getInvoiceEmailTemplate = (invoiceData, stationInfo) => {
  const stationName = stationInfo?.name ? ` - ${stationInfo.name}` : '';
  const stationAddress = stationInfo?.address || '123 Laundry Street, Clean City';
  const stationPhone = stationInfo?.phone || '+63 912 345 6789';
  const stationEmail = stationInfo?.email || 'sparklean@example.com';

  const itemsHtml = invoiceData.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.service}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₱${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₱${item.amount.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .invoice-info { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .company-info { margin-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
        .table th { background: #007bff; color: white; padding: 12px; text-align: left; }
        .table td { padding: 8px; border-bottom: 1px solid #eee; }
        .summary { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .total { font-weight: bold; font-size: 18px; border-top: 2px solid #007bff; padding-top: 12px; margin-top: 12px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Sparklean Laundry Shop${stationName}</h1>
          <p style="margin: 0;">Invoice #${invoiceData.id}</p>
        </div>
        <div class="content">
          <div class="invoice-info">
            <div class="company-info">
              <p><strong>${stationAddress}</strong></p>
              <p>Phone: ${stationPhone}</p>
              <p>Email: ${stationEmail}</p>
            </div>
            <div style="margin-top: 20px;">
              <p><strong>Date:</strong> ${invoiceData.date}</p>
              <p><strong>Due Date:</strong> ${invoiceData.dueDate}</p>
              <p><strong>Payment Status:</strong> ${invoiceData.paymentStatus}</p>
            </div>
            <div style="margin-top: 20px;">
              <h3 style="margin-bottom: 10px;">Bill To:</h3>
              <p><strong>${invoiceData.customer.name}</strong></p>
              ${invoiceData.customer.email ? `<p>Email: ${invoiceData.customer.email}</p>` : ''}
              ${invoiceData.customer.phone ? `<p>Phone: ${invoiceData.customer.phone}</p>` : ''}
              ${invoiceData.customer.address ? `<p>Address: ${invoiceData.customer.address}</p>` : ''}
            </div>
          </div>
          
          <table class="table">
            <thead>
              <tr>
                <th>Service</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="summary">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>₱${invoiceData.subtotal.toFixed(2)}</span>
            </div>
            ${invoiceData.discount > 0 ? `
            <div class="summary-row">
              <span>Discount ${invoiceData.discountCode ? `(${invoiceData.discountCode})` : ''}:</span>
              <span>-₱${invoiceData.discount.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="summary-row">
              <span>Tax (0%):</span>
              <span>₱${invoiceData.tax.toFixed(2)}</span>
            </div>
            <div class="summary-row total">
              <span>Total:</span>
              <span>₱${invoiceData.total.toFixed(2)}</span>
            </div>
            <div class="summary-row" style="color: #d32f2f; font-weight: bold;">
              <span>Balance Due:</span>
              <span>₱${invoiceData.balance.toFixed(2)}</span>
            </div>
          </div>
          
          ${invoiceData.notes ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h3>Notes:</h3>
            <p>${invoiceData.notes}</p>
          </div>
          ` : ''}
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>For questions, contact us at ${stationPhone} or ${stationEmail}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
INVOICE #${invoiceData.id}
Sparklean Laundry Shop${stationName}

Date: ${invoiceData.date}
Due Date: ${invoiceData.dueDate}
Payment Status: ${invoiceData.paymentStatus}

Bill To:
${invoiceData.customer.name}
${invoiceData.customer.email ? `Email: ${invoiceData.customer.email}` : ''}
${invoiceData.customer.phone ? `Phone: ${invoiceData.customer.phone}` : ''}
${invoiceData.customer.address ? `Address: ${invoiceData.customer.address}` : ''}

Services:
${invoiceData.items.map(item => `- ${item.service} (${item.quantity}): ₱${item.amount.toFixed(2)}`).join('\n')}

Subtotal: ₱${invoiceData.subtotal.toFixed(2)}
${invoiceData.discount > 0 ? `Discount: -₱${invoiceData.discount.toFixed(2)}` : ''}
Tax (0%): ₱${invoiceData.tax.toFixed(2)}
Total: ₱${invoiceData.total.toFixed(2)}
Balance Due: ₱${invoiceData.balance.toFixed(2)}

${invoiceData.notes ? `Notes: ${invoiceData.notes}` : ''}

Thank you for your business!
${stationAddress}
Phone: ${stationPhone}
Email: ${stationEmail}
  `;

  return { html, text, subject: `Invoice #${invoiceData.id} - Sparklean Laundry Shop` };
};

// Send invoice email
const sendInvoiceEmail = async (to, invoiceData, stationInfo) => {
  try {
    const transporter = getTransporter();
    
    if (!transporter) {
      const errorMsg = 'Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD or SMTP credentials in .env file.';
      console.error('❌', errorMsg);
      return { success: false, error: errorMsg };
    }

    const emailTemplate = getInvoiceEmailTemplate(invoiceData, stationInfo);
    
    const fromEmail = process.env.EMAIL_FROM || process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@labubbles.com';
    
    const mailOptions = {
      from: `"Sparklean Laundry Shop" <${fromEmail}>`,
      to: to,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    };

    console.log(`\n📧 ===== ATTEMPTING TO SEND INVOICE EMAIL =====`);
    console.log(`   To: ${to}`);
    console.log(`   Invoice: #${invoiceData.id}`);
    console.log(`   ===========================================\n`);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`\n✅ ===== INVOICE EMAIL SENT SUCCESSFULLY =====`);
    console.log(`   To: ${to}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   =========================================\n`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('\n❌ ===== INVOICE EMAIL SEND FAILED =====');
    console.error(`   To: ${to}`);
    console.error(`   Error message: ${error.message}`);
    console.error(`   Error code: ${error.code || 'N/A'}`);
    console.error(`   =====================================\n`);
    
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderStatusEmail,
  sendInvoiceEmail,
  sendFeedbackEmail,
  verifyEmailConfig
};

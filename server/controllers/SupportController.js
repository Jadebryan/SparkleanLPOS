const { sendFeedbackEmail } = require('../utils/emailService');
const logger = require('../utils/logger');

class SupportController {
  // Submit feedback from admin panel
  static async submitFeedback(req, res) {
    try {
      const { title, description, feedbackType, reporterEmail, reporterPhone, recipientEmail, recipientPhone, submittedAt } = req.body;

      // Validate required fields
      if (!title || !description) {
        return res.status(400).json({
          success: false,
          message: 'Title and description are required'
        });
      }

      // Prepare feedback data
      const feedbackData = {
        title: title.trim(),
        description: description.trim(),
        feedbackType: feedbackType || 'feature',
        reporterEmail: reporterEmail?.trim() || null,
        reporterPhone: reporterPhone?.trim() || null,
        recipientEmail: recipientEmail || 'bryanjadesalahag@gmail.com',
        recipientPhone: recipientPhone || '09750543087',
        submittedAt: submittedAt || new Date().toISOString()
      };

      // Send email to developer
      try {
        const emailResult = await sendFeedbackEmail(feedbackData);
        
        logger.info('Feedback email sent successfully', {
          type: feedbackData.feedbackType,
          title: feedbackData.title,
          recipient: feedbackData.recipientEmail
        });

        return res.status(200).json({
          success: true,
          message: 'Feedback submitted successfully! The development team will review your request.',
          data: {
            messageId: emailResult.messageId,
            submittedAt: feedbackData.submittedAt
          }
        });
      } catch (emailError) {
        logger.error('Failed to send feedback email', {
          error: emailError.message,
          errorCode: emailError.code,
          feedbackType: feedbackData.feedbackType,
          title: feedbackData.title
        });

        // Provide more helpful error messages
        let userMessage = 'Failed to send feedback email. ';
        if (emailError.message.includes('not configured') || emailError.message.includes('GMAIL_USER')) {
          userMessage += 'Email service is not configured on the server. Please contact the system administrator.';
        } else if (emailError.message.includes('authentication') || emailError.code === 'EAUTH') {
          userMessage += 'Email authentication failed. Please contact the system administrator.';
        } else if (emailError.message.includes('connection') || emailError.code === 'ECONNECTION') {
          userMessage += 'Could not connect to email server. Please try again later.';
        } else {
          userMessage += emailError.message + '. Please try again or contact the developer directly.';
        }

        return res.status(500).json({
          success: false,
          message: userMessage
        });
      }
    } catch (error) {
      logger.error('Submit feedback error', {
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: 'Internal server error while processing feedback'
      });
    }
  }
}

module.exports = SupportController;


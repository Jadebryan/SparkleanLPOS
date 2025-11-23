const express = require('express');
const router = express.Router();
const SupportController = require('../controllers/SupportController');
const { authenticate } = require('../middleware/auth');

// Submit feedback (requires authentication, any authenticated user can submit feedback)
router.post('/feedback', authenticate, SupportController.submitFeedback);

module.exports = router;


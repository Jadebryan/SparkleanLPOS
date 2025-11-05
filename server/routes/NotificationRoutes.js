const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const { authenticate } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const notificationEmitter = require('../utils/notificationEmitter');

// SSE stream for live notifications (supports token via query param for EventSource)
router.get('/stream', async (req, res) => {
  try {
    const token = (req.query && req.query.token) || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).end();
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production');
    const user = await User.findById(decoded.id).select('_id isActive');
    if (!user || !user.isActive) return res.status(401).end();

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    const userId = user._id.toString();

    const onNotify = (payload) => {
      if (!payload || payload.userId !== userId) return;
      res.write(`data: ${JSON.stringify(payload.notification)}\n\n`);
    };
    notificationEmitter.on('notify', onNotify);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      try { res.write(': ping\n\n'); } catch {}
    }, 25000);

    req.on('close', () => {
      notificationEmitter.off('notify', onNotify);
      clearInterval(heartbeat);
    });
  } catch (e) {
    return res.status(401).end();
  }
});

// All other notification routes require authentication
router.use(authenticate);

// Get all notifications for the current user
router.get('/', NotificationController.getNotifications);

// Mark a specific notification as read
router.put('/:notificationId/read', NotificationController.markAsRead);

// Mark all notifications as read
router.put('/read-all', NotificationController.markAllAsRead);

module.exports = router;


const Notification = require('../models/NotificationModel');
const Order = require('../models/OrderModel');
const Expense = require('../models/ExpenseModel');
const notificationEmitter = require('../utils/notificationEmitter');

class NotificationController {
  // Get all notifications for a user
  static async getNotifications(req, res) {
    try {
      const userId = req.user._id;
      const { unreadOnly = false, limit = 50 } = req.query;

      const query = { userId };
      if (unreadOnly === 'true') {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

      // Format time ago
      const formattedNotifications = notifications.map(notif => ({
        id: notif._id.toString(),
        type: notif.type,
        title: notif.title,
        message: notif.message,
        time: getTimeAgo(notif.createdAt),
        unread: !notif.isRead,
        relatedId: notif.relatedId,
        metadata: notif.metadata
      }));

      const unreadCount = await Notification.countDocuments({
        userId,
        isRead: false
      });

      res.status(200).json({
        success: true,
        data: {
          notifications: formattedNotifications,
          unreadCount
        }
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }
  }

  // Mark notification as read
  static async markAsRead(req, res) {
    try {
      const userId = req.user._id;
      const { notificationId } = req.params;

      const notification = await Notification.findOne({
        _id: notificationId,
        userId
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: notification
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(req, res) {
    try {
      const userId = req.user._id;

      const result = await Notification.updateMany(
        { userId, isRead: false },
        { 
          isRead: true,
          readAt: new Date()
        }
      );

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: {
          updatedCount: result.modifiedCount
        }
      });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read'
      });
    }
  }

  // Create a notification (can be called by other controllers)
  static async createNotification(userId, type, title, message, relatedId = null, metadata = {}) {
    try {
      const notification = new Notification({
        userId,
        type,
        title,
        message,
        relatedId,
        metadata
      });
      await notification.save();

      // Broadcast to SSE listeners for this user
      try {
        notificationEmitter.emit('notify', {
          userId: userId.toString(),
          notification: {
            id: notification._id.toString(),
            type,
            title,
            message,
            time: 'Just now',
            unread: true,
            relatedId,
            metadata
          }
        });
      } catch (e) {
        // non-fatal
      }
      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
      return null;
    }
  }
}

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

module.exports = NotificationController;


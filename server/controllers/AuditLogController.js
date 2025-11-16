const AuditLog = require('../models/AuditLogModel');
const logger = require('../utils/logger');

/**
 * Audit Log Controller
 * Provides API endpoints for viewing audit logs (Admin only)
 */
class AuditLogController {
  /**
   * Get audit logs with filtering
   * GET /api/audit-logs
   */
  static async getAuditLogs(req, res) {
    try {
      const {
        type,
        action,
        userId,
        resource,
        resourceId,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = req.query;

      // Build query
      const query = {};

      if (type) query.type = type;
      if (action) query.action = { $regex: action, $options: 'i' };
      if (userId) query.userId = userId;
      if (resource) query.resource = resource;
      if (resourceId) query.resourceId = resourceId;

      // Date range filter
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const limitNum = parseInt(limit);

      // Execute query
      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .populate('userId', 'email username role')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        AuditLog.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        data: logs,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      logger.error('Get audit logs error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get audit log statistics
   * GET /api/audit-logs/stats
   */
  static async getAuditLogStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const dateFilter = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
      }

      const [
        totalLogs,
        userActions,
        systemEvents,
        securityEvents,
        topActions,
        topUsers
      ] = await Promise.all([
        AuditLog.countDocuments(dateFilter),
        AuditLog.countDocuments({ ...dateFilter, type: 'user_action' }),
        AuditLog.countDocuments({ ...dateFilter, type: 'system_event' }),
        AuditLog.countDocuments({ ...dateFilter, type: 'security_event' }),
        AuditLog.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        AuditLog.aggregate([
          { $match: { ...dateFilter, userId: { $ne: null } } },
          { $group: { _id: '$userId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              userId: '$_id',
              email: '$user.email',
              username: '$user.username',
              count: 1
            }
          }
        ])
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalLogs,
          byType: {
            userActions,
            systemEvents,
            securityEvents
          },
          topActions,
          topUsers
        }
      });
    } catch (error) {
      logger.error('Get audit log stats error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get audit log by ID
   * GET /api/audit-logs/:id
   */
  static async getAuditLogById(req, res) {
    try {
      const { id } = req.params;

      const log = await AuditLog.findById(id)
        .populate('userId', 'email username role')
        .lean();

      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'Audit log not found'
        });
      }

      res.status(200).json({
        success: true,
        data: log
      });
    } catch (error) {
      logger.error('Get audit log by ID error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = AuditLogController;


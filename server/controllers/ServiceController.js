const Service = require('../models/ServiceModel');
const User = require('../models/UserModel');
const auditLogger = require('../utils/auditLogger');
const NotificationController = require('./NotificationController');

class ServiceController {
  // Get all services (both admin and staff can view)
  static async getAllServices(req, res) {
    try {
      const { search, category, status, showArchived = false } = req.query;

      const query = {};
      
      if (showArchived === 'true') {
        query.isArchived = true;
      } else {
        query.isArchived = false;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } }
        ];
      }

      if (category && category !== 'All') {
        query.category = category;
      }

      if (status && status !== 'All') {
        if (status === 'Active') {
          query.isActive = true;
        } else if (status === 'Inactive') {
          query.isActive = false;
        }
      }

      const services = await Service.find(query).sort({ name: 1 });

      res.status(200).json({
        success: true,
        data: services,
        count: services.length
      });
    } catch (error) {
      console.error('Get all services error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get single service
  static async getService(req, res) {
    try {
      const { id } = req.params;
      const service = await Service.findById(id);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }

      res.status(200).json({
        success: true,
        data: service
      });
    } catch (error) {
      console.error('Get service error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create service (admin only)
  static async createService(req, res) {
    try {
      const { name, category, price, unit, description, isPopular } = req.body;

      if (!name || !category || !price || !unit) {
        return res.status(400).json({
          success: false,
          message: 'Name, category, price, and unit are required'
        });
      }

      const service = new Service({
        name,
        category,
        price,
        unit,
        description: description || '',
        isPopular: isPopular || false,
        isActive: true
      });

      await service.save();
      // Notify admins about new service
      try {
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
        const notifyPromises = admins.map(a => 
          NotificationController.createNotification(
            a._id,
            'system',
            'Service Created',
            `${name} service was added`,
            service._id.toString()
          )
        );
        await Promise.all(notifyPromises);
      } catch (notifyErr) {
        console.error('Notification (service create) error:', notifyErr);
      }

      // Log audit event
      await auditLogger.logDataModification('create', req.user._id, 'service', service._id.toString(), {
        method: req.method,
        endpoint: req.originalUrl || req.url,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userEmail: req.user.email,
        userRole: req.user.role,
        status: 'success',
        changes: { name, category, price, unit }
      }).catch(err => console.error('Audit logging error:', err));

      res.status(201).json({
        success: true,
        message: 'Service created successfully',
        data: service
      });
    } catch (error) {
      console.error('Create service error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Service with this name already exists'
        });
      }

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update service (admin only)
  static async updateService(req, res) {
    try {
      const { id } = req.params;
      const { name, category, price, unit, description, isActive, isPopular } = req.body;

      const service = await Service.findById(id);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }

      if (name) service.name = name;
      if (category) service.category = category;
      if (price !== undefined) service.price = price;
      if (unit) service.unit = unit;
      if (description !== undefined) service.description = description;
      if (isActive !== undefined) service.isActive = isActive;
      if (isPopular !== undefined) service.isPopular = isPopular;

      await service.save();

      // Notify admins about service update
      try {
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
        const notifyPromises = admins.map(a => 
          NotificationController.createNotification(
            a._id,
            'system',
            'Service Updated',
            `${service.name} service was updated`,
            service._id.toString()
          )
        );
        await Promise.all(notifyPromises);
      } catch (notifyErr) {
        console.error('Notification (service update) error:', notifyErr);
      }

      // Log audit event
      await auditLogger.logDataModification('update', req.user._id, 'service', id, {
        method: req.method,
        endpoint: req.originalUrl || req.url,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userEmail: req.user.email,
        userRole: req.user.role,
        status: 'success',
        changes: { name, category, price, unit, isActive }
      }).catch(err => console.error('Audit logging error:', err));

      res.status(200).json({
        success: true,
        message: 'Service updated successfully',
        data: service
      });
    } catch (error) {
      console.error('Update service error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Service with this name already exists'
        });
      }

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Archive service (admin only)
  static async archiveService(req, res) {
    try {
      const { id } = req.params;

      const service = await Service.findByIdAndUpdate(
        id,
        { isArchived: true },
        { new: true }
      );

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }

      // Notify admins about service archive
      try {
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
        const notifyPromises = admins.map(a => 
          NotificationController.createNotification(
            a._id,
            'system',
            'Service Archived',
            `${service?.name || 'Service'} was archived`,
            id
          )
        );
        await Promise.all(notifyPromises);
      } catch (notifyErr) {
        console.error('Notification (service archive) error:', notifyErr);
      }

      res.status(200).json({
        success: true,
        message: 'Service archived successfully',
        data: service
      });
    } catch (error) {
      console.error('Archive service error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Unarchive service (admin only)
  static async unarchiveService(req, res) {
    try {
      const { id } = req.params;

      const service = await Service.findByIdAndUpdate(
        id,
        { isArchived: false },
        { new: true }
      );

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }

      // Notify admins about service unarchive
      try {
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
        const notifyPromises = admins.map(a => 
          NotificationController.createNotification(
            a._id,
            'system',
            'Service Unarchived',
            `${service?.name || 'Service'} was unarchived`,
            id
          )
        );
        await Promise.all(notifyPromises);
      } catch (notifyErr) {
        console.error('Notification (service unarchive) error:', notifyErr);
      }

      res.status(200).json({
        success: true,
        message: 'Service unarchived successfully',
        data: service
      });
    } catch (error) {
      console.error('Unarchive service error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = ServiceController;


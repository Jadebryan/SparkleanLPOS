const Voucher = require('../models/VoucherModel');
const Customer = require('../models/CustomerModel');
const Order = require('../models/OrderModel');
const SystemSetting = require('../models/SystemSettingModel');
const auditLogger = require('../utils/auditLogger');

class VoucherController {
  /**
   * Get all vouchers
   */
  static async getAllVouchers(req, res) {
    try {
      const { search, isActive, isMonthly, showArchived = false } = req.query;

      const isAdmin = req.user && req.user.role === 'admin';

      const query = {};

      if (isAdmin) {
        if (showArchived === 'true' || showArchived === true) {
          query.isArchived = true;
        } else {
          query.isArchived = false;
        }
      } else {
        // Staff should only ever see active, non-archived vouchers
        query.isArchived = false;
        query.isActive = true;
      }

      if (search) {
        const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { code: { $regex: escapedSearch, $options: 'i' } },
          { name: { $regex: escapedSearch, $options: 'i' } }
        ];
      }

      if (isActive !== undefined && isAdmin) {
        query.isActive = isActive === 'true';
      }

      if (isMonthly !== undefined) {
        query.isMonthly = isMonthly === 'true';
      }

      const vouchers = await Voucher.find(query).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: vouchers,
        count: vouchers.length
      });
    } catch (error) {
      console.error('Get all vouchers error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get single voucher
   */
  static async getVoucher(req, res) {
    try {
      const { id } = req.params;
      const voucher = await Voucher.findById(id);

      if (!voucher) {
        return res.status(404).json({
          success: false,
          message: 'Voucher not found'
        });
      }

      res.status(200).json({
        success: true,
        data: voucher
      });
    } catch (error) {
      console.error('Get voucher error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Check if customer has available voucher
   */
  static async checkCustomerVoucher(req, res) {
    try {
      const { customerId } = req.params;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required'
        });
      }

      // Check if voucher system is enabled
      const voucherSetting = await SystemSetting.findOne({ key: 'vouchers.enabled' });
      const vouchersEnabled = voucherSetting?.value !== false;

      if (!vouchersEnabled) {
        return res.status(200).json({
          success: true,
          data: {
            hasAvailableVoucher: false,
            message: 'Voucher system is disabled'
          }
        });
      }

      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Find active monthly vouchers
      const monthlyVouchers = await Voucher.find({
        isActive: true,
        isArchived: false,
        isMonthly: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now }
      });

      const availableVouchers = [];

      for (const voucher of monthlyVouchers) {
        // Check if customer can use this voucher this month
        if (voucher.canCustomerUseThisMonth(customerId)) {
          // Check if voucher is applicable to current branch (if specified)
          const applicableBranches = voucher.applicableBranches || [];
          if (applicableBranches.length === 0 || applicableBranches.includes(req.user.stationId || '')) {
            availableVouchers.push({
              id: voucher._id,
              code: voucher.code,
              name: voucher.name,
              type: voucher.type,
              value: voucher.value,
              minPurchase: voucher.minPurchase,
              isMonthly: voucher.isMonthly
            });
          }
        }
      }

      res.status(200).json({
        success: true,
        data: {
          hasAvailableVoucher: availableVouchers.length > 0,
          vouchers: availableVouchers,
          count: availableVouchers.length
        }
      });
    } catch (error) {
      console.error('Check customer voucher error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Create voucher
   */
  static async createVoucher(req, res) {
    try {
      const {
        code,
        name,
        type,
        value,
        minPurchase = 0,
        validFrom,
        validUntil,
        isMonthly = false,
        monthlyLimitPerCustomer = 1,
        pointsRequired = 0,
        applicableBranches = [],
        description = ''
      } = req.body;

      // Validation
      if (!code || !name || !type || value === undefined || !validFrom || !validUntil) {
        return res.status(400).json({
          success: false,
          message: 'Code, name, type, value, validFrom, and validUntil are required'
        });
      }

      if (!['percentage', 'fixed'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Type must be either "percentage" or "fixed"'
        });
      }

      if (type === 'percentage' && (value < 0 || value > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Percentage value must be between 0 and 100'
        });
      }

      // Check if code already exists
      const existingVoucher = await Voucher.findOne({ code: code.toUpperCase() });
      if (existingVoucher) {
        return res.status(409).json({
          success: false,
          message: 'Voucher code already exists'
        });
      }

      const voucher = new Voucher({
        code: code.toUpperCase(),
        name,
        type,
        value,
        minPurchase,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        isMonthly,
        monthlyLimitPerCustomer,
        pointsRequired,
        applicableBranches: Array.isArray(applicableBranches) ? applicableBranches : [],
        description
      });

      await voucher.save();

      // Log audit event
      await auditLogger.logDataModification('create', req.user._id, 'voucher', voucher._id.toString(), {
        method: req.method,
        endpoint: req.originalUrl || req.url,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userEmail: req.user.email,
        userRole: req.user.role,
        status: 'success',
        changes: { code, name, type, value }
      }).catch(err => console.error('Audit logging error:', err));

      res.status(201).json({
        success: true,
        message: 'Voucher created successfully',
        data: voucher
      });
    } catch (error) {
      console.error('Create voucher error:', error);
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors
        });
      }

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Voucher code already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update voucher
   */
  static async updateVoucher(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const voucher = await Voucher.findById(id);

      if (!voucher) {
        return res.status(404).json({
          success: false,
          message: 'Voucher not found'
        });
      }

      // Update fields
      if (updateData.code) voucher.code = updateData.code.toUpperCase();
      if (updateData.name) voucher.name = updateData.name;
      if (updateData.type) voucher.type = updateData.type;
      if (updateData.value !== undefined) voucher.value = updateData.value;
      if (updateData.minPurchase !== undefined) voucher.minPurchase = updateData.minPurchase;
      if (updateData.validFrom) voucher.validFrom = new Date(updateData.validFrom);
      if (updateData.validUntil) voucher.validUntil = new Date(updateData.validUntil);
      if (updateData.isActive !== undefined) voucher.isActive = updateData.isActive;
      if (updateData.isMonthly !== undefined) voucher.isMonthly = updateData.isMonthly;
      if (updateData.monthlyLimitPerCustomer !== undefined) voucher.monthlyLimitPerCustomer = updateData.monthlyLimitPerCustomer;
      if (updateData.pointsRequired !== undefined) voucher.pointsRequired = updateData.pointsRequired;
      if (updateData.applicableBranches !== undefined) voucher.applicableBranches = Array.isArray(updateData.applicableBranches) ? updateData.applicableBranches : [];
      if (updateData.description !== undefined) voucher.description = updateData.description;

      await voucher.save();

      // Log audit event
      await auditLogger.logDataModification('update', req.user._id, 'voucher', id, {
        method: req.method,
        endpoint: req.originalUrl || req.url,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userEmail: req.user.email,
        userRole: req.user.role,
        status: 'success',
        changes: updateData
      }).catch(err => console.error('Audit logging error:', err));

      res.status(200).json({
        success: true,
        message: 'Voucher updated successfully',
        data: voucher
      });
    } catch (error) {
      console.error('Update voucher error:', error);
      
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

  /**
   * Archive voucher
   */
  static async archiveVoucher(req, res) {
    try {
      const { id } = req.params;

      const voucher = await Voucher.findByIdAndUpdate(
        id,
        { isArchived: true },
        { new: true }
      );

      if (!voucher) {
        return res.status(404).json({
          success: false,
          message: 'Voucher not found'
        });
      }

      // Log audit event
      await auditLogger.logDataModification('update', req.user._id, 'voucher', id, {
        method: req.method,
        endpoint: req.originalUrl || req.url,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userEmail: req.user.email,
        userRole: req.user.role,
        status: 'success',
        changes: { isArchived: true }
      }).catch(err => console.error('Audit logging error:', err));

      res.status(200).json({
        success: true,
        message: 'Voucher archived successfully',
        data: voucher
      });
    } catch (error) {
      console.error('Archive voucher error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Unarchive voucher
   */
  static async unarchiveVoucher(req, res) {
    try {
      const { id } = req.params;

      const voucher = await Voucher.findByIdAndUpdate(
        id,
        { isArchived: false },
        { new: true }
      );

      if (!voucher) {
        return res.status(404).json({
          success: false,
          message: 'Voucher not found'
        });
      }

      // Log audit event
      await auditLogger.logDataModification('update', req.user._id, 'voucher', id, {
        method: req.method,
        endpoint: req.originalUrl || req.url,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userEmail: req.user.email,
        userRole: req.user.role,
        status: 'success',
        changes: { isArchived: false }
      }).catch(err => console.error('Audit logging error:', err));

      res.status(200).json({
        success: true,
        message: 'Voucher unarchived successfully',
        data: voucher
      });
    } catch (error) {
      console.error('Unarchive voucher error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete voucher permanently
   */
  static async deleteVoucher(req, res) {
    try {
      const { id } = req.params;

      const voucher = await Voucher.findByIdAndDelete(id);

      if (!voucher) {
        return res.status(404).json({
          success: false,
          message: 'Voucher not found'
        });
      }

      // Log audit event
      await auditLogger.logDataModification('delete', req.user._id, 'voucher', id, {
        method: req.method,
        endpoint: req.originalUrl || req.url,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userEmail: req.user.email,
        userRole: req.user.role,
        status: 'success',
        changes: { code: voucher.code, name: voucher.name }
      }).catch(err => console.error('Audit logging error:', err));

      res.status(200).json({
        success: true,
        message: 'Voucher deleted permanently'
      });
    } catch (error) {
      console.error('Delete voucher error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = VoucherController;


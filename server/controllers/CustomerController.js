const Customer = require('../models/CustomerModel');
const User = require('../models/UserModel');
const NotificationController = require('./NotificationController');
const auditLogger = require('../utils/auditLogger');

class CustomerController {
  // Get all customers (both admin and staff can view)
  static async getAllCustomers(req, res) {
    try {
      const { search, sortBy = 'name-asc', showArchived } = req.query;

      // Build query
      const query = {};
      
      // Staff can only see customers from their station
      if (req.user.role === 'staff') {
        if (req.user.stationId) {
          query.stationId = req.user.stationId;
        }
        // If staff has no stationId, they won't see any customers (for security)
      }
      
      // Default to false (show active) if not specified, otherwise check if it's 'true'
      if (showArchived === 'true' || showArchived === true) {
        query.isArchived = true;
      } else {
        query.isArchived = false;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      // Sort options
      let sort = {};
      switch (sortBy) {
        case 'name-asc':
          sort = { name: 1 };
          break;
        case 'name-desc':
          sort = { name: -1 };
          break;
        case 'orders-asc':
          sort = { totalOrders: 1 };
          break;
        case 'orders-desc':
          sort = { totalOrders: -1 };
          break;
        case 'spent-asc':
          sort = { totalSpent: 1 };
          break;
        case 'spent-desc':
          sort = { totalSpent: -1 };
          break;
        default:
          sort = { name: 1 };
      }

      const customers = await Customer.find(query).sort(sort);

      res.status(200).json({
        success: true,
        data: customers,
        count: customers.length
      });
    } catch (error) {
      console.error('Get all customers error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Global customer search across all branches.
   * Used by staff app to look up customers from any station.
   * Does NOT filter by stationId.
   */
  static async globalSearch(req, res) {
    try {
      const { search = '', sortBy = 'name-asc', limit = 50 } = req.query;

      const trimmed = String(search).trim();
      if (!trimmed) {
        return res.status(200).json({
          success: true,
          data: [],
          count: 0,
        });
      }

      const query = {
        $or: [
          { name: { $regex: trimmed, $options: 'i' } },
          { email: { $regex: trimmed, $options: 'i' } },
          { phone: { $regex: trimmed, $options: 'i' } },
        ],
      };

      // Exclude archived customers from global search by default
      query.isArchived = false;

      // Sort options (reuse same shape as getAllCustomers)
      let sort = {};
      switch (sortBy) {
        case 'name-asc':
          sort = { name: 1 };
          break;
        case 'name-desc':
          sort = { name: -1 };
          break;
        case 'orders-asc':
          sort = { totalOrders: 1 };
          break;
        case 'orders-desc':
          sort = { totalOrders: -1 };
          break;
        case 'spent-asc':
          sort = { totalSpent: 1 };
          break;
        case 'spent-desc':
          sort = { totalSpent: -1 };
          break;
        default:
          sort = { name: 1 };
      }

      const numericLimit = Math.min(Number(limit) || 50, 200);

      const customers = await Customer.find(query)
        .sort(sort)
        .limit(numericLimit);

      res.status(200).json({
        success: true,
        data: customers,
        count: customers.length,
      });
    } catch (error) {
      console.error('Global customer search error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  // Get single customer
  static async getCustomer(req, res) {
    try {
      const { id } = req.params;
      const customer = await Customer.findById(id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Staff can only view customers from their station
      if (req.user.role === 'staff') {
        if (req.user.stationId && customer.stationId !== req.user.stationId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only view customers from your station.'
          });
        }
        if (!req.user.stationId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. No station assigned.'
          });
        }
      }

      res.status(200).json({
        success: true,
        data: customer
      });
    } catch (error) {
      console.error('Get customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create customer (both admin and staff can create)
  static async createCustomer(req, res) {
    try {
      const { name, email, phone, notes, stationId: stationIdFromBody } = req.body;

      if (!name || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Name and phone are required'
        });
      }

      // Check if customer already exists
      const queryConditions = [{ phone: phone }];
      
      // Only check email if it's provided and not empty
      if (email && email.trim() !== '') {
        queryConditions.push({ email: email.toLowerCase() });
      }
      
      const existingCustomer = await Customer.findOne({
        $or: queryConditions
      });

      if (existingCustomer) {
        return res.status(409).json({
          success: false,
          message: 'Customer with this phone or email already exists',
          data: existingCustomer // Include existing customer data
        });
      }

      // Use the same station ID logic: prefer stationId from body (admin selecting branch), then user's stationId, then null
      const customerStationId = stationIdFromBody || req.user.stationId || null;

      const customer = new Customer({
        name,
        email: email?.toLowerCase(),
        phone,
        notes: notes || '',
        stationId: customerStationId
      });

      await customer.save();
      // Notify admins about new customer
      try {
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
        const notifyPromises = admins.map(a => 
          NotificationController.createNotification(
            a._id,
            'system',
            'New Customer Added',
            `${name} was added to customers`,
            customer._id.toString()
          )
        );
        await Promise.all(notifyPromises);
      } catch (notifyErr) {
        console.error('Notification (customer create) error:', notifyErr);
      }

      // Log audit event
      await auditLogger.logDataModification('create', req.user._id, 'customer', customer._id.toString(), {
        method: req.method,
        endpoint: req.originalUrl || req.url,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userEmail: req.user.email,
        userRole: req.user.role,
        status: 'success',
        changes: { name, phone, email }
      }).catch(err => console.error('Audit logging error:', err));

      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data: customer
      });
    } catch (error) {
      console.error('Create customer error:', error);
      
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

  // Update customer (both admin and staff can update)
  static async updateCustomer(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone, notes } = req.body;

      const customer = await Customer.findById(id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Staff can only update customers from their station
      if (req.user.role === 'staff') {
        if (req.user.stationId && customer.stationId !== req.user.stationId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only update customers from your station.'
          });
        }
        if (!req.user.stationId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. No station assigned.'
          });
        }
      }

      // Store original phone before update (for syncing to other branch records)
      const originalPhone = customer.phone;
      const isPhoneChanging = phone && phone !== originalPhone;

      if (name) customer.name = name;
      if (email) customer.email = email.toLowerCase();
      if (phone) customer.phone = phone;
      if (notes !== undefined) customer.notes = notes;

      await customer.save();

      // Sync name, email, and phone to all other branch records with the same phone number
      // Use original phone (before update) to find all records representing the same real-world customer
      const phoneToSync = originalPhone || customer.phone;
      if (phoneToSync) {
        const updateFields = {};
        if (name) updateFields.name = name;
        if (email) updateFields.email = email.toLowerCase();
        // If phone is being changed, sync the new phone to all records with the old phone
        if (isPhoneChanging && phone) {
          updateFields.phone = phone;
        }
        
        // Only sync if there are fields to update
        if (Object.keys(updateFields).length > 0) {
          await Customer.updateMany(
            {
              phone: phoneToSync,
              _id: { $ne: customer._id }, // Exclude the current record (already updated)
            },
            { $set: updateFields }
          );
        }
      }

      // Notify admins about customer update
      try {
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
        const notifyPromises = admins.map(a => 
          NotificationController.createNotification(
            a._id,
            'system',
            'Customer Updated',
            `${customer.name} information was updated`,
            customer._id.toString()
          )
        );
        await Promise.all(notifyPromises);
      } catch (notifyErr) {
        console.error('Notification (customer update) error:', notifyErr);
      }

      // Log audit event
      await auditLogger.logDataModification('update', req.user._id, 'customer', id, {
        method: req.method,
        endpoint: req.originalUrl || req.url,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userEmail: req.user.email,
        userRole: req.user.role,
        status: 'success',
        changes: { name, phone, email }
      }).catch(err => console.error('Audit logging error:', err));

      res.status(200).json({
        success: true,
        message: 'Customer updated successfully',
        data: customer
      });
    } catch (error) {
      console.error('Update customer error:', error);
      
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
   * Assign a customer to a specific station (branch).
   *
   * If the customer already belongs to another branch, we DO NOT transfer them.
   * Instead, we:
   * - Check if a customer with the same phone already exists in the target branch.
   *   - If yes, return that existing customer (no changes).
   * - If not, CREATE a new customer record for the target branch, copying core fields
   *   (name, email, phone, notes) but resetting branch-specific stats (orders, totals, points).
   *
   * This allows the same real-world customer to exist in multiple branches without
   * losing history from their original branch.
   *
   * Permissions:
   * - Staff: can assign to their own station only.
   * - Admin: can assign to any provided stationId, or their own if omitted.
   */
  static async assignCustomerToStation(req, res) {
    try {
      const { id } = req.params;
      const { stationId: stationIdFromBody } = req.body || {};

      const customer = await Customer.findById(id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found',
        });
      }

      let targetStationId = null;

      if (req.user.role === 'admin') {
        targetStationId = stationIdFromBody || req.user.stationId || null;
      } else if (req.user.role === 'staff') {
        if (!req.user.stationId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. No station assigned to your account.',
          });
        }
        targetStationId = req.user.stationId;
      }

      if (!targetStationId) {
        return res.status(400).json({
          success: false,
          message: 'Target station could not be determined.',
        });
      }

      // If a customer with same phone already exists in target station, just return it
      if (customer.phone) {
        const existingInTarget = await Customer.findOne({
          phone: customer.phone,
          stationId: targetStationId,
        });

        if (existingInTarget) {
          // Ensure points are synced with source record (shared points)
          if (typeof customer.points === 'number') {
            existingInTarget.points = customer.points;
            await existingInTarget.save();
          }

          return res.status(200).json({
            success: true,
            message: 'Customer already exists in this station; using existing record.',
            data: existingInTarget,
          });
        }
      }

      let resultCustomer;

      if (customer.stationId && customer.stationId !== targetStationId) {
        // Customer belongs to another branch – create a new record for this branch
        const newCustomer = new Customer({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          notes: customer.notes || '',
          stationId: targetStationId,
          // Reset branch-specific stats for the new branch
          totalOrders: 0,
          totalSpent: 0,
          lastOrder: null,
          // Points are shared across branches for the same real-world customer
          points: customer.points || 0,
        });

        await newCustomer.save();
        resultCustomer = newCustomer;

        // Log creation for this branch
        await auditLogger
          .logDataModification('create', req.user._id, 'customer', newCustomer._id.toString(), {
            method: req.method,
            endpoint: req.originalUrl || req.url,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            userEmail: req.user.email,
            userRole: req.user.role,
            status: 'success',
            changes: {
              name: newCustomer.name,
              phone: newCustomer.phone,
              email: newCustomer.email,
              stationId: targetStationId,
              sourceCustomerId: customer._id.toString(),
            },
          })
          .catch((err) => console.error('Audit logging error (assignCustomerToStation:create):', err));
      } else {
        // Customer has no station yet or is already in this station – just ensure stationId is set
        customer.stationId = targetStationId;
        await customer.save();
        resultCustomer = customer;

        await auditLogger
          .logDataModification('update', req.user._id, 'customer', customer._id.toString(), {
            method: req.method,
            endpoint: req.originalUrl || req.url,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            userEmail: req.user.email,
            userRole: req.user.role,
            status: 'success',
            changes: {
              stationId: targetStationId,
            },
          })
          .catch((err) => console.error('Audit logging error (assignCustomerToStation:update):', err));
      }

      return res.status(200).json({
        success: true,
        message: 'Customer is now available in this station.',
        data: resultCustomer,
      });
    } catch (error) {
      console.error('Assign customer to station error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  // Archive customer (admin only)
  static async archiveCustomer(req, res) {
    try {
      const { id } = req.params;

      const customer = await Customer.findByIdAndUpdate(
        id,
        { isArchived: true },
        { new: true }
      );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Notify admins about customer archive
      try {
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
        const notifyPromises = admins.map(a => 
          NotificationController.createNotification(
            a._id,
            'system',
            'Customer Archived',
            `${customer?.name || 'Customer'} was archived`,
            id
          )
        );
        await Promise.all(notifyPromises);
      } catch (notifyErr) {
        console.error('Notification (customer archive) error:', notifyErr);
      }

      res.status(200).json({
        success: true,
        message: 'Customer archived successfully',
        data: customer
      });
    } catch (error) {
      console.error('Archive customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Unarchive customer (admin only)
  static async unarchiveCustomer(req, res) {
    try {
      const { id } = req.params;

      const customer = await Customer.findByIdAndUpdate(
        id,
        { isArchived: false },
        { new: true }
      );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Notify admins about customer unarchive
      try {
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
        const notifyPromises = admins.map(a => 
          NotificationController.createNotification(
            a._id,
            'system',
            'Customer Unarchived',
            `${customer?.name || 'Customer'} was unarchived`,
            id
          )
        );
        await Promise.all(notifyPromises);
      } catch (notifyErr) {
        console.error('Notification (customer unarchive) error:', notifyErr);
      }

      res.status(200).json({
        success: true,
        message: 'Customer unarchived successfully',
        data: customer
      });
    } catch (error) {
      console.error('Unarchive customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete customer (admin only - permanent deletion)
  static async deleteCustomer(req, res) {
    try {
      const { id } = req.params;

      const customer = await Customer.findByIdAndDelete(id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Log audit event
      await auditLogger.logDataModification('delete', req.user._id, 'customer', id, {
        method: req.method,
        endpoint: req.originalUrl || req.url,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userEmail: req.user.email,
        userRole: req.user.role,
        status: 'success',
        changes: { name: customer.name, phone: customer.phone }
      }).catch(err => console.error('Audit logging error:', err));

      res.status(200).json({
        success: true,
        message: 'Customer deleted permanently'
      });
    } catch (error) {
      console.error('Delete customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = CustomerController;


const Customer = require('../models/CustomerModel');
const User = require('../models/UserModel');
const NotificationController = require('./NotificationController');

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
      const { name, email, phone, notes } = req.body;

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
          message: 'Customer with this phone or email already exists'
        });
      }

      const customer = new Customer({
        name,
        email: email?.toLowerCase(),
        phone,
        notes: notes || '',
        stationId: req.user.stationId || null
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

      if (name) customer.name = name;
      if (email) customer.email = email.toLowerCase();
      if (phone) customer.phone = phone;
      if (notes !== undefined) customer.notes = notes;

      await customer.save();

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


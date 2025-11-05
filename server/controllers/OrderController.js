const mongoose = require('mongoose');
const Order = require('../models/OrderModel');
const Customer = require('../models/CustomerModel');
const Discount = require('../models/DiscountModel');
const User = require('../models/UserModel');
const NotificationController = require('../controllers/NotificationController');

class OrderController {
  // Get all orders with role-based filtering
  static async getAllOrders(req, res) {
    try {
      const { search, payment, showArchived = false, showDrafts = false } = req.query;

      const query = {};
      
      // Draft filtering takes precedence over archive filtering
      if (showDrafts === 'true' || showDrafts === true) {
        query.isDraft = true;
        // Show drafts regardless of archive status when viewing drafts
      } else {
        // When not viewing drafts, exclude drafts (show only regular orders)
        query.isDraft = { $ne: true }; // Not equal to true (includes false and undefined/null)
        // Normal archive filtering when not viewing drafts
        if (showArchived === 'true' || showArchived === true) {
          query.isArchived = true;
        } else {
          query.isArchived = false;
        }
      }

      // Staff can only see orders from their station
      if (req.user.role === 'staff') {
        if (req.user.stationId) {
          query.stationId = req.user.stationId;
        } else {
          // Fallback to createdBy if stationId is not set (backward compatibility)
        query.createdBy = req.user._id;
        }
      }

      if (search) {
        query.$or = [
          { id: { $regex: search, $options: 'i' } },
          { customer: { $regex: search, $options: 'i' } }
        ];
      }

      if (payment && payment !== 'All') {
        query.payment = payment;
      }

      const orders = await Order.find(query)
        .populate('createdBy', 'username email fullName')
        .populate('lastEditedBy', 'username email fullName')
        .populate('customerId', 'name email phone')
        .sort({ date: -1 });

      res.status(200).json({
        success: true,
        data: orders,
        count: orders.length
      });
    } catch (error) {
      console.error('Get all orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get single order
  static async getOrder(req, res) {
    try {
      // Decode the ID in case it was URL encoded
      const { id } = req.params;
      const decodedId = decodeURIComponent(id);
      const order = await Order.findOne({ id: decodedId })
        .populate('createdBy', 'username email fullName')
        .populate('lastEditedBy', 'username email fullName')
        .populate('customerId', 'name email phone address')
        .populate('discountId', 'code name type value');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Staff can only view orders from their station
      if (req.user.role === 'staff') {
        if (req.user.stationId) {
          // Check if order belongs to staff's station
          if (order.stationId !== req.user.stationId) {
            return res.status(403).json({
              success: false,
              message: 'Access denied. You can only view orders from your station.'
            });
          }
        } else {
          // Fallback: check if order was created by this staff member
          if (order.createdBy._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own orders.'
        });
          }
        }
      }

      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create order (both admin and staff can create)
  static async createOrder(req, res) {
    try {
      const { 
        customer, 
        customerPhone, 
        items, 
        discountId, 
        paid, 
        pickupDate, 
        notes,
        payment,
        draftId,
        stationId: stationIdFromBody 
      } = req.body;

      if (!customer || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Customer name and at least one item are required'
        });
      }

      // Check if customer exists, create if not
      let customerDoc = await Customer.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${customer}$`, 'i') } }, // Case-insensitive match
          { phone: customerPhone || '' }
        ]
      });

      if (!customerDoc) {
        customerDoc = new Customer({
          name: customer.trim(),
          phone: customerPhone ? customerPhone.trim() : '',
          totalOrders: 0,
          totalSpent: 0,
          stationId: req.user.stationId || null
        });
        await customerDoc.save();
      }

      // Generate unique order ID
      let orderId;
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        const orderCount = await Order.countDocuments();
        orderId = `#ORD-2024-${String(orderCount + 1 + attempts).padStart(3, '0')}`;
        const existingOrder = await Order.findOne({ id: orderId });
        if (!existingOrder) {
          isUnique = true;
        } else {
          attempts++;
        }
      }
      
      if (!isUnique || !orderId) {
        // Fallback: use timestamp-based ID
        const timestamp = Date.now();
        orderId = `#ORD-${timestamp}`;
        // Double-check uniqueness of timestamp-based ID
        const existingOrder = await Order.findOne({ id: orderId });
        if (existingOrder) {
          orderId = `#ORD-${timestamp}-${Math.random().toString(36).substr(2, 5)}`;
        }
      }
      
      // Ensure orderId is never null or undefined
      if (!orderId || orderId.trim() === '') {
        throw new Error('Failed to generate order ID');
      }

      // Calculate total
      let totalAmount = 0;
      // In a real app, you'd fetch service prices from database
      // For now, we'll use the amount from items if provided
      items.forEach(item => {
        totalAmount += item.amount || 0;
      });

      // Apply discount if provided
      let discountAmount = 0;
      let discountCode = '0%';
      if (discountId) {
        try {
          // Validate if discountId is a valid MongoDB ObjectId
          if (mongoose.Types.ObjectId.isValid(discountId)) {
            const discount = await Discount.findById(discountId);
            if (discount && discount.isActive && !discount.isArchived) {
              const now = new Date();
              const validFrom = discount.validFrom ? new Date(discount.validFrom) : new Date(0);
              const validUntil = discount.validUntil ? new Date(discount.validUntil) : new Date('2100-01-01');
              
              if (validFrom <= now && validUntil >= now) {
                if (discount.type === 'percentage') {
                  discountAmount = totalAmount * (discount.value / 100);
                } else {
                  discountAmount = discount.value;
                }
                discountCode = discount.type === 'percentage' 
                  ? `${discount.value}%` 
                  : `₱${discount.value}`;
                
                // Update discount usage
                discount.usageCount += 1;
                await discount.save();
              }
            }
          }
        } catch (discountError) {
          console.error('Discount processing error:', discountError);
          // Continue without discount if there's an error
        }
      }

      const finalTotal = totalAmount - discountAmount;
      const paidAmount = paid || 0;
      const balanceAmount = finalTotal - paidAmount;
      const changeAmount = paidAmount > finalTotal ? paidAmount - finalTotal : 0;
      const paymentStatus = balanceAmount <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Unpaid');

      const order = new Order({
        id: orderId,
        customer: customer,
        customerPhone: customerPhone || '',
        customerId: customerDoc._id,
        items: items,
        discount: discountCode,
        discountId: discountId || null,
        total: `₱${finalTotal.toFixed(2)}`,
        paid: paidAmount,
        balance: `₱${Math.max(0, balanceAmount).toFixed(2)}`,
        change: changeAmount,
        payment: paymentStatus,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        notes: notes || '',
        createdBy: req.user._id,
        // Prefer explicit station from request when provided (admin creating for a branch)
        stationId: stationIdFromBody || req.user.stationId || null
      });

      await order.save();

      // If this order was created from a draft, link the draft to this order
      if (draftId) {
        try {
          const draftOrder = await Order.findOne({ id: draftId, isDraft: true });
          if (draftOrder) {
            draftOrder.convertedOrderId = order.id;
            await draftOrder.save();
          }
        } catch (draftError) {
          console.error('Error linking draft to order:', draftError);
          // Continue even if draft linking fails
        }
      }

      // Update customer stats
      customerDoc.totalOrders += 1;
      customerDoc.totalSpent += finalTotal;
      customerDoc.lastOrder = new Date();
      await customerDoc.save();

      await order.populate('createdBy', 'username email');
      await order.populate('customerId', 'name email phone');

      // Create notifications for admins about new order
      try {
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
        const notifyPromises = admins.map(a => 
          NotificationController.createNotification(
            a._id,
            'order',
            'New Order Created',
            `Order ${order.id} for ${order.customer} was created`,
            order.id,
            { amount: order.total, payment: order.payment }
          )
        );
        await Promise.all(notifyPromises);
      } catch (notifyErr) {
        console.error('Notification (new order) error:', notifyErr);
      }

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order
      });
    } catch (error) {
      console.error('Create order error:', error);
      console.error('Error stack:', error.stack);
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors
        });
      }

      // Send more detailed error message in development
      const errorMessage = process.env.NODE_ENV === 'development' 
        ? error.message || 'Internal server error'
        : 'Internal server error';

      res.status(500).json({
        success: false,
        message: errorMessage
      });
    }
  }

  // Save draft order
  static async saveDraft(req, res) {
    try {
      const { 
        customer, 
        customerPhone, 
        items, 
        discountId, 
        paid, 
        pickupDate, 
        notes,
        isDraft,
        total,
        balance,
        payment
      } = req.body;

      if (!customer || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Customer name and at least one item are required'
        });
      }

      // Check if customer exists, create if not
      let customerDoc = await Customer.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${customer}$`, 'i') } },
          { phone: customerPhone || '' }
        ]
      });

      if (!customerDoc) {
        customerDoc = new Customer({
          name: customer.trim(),
          phone: customerPhone ? customerPhone.trim() : '',
          totalOrders: 0,
          totalSpent: 0,
          stationId: req.user.stationId || null
        });
        await customerDoc.save();
      }

      // Generate unique draft ID
      let orderId;
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        const orderCount = await Order.countDocuments({ isDraft: true });
        orderId = `#DRAFT-${Date.now()}-${String(orderCount + 1 + attempts).padStart(3, '0')}`;
        const existingOrder = await Order.findOne({ id: orderId });
        if (!existingOrder) {
          isUnique = true;
        } else {
          attempts++;
        }
      }
      
      if (!isUnique || !orderId) {
        orderId = `#DRAFT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      }

      // Calculate total if not provided
      let finalTotal = 0;
      if (total) {
        finalTotal = parseFloat(total.replace(/[^0-9.]/g, '')) || 0;
      } else {
        items.forEach(item => {
          finalTotal += item.amount || 0;
        });
      }

      const paidAmount = paid || 0;
      const balanceAmount = finalTotal - paidAmount;
      const changeAmount = paidAmount > finalTotal ? paidAmount - finalTotal : 0;

      const order = new Order({
        id: orderId,
        customer: customer,
        customerPhone: customerPhone || '',
        customerId: customerDoc._id,
        items: items,
        discount: '0%', // Will be calculated if needed
        discountId: discountId || null,
        total: total || `₱${finalTotal.toFixed(2)}`,
        paid: paidAmount,
        balance: balance || `₱${Math.max(0, balanceAmount).toFixed(2)}`,
        change: changeAmount,
        payment: payment || 'Unpaid',
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        notes: notes || '',
        createdBy: req.user._id,
        stationId: req.user.stationId || null,
        isDraft: true
      });

      await order.save();

      await order.populate('createdBy', 'username email');
      await order.populate('customerId', 'name email phone');

      res.status(201).json({
        success: true,
        message: 'Draft saved successfully',
        data: order
      });
    } catch (error) {
      console.error('Save draft error:', error);
      console.error('Error stack:', error.stack);
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors
        });
      }

      const errorMessage = process.env.NODE_ENV === 'development' 
        ? error.message || 'Internal server error'
        : 'Internal server error';

      res.status(500).json({
        success: false,
        message: errorMessage
      });
    }
  }

  // Update order (both admin and staff can update, but staff only their own)
  static async updateOrder(req, res) {
    try {
      // Decode the ID in case it was URL encoded
      const { id } = req.params;
      const decodedId = decodeURIComponent(id);
      const { items, discountId, paid, pickupDate, notes, payment } = req.body;

      const order = await Order.findOne({ id: decodedId });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Staff can only update orders from their station
      if (req.user.role === 'staff') {
        if (req.user.stationId) {
          if (order.stationId !== req.user.stationId) {
            return res.status(403).json({
              success: false,
              message: 'Access denied. You can only update orders from your station.'
            });
          }
        } else {
          // Fallback: check if order was created by this staff member
          if (order.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own orders.'
        });
          }
        }
      }

      // Track previous payment status to detect transitions
      const previousPaymentStatus = order.payment;

      if (items && Array.isArray(items) && items.length > 0) {
        order.items = items;
      }
      if (discountId !== undefined) order.discountId = discountId;
      if (paid !== undefined) order.paid = paid;
      if (pickupDate !== undefined) order.pickupDate = pickupDate ? new Date(pickupDate) : null;
      if (notes !== undefined) order.notes = notes;
      if (payment) order.payment = payment;

      // Track who edited the order
      order.lastEditedBy = req.user._id;
      order.lastEditedAt = new Date();

      // Recalculate totals if items changed or paid amount changed
      const needsRecalculation = (items && Array.isArray(items) && items.length > 0) || paid !== undefined;
      
      if (needsRecalculation) {
        let totalAmount = 0;
        
        // Recalculate total from items if items were provided
        if (items && Array.isArray(items) && items.length > 0) {
        items.forEach(item => {
          totalAmount += item.amount || 0;
        });
        } else {
          // Use existing total
          totalAmount = parseFloat(order.total.replace(/[^0-9.]/g, '')) || 0;
        }

        // Apply discount if exists
        let discountAmount = 0;
        if (order.discountId) {
          const discount = await Discount.findById(order.discountId);
          if (discount && discount.isActive) {
            if (discount.type === 'percentage') {
              discountAmount = totalAmount * (discount.value / 100);
            } else {
              discountAmount = discount.value;
            }
          }
        }

        const finalTotal = totalAmount - discountAmount;
        const paidAmount = paid !== undefined ? paid : (order.paid || 0);
        const balanceAmount = finalTotal - paidAmount;
        const changeAmount = paidAmount > finalTotal ? paidAmount - finalTotal : 0;
        
        order.total = `₱${finalTotal.toFixed(2)}`;
        order.balance = `₱${Math.max(0, balanceAmount).toFixed(2)}`;
        order.change = changeAmount;
        
        if (!payment) {
          order.payment = balanceAmount <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Unpaid');
        }
      }

      await order.save();
      await order.populate('createdBy', 'username email fullName');
      await order.populate('lastEditedBy', 'username email fullName');
      await order.populate('customerId', 'name email phone');

      // Notify admins if payment status transitioned to Paid
      try {
        if (previousPaymentStatus !== 'Paid' && order.payment === 'Paid') {
          const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
          const notifyPromises = admins.map(a =>
            NotificationController.createNotification(
              a._id,
              'payment',
              'Order Paid',
              `Order ${order.id} has been fully paid`,
              order.id,
              { amount: order.total }
            )
          );
          await Promise.all(notifyPromises);
        }
      } catch (notifyErr) {
        console.error('Notification (order paid) error:', notifyErr);
      }

      res.status(200).json({
        success: true,
        message: 'Order updated successfully',
        data: order
      });
    } catch (error) {
      console.error('Update order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Archive order (admin only)
  static async archiveOrder(req, res) {
    try {
      // Decode the ID in case it was URL encoded
      const { id } = req.params;
      const decodedId = decodeURIComponent(id);

      const order = await Order.findOneAndUpdate(
        { id: decodedId },
        { isArchived: true },
        { new: true }
      ).populate('createdBy', 'username email');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Order archived successfully',
        data: order
      });
    } catch (error) {
      console.error('Archive order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Unarchive order (admin only)
  static async unarchiveOrder(req, res) {
    try {
      // Decode the ID in case it was URL encoded
      const { id } = req.params;
      const decodedId = decodeURIComponent(id);

      const order = await Order.findOneAndUpdate(
        { id: decodedId },
        { isArchived: false },
        { new: true }
      ).populate('createdBy', 'username email');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Order unarchived successfully',
        data: order
      });
    } catch (error) {
      console.error('Unarchive order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Mark draft order as completed
  static async markDraftAsCompleted(req, res) {
    try {
      const { id } = req.params;
      const decodedId = decodeURIComponent(id);

      const order = await Order.findOne({ id: decodedId });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (!order.isDraft) {
        return res.status(400).json({
          success: false,
          message: 'Only draft orders can be marked as completed'
        });
      }

      // Check if draft has been converted to an actual order
      if (!order.convertedOrderId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot mark draft as completed. No actual order has been created from this draft yet.'
        });
      }

      // Verify the converted order actually exists
      const convertedOrder = await Order.findOne({ 
        id: order.convertedOrderId,
        isDraft: false 
      });

      if (!convertedOrder) {
        return res.status(400).json({
          success: false,
          message: 'Cannot mark draft as completed. The linked order no longer exists.'
        });
      }

      order.isCompleted = true;
      await order.save();

      res.status(200).json({
        success: true,
        message: 'Draft marked as completed',
        data: {
          ...order.toObject(),
          convertedOrderId: order.convertedOrderId
        }
      });
    } catch (error) {
      console.error('Mark draft as completed error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Schedule draft deletion (30 days from now)
  static async scheduleDraftDeletion(req, res) {
    try {
      const { id } = req.params;
      const decodedId = decodeURIComponent(id);

      const order = await Order.findOne({ id: decodedId });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (!order.isDraft) {
        return res.status(400).json({
          success: false,
          message: 'Only draft orders can be scheduled for deletion'
        });
      }

      // Schedule deletion 30 days from now
      const deleteDate = new Date();
      deleteDate.setDate(deleteDate.getDate() + 30);

      order.scheduledDeleteAt = deleteDate;
      await order.save();

      res.status(200).json({
        success: true,
        message: `Draft scheduled for deletion on ${deleteDate.toLocaleDateString()}`,
        data: {
          ...order.toObject(),
          scheduledDeleteAt: deleteDate.toISOString()
        }
      });
    } catch (error) {
      console.error('Schedule draft deletion error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete order permanently (admin only)
  static async deleteOrder(req, res) {
    try {
      // Decode the ID in case it was URL encoded
      const { id } = req.params;
      const decodedId = decodeURIComponent(id);

      const order = await Order.findOneAndDelete({ id: decodedId });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Order deleted permanently'
      });
    } catch (error) {
      console.error('Delete order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = OrderController;

const mongoose = require('mongoose');
const Order = require('../models/OrderModel');
const Customer = require('../models/CustomerModel');
const Discount = require('../models/DiscountModel');
const User = require('../models/UserModel');
const Station = require('../models/StationModel');
const NotificationController = require('../controllers/NotificationController');
const emailService = require('../utils/emailService');
const smsService = require('../utils/smsService');
const pdfService = require('../utils/pdfService');
const TransactionWrapper = require('../utils/transactionWrapper');
const auditLogger = require('../utils/auditLogger');
const LockManager = require('../utils/lockManager');
const Lock = require('../models/LockModel');
const SystemSetting = require('../models/SystemSettingModel');

// Default points configuration used when no system setting is stored.
// enabled: whether customers can earn new points
// pesoToPointMultiplier: points earned per ₱1 paid (e.g. 0.01 = 0.01 pts per ₱1)
const DEFAULT_POINTS_CONFIG = {
  enabled: true,
  pesoToPointMultiplier: 0.01,
};

async function getPointsConfig() {
  try {
    const setting = await SystemSetting.findOne({ key: 'points.global' });
    const value = setting?.value || {};
    return {
      enabled: typeof value.enabled === 'boolean' ? value.enabled : DEFAULT_POINTS_CONFIG.enabled,
      pesoToPointMultiplier:
        typeof value.pesoToPointMultiplier === 'number'
          ? value.pesoToPointMultiplier
          : DEFAULT_POINTS_CONFIG.pesoToPointMultiplier,
    };
  } catch (error) {
    console.error('Error loading points configuration, using defaults:', error);
    return { ...DEFAULT_POINTS_CONFIG };
  }
}

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
      console.log('=== Create Order Request ===');
      console.log('Body:', JSON.stringify(req.body, null, 2));
      console.log('User:', req.user ? { id: req.user._id, role: req.user.role, stationId: req.user.stationId } : 'No user');
      
      // Check authentication
      if (!req.user || !req.user._id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please log in.'
        });
      }
      
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
        stationId: stationIdFromBody,
        skipCustomerCreation = false,
        pointsUsed = 0
      } = req.body;

      // Prepare resources for 2PL locking
      const resourcesToLock = [];
      
      // Lock customer if we're creating/updating one
      if (!skipCustomerCreation && customer) {
        // Use customer name/phone as resource ID for locking
        const customerResourceId = customerPhone 
          ? `customer_${customerPhone.trim()}` 
          : `customer_${customer.trim().toLowerCase()}`;
        resourcesToLock.push({
          resourceId: customerResourceId,
          resourceType: 'customer',
          lockType: 'exclusive'
        });
      }

      // Lock discount if being used
      if (discountId) {
        resourcesToLock.push({
          resourceId: String(discountId),
          resourceType: 'discount',
          lockType: 'exclusive'
        });
      }

      // Lock draft order if converting from draft
      if (draftId) {
        resourcesToLock.push({
          resourceId: String(draftId),
          resourceType: 'order',
          lockType: 'exclusive'
        });
      }

      // Enhanced validation with detailed error messages
      if (!customer || (typeof customer === 'string' && customer.trim() === '')) {
        return res.status(400).json({
          success: false,
          message: 'Customer name is required',
          received: { customer: customer || null }
        });
      }

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          message: 'Items must be an array',
          received: { items: items ? typeof items : 'missing' }
        });
      }

      if (items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one item is required',
          received: { itemsCount: 0 }
        });
      }

      // Validate each item has required fields
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.service || (typeof item.service === 'string' && item.service.trim() === '')) {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1} is missing service name`,
            itemIndex: i,
            item: item
          });
        }
        if (!item.quantity || (typeof item.quantity === 'string' && item.quantity.trim() === '')) {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1} is missing quantity`,
            itemIndex: i,
            item: item
          });
        }
        // Ensure amount is a number (default to 0 if missing)
        if (item.amount === undefined || item.amount === null) {
          item.amount = 0;
        }
        // Ensure status is set (default to 'Pending')
        if (!item.status) {
          item.status = 'Pending';
        }
        // Ensure discount is set (default to '0%')
        if (!item.discount) {
          item.discount = '0%';
        }
      }
      
      console.log('Validated items:', JSON.stringify(items, null, 2));

      // Execute order creation with 2PL concurrency control
      const order = await TransactionWrapper.withTransaction({
        resources: resourcesToLock,
        userId: req.user._id,
        operation: async (session) => {
          // Check if customer exists, create if not (unless skipCustomerCreation is true)
          let customerDoc = null;
          
          if (!skipCustomerCreation) {
            // Determine the target stationId for this order
            const targetStationId = stationIdFromBody || req.user.stationId || null;
            
            // First, try to find customer matching name/phone AND stationId (prioritize branch-specific record)
            // This ensures orders link to the correct branch-specific customer record
            if (targetStationId) {
              customerDoc = await Customer.findOne({
                $and: [
                  {
                    $or: [
                      { name: { $regex: new RegExp(`^${customer}$`, 'i') } }, // Case-insensitive match
                      { phone: customerPhone || '' }
                    ]
                  },
                  { stationId: targetStationId }
                ]
              });
            }
            
            // If not found with stationId match, fall back to finding any customer with name/phone (backward compatibility)
            if (!customerDoc) {
              customerDoc = await Customer.findOne({
                $or: [
                  { name: { $regex: new RegExp(`^${customer}$`, 'i') } }, // Case-insensitive match
                  { phone: customerPhone || '' }
                ]
              });
            }

            if (!customerDoc) {
              // Use the same station ID logic as the order: prefer stationId from body (admin selecting branch), then user's stationId, then null
              const customerStationId = stationIdFromBody || req.user.stationId || null;
              customerDoc = new Customer({
                name: customer.trim(),
                phone: customerPhone ? customerPhone.trim() : '',
                totalOrders: 0,
                totalSpent: 0,
                stationId: customerStationId
              });
              await customerDoc.save();
            }
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

          if (!orderId || orderId.trim() === '') {
            throw new Error('Failed to generate order ID');
          }

          // Calculate total
          let totalAmount = 0;
          items.forEach(item => {
            totalAmount += item.amount || 0;
          });

          // Load points system configuration from system settings
          const pointsConfig = await getPointsConfig();

          // Points system configuration
          // 1 point = ₱1 discount when redeeming
          const POINTS_TO_PESO_RATE = 1;
          // Earning rule: for every ₱1 paid, earn (pesoToPointMultiplier) points
          // Example (default): ₱100 paid, multiplier 0.01 => 1.00 point
          const PESO_TO_POINT_MULTIPLIER = pointsConfig.pesoToPointMultiplier ?? DEFAULT_POINTS_CONFIG.pesoToPointMultiplier;

          // Validate and process points usage
          let pointsDiscountAmount = 0;
          let actualPointsUsed = 0;
          if (pointsUsed && pointsUsed > 0 && customerDoc) {
            // Ensure pointsUsed is a valid number
            const pointsToUse = parseInt(String(pointsUsed)) || 0;
            if (pointsToUse <= 0) {
              throw new Error('Points to use must be a positive number.');
            }
            
            // Ensure customer has enough points
            const customerPoints = customerDoc.points || 0;
            if (customerPoints < pointsToUse) {
              throw new Error(`Insufficient points. Customer has ${customerPoints} points, but trying to use ${pointsToUse} points.`);
            }
            
            // Calculate discount from points (1 point = ₱1)
            pointsDiscountAmount = pointsToUse * POINTS_TO_PESO_RATE;
            actualPointsUsed = pointsToUse;
          }

          // Apply discount if provided
          let discountAmount = 0;
          let discountCode = '0%';
          let appliedDiscount = null;
          if (discountId) {
            if (!mongoose.Types.ObjectId.isValid(discountId)) {
              throw new Error('Invalid discount selected. Please choose a different discount.');
            }

            const discount = await Discount.findById(discountId);

            if (!discount || !discount.isActive || discount.isArchived) {
              throw new Error('This discount is no longer active.');
            }

            const now = new Date();
            const validFrom = discount.validFrom ? new Date(discount.validFrom) : new Date(0);
            const validUntil = discount.validUntil ? new Date(discount.validUntil) : new Date('2100-01-01');
            
            if (validFrom > now || validUntil < now) {
              throw new Error('This discount is not valid at this time.');
            }

            if (discount.maxUsage > 0 && discount.usageCount >= discount.maxUsage) {
              throw new Error('This discount has reached its maximum usage limit.');
            }

            if (discount.type === 'percentage') {
              discountAmount = totalAmount * (discount.value / 100);
            } else {
              discountAmount = discount.value;
            }
            discountCode = discount.type === 'percentage' 
              ? `${discount.value}%` 
              : `₱${discount.value}`;
            
            appliedDiscount = discount;
          }

          // Update discount code to include points if used
          if (actualPointsUsed > 0) {
            if (discountCode && discountCode !== '0%') {
              discountCode = `${discountCode} + ${actualPointsUsed} pts`;
            } else {
              discountCode = `${actualPointsUsed} pts`;
            }
          }

          // Calculate final total: subtotal - discount - points discount
          const finalTotal = Math.max(0, totalAmount - discountAmount - pointsDiscountAmount);
          const paidAmount = paid || 0;
          const balanceAmount = finalTotal - paidAmount;
          const changeAmount = paidAmount > finalTotal ? paidAmount - finalTotal : 0;
          const paymentStatus = balanceAmount <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Unpaid');

          // Calculate points earned based on amount paid (only if order is paid)
          // Earn points according to configured multiplier (may be disabled)
          let pointsEarned = 0;
          if (pointsConfig.enabled && paymentStatus === 'Paid' && paidAmount > 0) {
            pointsEarned = parseFloat((paidAmount * PESO_TO_POINT_MULTIPLIER).toFixed(2));
          }

          const newOrder = new Order({
            id: orderId,
            date: new Date(),
            customer: customer.trim(),
            customerPhone: customerPhone ? customerPhone.trim() : '',
            customerId: customerDoc ? customerDoc._id : null,
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
            stationId: stationIdFromBody || req.user.stationId || null,
            pointsEarned: pointsEarned,
            pointsUsed: actualPointsUsed
          });
          
          await newOrder.save();

          // Update discount usage count
          if (appliedDiscount) {
            appliedDiscount.usageCount += 1;
            await appliedDiscount.save();
          }

          // If this order was created from a draft, link the draft to this order
          if (draftId) {
            const draftOrder = await Order.findOne({ id: draftId, isDraft: true });
            if (draftOrder) {
              draftOrder.convertedOrderId = newOrder.id;
              await draftOrder.save();
            }
          }

          // Update customer stats (only if customer exists in system)
          if (customerDoc) {
            customerDoc.totalOrders += 1;
            customerDoc.totalSpent += finalTotal;
            customerDoc.lastOrder = new Date();

            // Update customer points: deduct points used, add points earned
            const currentPoints = customerDoc.points || 0;
            let newPoints = currentPoints;

            // Deduct points used
            if (actualPointsUsed > 0) {
              newPoints = Math.max(0, newPoints - actualPointsUsed);
            }

            // Add points earned (only if order is paid)
            if (pointsEarned > 0) {
              newPoints = newPoints + pointsEarned;
            }

            customerDoc.points = newPoints;
            await customerDoc.save();

            // Keep points in sync for the same real-world customer across branches
            if (customerDoc.phone) {
              await Customer.updateMany(
                {
                  phone: customerDoc.phone,
                  _id: { $ne: customerDoc._id },
                },
                { $set: { points: newPoints } }
              );
            }
          }

          await newOrder.populate('createdBy', 'username email');
          await newOrder.populate('customerId', 'name email phone');

          // Create notifications for admins about new order
          try {
            const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
            const notifyPromises = admins.map(a => 
              NotificationController.createNotification(
                a._id,
                'order',
                'New Order Created',
                `Order ${newOrder.id} for ${newOrder.customer} was created`,
                newOrder.id,
                { amount: newOrder.total, payment: newOrder.payment }
              )
            );
            await Promise.all(notifyPromises);
          } catch (notifyErr) {
            console.error('Notification (new order) error:', notifyErr);
          }

          return newOrder;
        }
      });

      // Log audit event
      await auditLogger.logDataModification('create', req.user._id, 'order', order.id, {
        method: req.method,
        endpoint: req.originalUrl || req.url,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userEmail: req.user.email,
        userRole: req.user.role,
        status: 'success',
        changes: {
          customer: order.customer,
          total: order.total,
          items: order.items.length
        }
      }).catch(err => console.error('Audit logging error:', err));

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
        payment,
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
          { name: { $regex: new RegExp(`^${customer}$`, 'i') } },
          { phone: customerPhone || '' }
        ]
      });

      if (!customerDoc) {
        // Use the same station ID logic as the order: prefer stationId from body (admin selecting branch), then user's stationId, then null
        const customerStationId = stationIdFromBody || req.user.stationId || null;
        customerDoc = new Customer({
          name: customer.trim(),
          phone: customerPhone ? customerPhone.trim() : '',
          totalOrders: 0,
          totalSpent: 0,
          stationId: customerStationId
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
      const userId = req.user._id;

      // Check if user already has a frontend edit lock on this order
      const existingEditLock = await Lock.findOne({
        resourceId: decodedId,
        resourceType: 'order',
        status: 'active',
        userId: userId
      });

      // If user has a frontend edit lock, use it directly without acquiring a new 2PL lock
      // Otherwise, use 2PL locking for concurrency control
      if (existingEditLock) {
        // User has frontend edit lock - proceed with update directly
        const order = await Order.findOne({ id: decodedId });

        if (!order) {
          return res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        }

        // Check if order is completed and locked
        if (order.isCompleted) {
          return res.status(400).json({
            success: false,
            message: 'This order has been marked as completed and cannot be edited.'
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
            if (order.createdBy.toString() !== userId.toString()) {
              return res.status(403).json({
                success: false,
                message: 'Access denied. You can only update your own orders.'
              });
            }
          }
        }

        // Track previous payment status to detect transitions
        const previousPaymentStatus = order.payment;
        
        // Track previous item statuses to detect status changes
        const previousItemStatuses = order.items ? order.items.map(item => item.status) : [];
        let statusChanged = false;
        let newStatus = null;

        // Update order fields
        if (items !== undefined) {
          order.items = items;
          
          // Check if status changed
          if (items && items.length > 0) {
            const currentStatuses = items.map(item => item.status);
            statusChanged = JSON.stringify(currentStatuses) !== JSON.stringify(previousItemStatuses);
            if (statusChanged && items[0]?.status) {
              newStatus = items[0].status;
            }
          }
        }

        if (discountId !== undefined) {
          order.discountId = discountId;
          if (discountId) {
            const discount = await Discount.findById(discountId);
            if (discount) {
              order.discount = discount.code;
              order.discountAmount = discount.amount;
            }
          } else {
            order.discount = null;
            order.discountAmount = 0;
          }
        }

        if (paid !== undefined) {
          order.paid = paid;
        }

        if (pickupDate !== undefined) {
          order.pickupDate = pickupDate;
        }

        if (notes !== undefined) {
          order.notes = notes;
        }

        if (payment !== undefined) {
          order.payment = payment;
        }

        // Recalculate total if items or discount changed
        if (items !== undefined || discountId !== undefined) {
          let subtotal = 0;
          if (order.items && order.items.length > 0) {
            subtotal = order.items.reduce((sum, item) => {
              return sum + (item.amount || 0);
            }, 0);
          }
          
          const discountAmount = order.discountAmount || 0;
          // Apply points discount if points were used (1 point = ₱1)
          const POINTS_TO_PESO_RATE = 1;
          const pointsDiscountAmount = (order.pointsUsed || 0) * POINTS_TO_PESO_RATE;
          
          order.subtotal = subtotal;
          const finalTotal = Math.max(0, subtotal - discountAmount - pointsDiscountAmount);
          order.total = `₱${finalTotal.toFixed(2)}`;
          
          // Update balance
          const paidAmount = order.paid || 0;
          const balanceAmount = finalTotal - paidAmount;
          order.balance = `₱${Math.max(0, balanceAmount).toFixed(2)}`;
        } else {
          // Recalculate balance if payment changed
          const currentTotal = parseFloat(order.total.replace(/[^0-9.]/g, '')) || 0;
          const paidAmount = order.paid || 0;
          const balanceAmount = currentTotal - paidAmount;
          order.balance = `₱${Math.max(0, balanceAmount).toFixed(2)}`;
        }

        // Update change if payment is Paid
        if (order.payment === 'Paid') {
          const paidAmountForChange = order.paid || 0;
          // order.total is stored as a formatted string like "₱123.45" – parse it safely
          const numericTotalForChange =
            typeof order.total === 'string'
              ? parseFloat(order.total.replace(/[^0-9.]/g, '')) || 0
              : order.total || 0;

          let changeValue = paidAmountForChange - numericTotalForChange;
          if (!Number.isFinite(changeValue) || changeValue < 0) {
            changeValue = 0;
          }
          order.change = changeValue;
        } else {
          order.change = 0;
        }

        // Check if order should be marked as completed and locked
        // If any item status is "Completed", mark the order as completed
        if (items && Array.isArray(items) && items.length > 0) {
          const hasCompletedItem = items.some(item => item.status === 'Completed');
          if (hasCompletedItem) {
            order.isCompleted = true;
            console.log(`🔒 Order ${order.id} marked as completed and locked from further edits.`);
          }
        }

        // Update last edited tracking
        order.lastEditedBy = userId;
        order.lastEditedAt = new Date();

        // Handle points when payment status changes to Paid
        // Earn points according to configured multiplier (may be disabled)
        if (previousPaymentStatus !== 'Paid' && order.payment === 'Paid') {
          // Only grant points if they haven't been granted yet
          if (!order.pointsEarned || order.pointsEarned === 0) {
            const paidAmount = order.paid || 0;
            const pointsConfig = await getPointsConfig();
            const multiplier = pointsConfig.pesoToPointMultiplier ?? DEFAULT_POINTS_CONFIG.pesoToPointMultiplier;
            const pointsEarned = (pointsConfig.enabled && paidAmount > 0)
              ? parseFloat((paidAmount * multiplier).toFixed(2))
              : 0;
            
            if (pointsEarned > 0) {
              order.pointsEarned = pointsEarned;
              
              // Update customer points if customer exists
              if (order.customerId) {
                const customer = await Customer.findById(order.customerId);
                if (customer) {
                  const newPoints = (customer.points || 0) + pointsEarned;
                  customer.points = newPoints;
                  await customer.save();

                  // Keep points in sync for same phone across branches
                  if (customer.phone) {
                    await Customer.updateMany(
                      {
                        phone: customer.phone,
                        _id: { $ne: customer._id },
                      },
                      { $set: { points: newPoints } }
                    );
                  }
                }
              }
            }
          }
        }

        // Save the order
        await order.save();

        // Release the frontend edit lock after successful save
        await Lock.updateMany(
          {
            resourceId: decodedId,
            resourceType: 'order',
            userId: userId,
            status: 'active'
          },
          {
            status: 'released',
            releasedAt: new Date()
          }
        );

        // Populate customer for response
        await order.populate('customerId');
        await order.populate('lastEditedBy', 'username fullName email');

        // Send notifications (same as 2PL version)
        if (statusChanged && newStatus) {
          try {
            const editorName = req.user.fullName || req.user.username || 'Staff';
            if (order.customerId && order.customerId.email) {
              await NotificationController.createNotification(
                order.customerId._id,
                'order_updated',
                `Your order ${order.id} for ${order.customer} was updated by ${editorName}`,
                order.id,
                { 
                  orderId: order.id,
                  customer: order.customer,
                  editedBy: editorName,
                  lastEditedAt: order.lastEditedAt
                }
              );
            }
          } catch (notifyErr) {
            console.error('Notification (order update) error:', notifyErr);
          }

          // Send SMS and Email notifications when order status changes
          if (newStatus === 'In Progress' || newStatus === 'Completed') {
            try {
              const customer = order.customerId;
              
              if (customer) {
                const customerName = customer.name || order.customer || 'Valued Customer';
                const customerEmail = customer.email;
                const customerPhone = customer.phone || order.customerPhone;
                const orderId = order.id;
                const orderTotal = order.total;
                const pickupDate = order.pickupDate;

                const statusMessage = newStatus === 'In Progress' 
                  ? `Your order ${orderId} is now in progress. We've started processing your laundry. Total: ${orderTotal}`
                  : `Great news! Your order ${orderId} is ready for pickup. Total: ${orderTotal}. Please visit us to collect your order.`;

                if (customerPhone) {
                  try {
                    const smsResult = await smsService.sendSMS(customerPhone, statusMessage);
                    if (smsResult.success) {
                      console.log(`✅ SMS notification sent to ${customerPhone} for order ${orderId}`);
                    }
                  } catch (smsError) {
                    console.error(`❌ Error sending SMS to ${customerPhone}:`, smsError.message);
                  }
                }

                if (customerEmail) {
                  try {
                    const emailResult = await emailService.sendOrderStatusEmail(
                      customerEmail,
                      orderId,
                      customerName,
                      newStatus,
                      orderTotal,
                      pickupDate
                    );
                    if (emailResult.success) {
                      console.log(`✅ Email notification sent to ${customerEmail} for order ${orderId}`);
                    }
                  } catch (emailError) {
                    console.error(`❌ Error sending email to ${customerEmail}:`, emailError.message);
                  }
                }
              }
            } catch (notificationError) {
              console.error('Error sending order status notifications:', notificationError);
            }
          }
        }

        // Log audit event
        await auditLogger.logDataModification('update', userId, 'order', order.id, {
          method: req.method,
          endpoint: req.originalUrl || req.url,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          userEmail: req.user.email,
          userRole: req.user.role,
          status: 'success',
          changes: {
            items: items ? items.length : order.items.length,
            payment: order.payment,
            paid: order.paid
          }
        }).catch(err => console.error('Audit logging error:', err));

        return res.status(200).json({
          success: true,
          message: 'Order updated successfully',
          order: order
        });
      }

      // No frontend edit lock - use 2PL locking for concurrency control
      // Prepare resources for 2PL locking
      const resourcesToLock = [
        {
          resourceId: decodedId,
          resourceType: 'order',
          lockType: 'exclusive'
        }
      ];

      // Lock discount if being updated
      if (discountId) {
        resourcesToLock.push({
          resourceId: String(discountId),
          resourceType: 'discount',
          lockType: 'exclusive'
        });
      }

      // Execute order update with 2PL concurrency control (simplified direct update)
      const order = await Order.findOne({ id: decodedId });

      if (!order) {
        throw new Error('Order not found');
      }

          // Check if order is completed and locked
          if (order.isCompleted) {
            throw new Error('This order has been marked as completed and cannot be edited.');
          }

          // Staff can only update orders from their station
          if (req.user.role === 'staff') {
            if (req.user.stationId) {
              if (order.stationId !== req.user.stationId) {
                throw new Error('Access denied. You can only update orders from your station.');
              }
            } else {
              // Fallback: check if order was created by this staff member
              if (order.createdBy.toString() !== req.user._id.toString()) {
                throw new Error('Access denied. You can only update your own orders.');
              }
            }
          }

      // Track previous payment status to detect transitions
      const previousPaymentStatus = order.payment;
      
      // Track previous item statuses to detect status changes
      const previousItemStatuses = order.items ? order.items.map(item => item.status) : [];
      let statusChanged = false;
      let newStatus = null;

      if (items && Array.isArray(items) && items.length > 0) {
        // Check if any item status changed to "In Progress" or "Completed"
        for (let i = 0; i < items.length; i++) {
          const newItemStatus = items[i].status || 'Pending';
          const oldItemStatus = previousItemStatuses[i] || 'Pending';
          
          // Detect if status changed to "In Progress" or "Completed"
          if (oldItemStatus !== newItemStatus && (newItemStatus === 'In Progress' || newItemStatus === 'Completed')) {
            statusChanged = true;
            newStatus = newItemStatus;
            break; // Use the first status change found (typically all items have the same status)
          }
        }
        
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
          // Use existing total (handle both string and number formats)
          if (typeof order.total === 'string') {
            totalAmount = parseFloat(order.total.replace(/[^0-9.]/g, '')) || 0;
          } else {
            totalAmount = order.total || 0;
          }
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

        // Apply points discount if points were used (1 point = ₱1)
        const POINTS_TO_PESO_RATE = 1;
        const pointsDiscountAmount = (order.pointsUsed || 0) * POINTS_TO_PESO_RATE;

        const finalTotal = Math.max(0, totalAmount - discountAmount - pointsDiscountAmount);
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

      // Check if order should be marked as completed and locked
      // If any item status is "Completed", mark the order as completed
      if (items && Array.isArray(items) && items.length > 0) {
        const hasCompletedItem = items.some(item => item.status === 'Completed');
        if (hasCompletedItem) {
          order.isCompleted = true;
          console.log(`🔒 Order ${order.id} marked as completed and locked from further edits.`);
        }
      }

      // Handle points when payment status changes to Paid
      // Earn points according to configured multiplier (may be disabled)
      if (previousPaymentStatus !== 'Paid' && order.payment === 'Paid') {
        // Only grant points if they haven't been granted yet
        if (!order.pointsEarned || order.pointsEarned === 0) {
          const paidAmount = order.paid || 0;
          const pointsConfig = await getPointsConfig();
          const multiplier = pointsConfig.pesoToPointMultiplier ?? DEFAULT_POINTS_CONFIG.pesoToPointMultiplier;
          const pointsEarned = (pointsConfig.enabled && paidAmount > 0)
            ? parseFloat((paidAmount * multiplier).toFixed(2))
            : 0;
          
          if (pointsEarned > 0) {
            order.pointsEarned = pointsEarned;
            
            // Update customer points if customer exists
            if (order.customerId) {
              try {
                const customer = await Customer.findById(order.customerId);
                if (customer) {
                  const newPoints = (customer.points || 0) + pointsEarned;
                  customer.points = newPoints;
                  await customer.save();

                  // Keep points in sync for same phone across branches
                  if (customer.phone) {
                    await Customer.updateMany(
                      {
                        phone: customer.phone,
                        _id: { $ne: customer._id },
                      },
                      { $set: { points: newPoints } }
                    );
                  }
                }
              } catch (error) {
                console.error('Error updating customer points:', error);
                // Don't fail the order update if points update fails
              }
            }
          }
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

      // Notify staff member if their order was updated by someone else
      try {
        const orderCreatorId = order.createdBy?._id || order.createdBy;
        const editorId = req.user._id;
        
        // Only notify if the order was created by a staff member and edited by someone else
        if (orderCreatorId && orderCreatorId.toString() !== editorId.toString()) {
          const creator = await User.findById(orderCreatorId);
          if (creator && creator.role === 'staff') {
            const editorName = req.user.fullName || req.user.username || 'Admin';
            await NotificationController.createNotification(
              orderCreatorId,
              'order',
              'Order Updated',
              `Your order ${order.id} for ${order.customer} was updated by ${editorName}`,
              order.id,
              { 
                orderId: order.id,
                customer: order.customer,
                editedBy: editorName,
                lastEditedAt: order.lastEditedAt
              }
            );
          }
        }
      } catch (notifyErr) {
        console.error('Notification (order update) error:', notifyErr);
      }

      // Send SMS and Email notifications when order status changes to "In Progress" or "Completed"
      if (statusChanged && newStatus && (newStatus === 'In Progress' || newStatus === 'Completed')) {
        try {
          const customer = order.customerId;
          
          if (customer) {
            const customerName = customer.name || order.customer || 'Valued Customer';
            const customerEmail = customer.email;
            const customerPhone = customer.phone || order.customerPhone;
            const orderId = order.id;
            const orderTotal = order.total;
            const pickupDate = order.pickupDate;

            // Prepare status message for SMS
            const statusMessage = newStatus === 'In Progress' 
              ? `Your order ${orderId} is now in progress. We've started processing your laundry. Total: ${orderTotal}`
              : `Great news! Your order ${orderId} is ready for pickup. Total: ${orderTotal}. Please visit us to collect your order.`;

            // Send SMS if phone number is available
            if (customerPhone) {
              try {
                const smsResult = await smsService.sendSMS(customerPhone, statusMessage);
                if (smsResult.success) {
                  console.log(`✅ SMS notification sent to ${customerPhone} for order ${orderId}`);
                } else {
                  console.warn(`⚠️  SMS notification failed for ${customerPhone}: ${smsResult.error}`);
                }
              } catch (smsError) {
                console.error(`❌ Error sending SMS to ${customerPhone}:`, smsError.message);
              }
            } else {
              console.log(`ℹ️  No phone number available for customer ${customerName}, skipping SMS`);
            }

            // Send Email if email is available
            if (customerEmail) {
              try {
                const emailResult = await emailService.sendOrderStatusEmail(
                  customerEmail,
                  orderId,
                  customerName,
                  newStatus,
                  orderTotal,
                  pickupDate
                );
                if (emailResult.success) {
                  console.log(`✅ Email notification sent to ${customerEmail} for order ${orderId}`);
                } else {
                  console.warn(`⚠️  Email notification failed for ${customerEmail}: ${emailResult.error}`);
                }
              } catch (emailError) {
                console.error(`❌ Error sending email to ${customerEmail}:`, emailError.message);
              }
            } else {
              console.log(`ℹ️  No email address available for customer ${customerName}, skipping email`);
            }
          } else {
            console.log(`ℹ️  Order ${order.id} has no linked customer, skipping notifications`);
          }
        } catch (notificationError) {
          // Don't fail the order update if notifications fail
          console.error('Error sending order status notifications:', notificationError);
        }
      }

      // Log audit event
      await auditLogger.logDataModification('update', req.user._id, 'order', order.id, {
        method: req.method,
        endpoint: req.originalUrl || req.url,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userEmail: req.user.email,
        userRole: req.user.role,
        status: 'success',
        changes: {
          items: items ? items.length : order.items.length,
          payment: order.payment,
          paid: order.paid
        }
      }).catch(err => console.error('Audit logging error:', err));

      res.status(200).json({
        success: true,
        message: 'Order updated successfully',
        data: order
      });
    } catch (error) {
      console.error('Update order error:', error);
      
      // Handle specific error messages with appropriate status codes
      const errorMessage = error.message || error.toString();
      
      if (errorMessage.includes('Order not found')) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      if (errorMessage.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          message: errorMessage
        });
      }
      
      if (errorMessage.includes('cannot be edited') || errorMessage.includes('completed')) {
        return res.status(400).json({
          success: false,
          message: errorMessage
        });
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: error.message || 'Invalid input data'
        });
      }
      
      // Default to 500 for unexpected errors
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

      // Log audit event
      await auditLogger.logDataModification('delete', req.user._id, 'order', decodedId, {
        method: req.method,
        endpoint: req.originalUrl || req.url,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userEmail: req.user.email,
        userRole: req.user.role,
        status: 'success',
        changes: {
          customer: order.customer,
          total: order.total
        }
      }).catch(err => console.error('Audit logging error:', err));

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

  // Send invoice via email
  static async sendInvoiceEmail(req, res) {
    try {
      const { id } = req.params;
      const decodedId = decodeURIComponent(id);

      const order = await Order.findOne({ id: decodedId })
        .populate('customerId', 'name email phone address')
        .populate('discountId', 'code name type value');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check access permissions
      if (req.user.role === 'staff') {
        if (req.user.stationId && order.stationId !== req.user.stationId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      }

      // Get customer email
      const customerEmail = order.customerId?.email || order.customerEmail;
      if (!customerEmail) {
        return res.status(400).json({
          success: false,
          message: 'Customer email not found'
        });
      }

      // Get station info
      let stationInfo = null;
      if (order.stationId) {
        // Check if stationId is a valid ObjectId format (24 hex characters)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(order.stationId);
        const query = isValidObjectId 
          ? { $or: [{ stationId: order.stationId }, { _id: order.stationId }] }
          : { stationId: order.stationId };
        stationInfo = await Station.findOne(query);
      }

      // Calculate invoice data
      const subtotal = order.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      let discountAmount = 0;
      let discountCode = order.discount || '0%';
      if (order.discountId && typeof order.discountId === 'object') {
        const discount = order.discountId;
        if (discount.type === 'percentage') {
          discountAmount = subtotal * (discount.value / 100);
          discountCode = `${discount.value}%`;
        } else {
          discountAmount = discount.value;
          discountCode = `₱${discount.value}`;
        }
      }
      const total = subtotal - discountAmount;
      const paid = order.paid || 0;
      const balance = Math.max(0, total - paid);

      const orderDate = new Date(order.date || order.createdAt);
      const dueDate = new Date(orderDate);
      dueDate.setDate(dueDate.getDate() + 3);

      const invoiceItems = order.items.map((item) => ({
        service: item.service,
        quantity: item.quantity,
        unitPrice: item.quantity.includes('kg') 
          ? (item.amount / parseFloat(item.quantity.replace('kg', '')))
          : item.quantity.includes('flat')
          ? item.amount
          : item.quantity.includes('item')
          ? (item.amount / parseFloat(item.quantity.replace(/items?/gi, '').trim()))
          : item.amount,
        amount: item.amount
      }));

      const invoiceData = {
        id: order.id,
        date: orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        dueDate: dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        customer: {
          name: order.customerId?.name || order.customer,
          email: customerEmail,
          phone: order.customerId?.phone || order.customerPhone || '',
          address: order.customerId?.address || ''
        },
        items: invoiceItems,
        subtotal: subtotal,
        discount: discountAmount,
        discountCode: discountCode,
        tax: 0,
        total: total,
        paid: paid,
        balance: balance,
        paymentStatus: order.payment || 'Unpaid',
        paymentMethod: paid > 0 ? (balance === 0 ? 'Cash' : 'Partial Payment') : 'Pending',
        paymentDate: order.date ? new Date(order.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
        notes: order.notes || 'Thank you for choosing Sparklean Laundry Shop! We appreciate your business.'
      };

      // Send email
      const result = await emailService.sendInvoiceEmail(customerEmail, invoiceData, stationInfo);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Invoice sent successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to send invoice email'
        });
      }
    } catch (error) {
      console.error('Send invoice email error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Download invoice as PDF
  static async downloadInvoicePDF(req, res) {
    try {
      const { id } = req.params;
      const decodedId = decodeURIComponent(id);

      const order = await Order.findOne({ id: decodedId })
        .populate('customerId', 'name email phone address')
        .populate('discountId', 'code name type value');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check access permissions
      if (req.user.role === 'staff') {
        if (req.user.stationId && order.stationId !== req.user.stationId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      }

      // Get station info
      let stationInfo = null;
      if (order.stationId) {
        // Check if stationId is a valid ObjectId format (24 hex characters)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(order.stationId);
        const query = isValidObjectId 
          ? { $or: [{ stationId: order.stationId }, { _id: order.stationId }] }
          : { stationId: order.stationId };
        stationInfo = await Station.findOne(query);
      }

      // Calculate invoice data
      const subtotal = order.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      let discountAmount = 0;
      let discountCode = order.discount || '0%';
      if (order.discountId && typeof order.discountId === 'object') {
        const discount = order.discountId;
        if (discount.type === 'percentage') {
          discountAmount = subtotal * (discount.value / 100);
          discountCode = `${discount.value}%`;
        } else {
          discountAmount = discount.value;
          discountCode = `₱${discount.value}`;
        }
      }
      const total = subtotal - discountAmount;
      const paid = order.paid || 0;
      const balance = Math.max(0, total - paid);

      const orderDate = new Date(order.date || order.createdAt);
      const dueDate = new Date(orderDate);
      dueDate.setDate(dueDate.getDate() + 3);

      const invoiceItems = order.items.map((item) => ({
        service: item.service,
        quantity: item.quantity,
        unitPrice: item.quantity.includes('kg') 
          ? (item.amount / parseFloat(item.quantity.replace('kg', '')))
          : item.quantity.includes('flat')
          ? item.amount
          : item.quantity.includes('item')
          ? (item.amount / parseFloat(item.quantity.replace(/items?/gi, '').trim()))
          : item.amount,
        amount: item.amount
      }));

      const invoiceData = {
        id: order.id,
        date: orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        dueDate: dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        customer: {
          name: order.customerId?.name || order.customer,
          email: order.customerId?.email || order.customerEmail || '',
          phone: order.customerId?.phone || order.customerPhone || '',
          address: order.customerId?.address || ''
        },
        items: invoiceItems,
        subtotal: subtotal,
        discount: discountAmount,
        discountCode: discountCode,
        tax: 0,
        total: total,
        paid: paid,
        balance: balance,
        paymentStatus: order.payment || 'Unpaid',
        paymentMethod: paid > 0 ? (balance === 0 ? 'Cash' : 'Partial Payment') : 'Pending',
        paymentDate: order.date ? new Date(order.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
        notes: order.notes || 'Thank you for choosing Sparklean Laundry Shop! We appreciate your business.'
      };

      // Generate PDF
      try {
        const pdfBuffer = await pdfService.generateInvoicePDF(invoiceData, stationInfo);

        if (!pdfBuffer || pdfBuffer.length === 0) {
          return res.status(500).json({
            success: false,
            message: 'Failed to generate PDF: Empty buffer'
          });
        }

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.id}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        // Send PDF
        res.send(pdfBuffer);
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        throw pdfError;
      }
    } catch (error) {
      console.error('Download invoice PDF error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // Acquire edit lock for an order (when user clicks edit button)
  static async acquireEditLock(req, res) {
    try {
      const { id } = req.params;
      const decodedId = decodeURIComponent(id);
      const userId = req.user._id;

      // Check if order exists
      const order = await Order.findOne({ id: decodedId });
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if order is already locked by another user
      const existingLock = await Lock.findOne({
        resourceId: decodedId,
        resourceType: 'order',
        status: 'active',
        userId: { $ne: userId }
      }).populate('userId', 'username fullName email');

      if (existingLock) {
        const lockedBy = existingLock.userId.fullName || existingLock.userId.username || 'Another user';
        return res.status(409).json({
          success: false,
          message: `This order is currently being edited by ${lockedBy}`,
          lockedBy: {
            id: existingLock.userId._id.toString(),
            name: lockedBy,
            email: existingLock.userId.email
          },
          lockedAt: existingLock.acquiredAt
        });
      }

      // Release any existing lock by the same user (if editing again)
      await Lock.updateMany(
        {
          resourceId: decodedId,
          resourceType: 'order',
          userId: userId,
          status: 'active'
        },
        {
          status: 'released',
          releasedAt: new Date()
        }
      );

      // Acquire new lock (5 minutes timeout for edit sessions)
      const transactionId = LockManager.generateTransactionId();
      const lockTimeout = 5 * 60 * 1000; // 5 minutes

      const lock = await LockManager.acquireLock({
        resourceId: decodedId,
        resourceType: 'order',
        lockType: 'exclusive',
        transactionId: transactionId,
        userId: userId,
        timeout: lockTimeout
      });

      res.status(200).json({
        success: true,
        message: 'Edit lock acquired',
        lockId: lock._id.toString(),
        transactionId: transactionId,
        expiresAt: lock.expiresAt
      });
    } catch (error) {
      console.error('Acquire edit lock error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to acquire edit lock'
      });
    }
  }

  // Release edit lock for an order (when user cancels or saves)
  static async releaseEditLock(req, res) {
    try {
      const { id } = req.params;
      const decodedId = decodeURIComponent(id);
      const userId = req.user._id;

      // First, verify that the order exists
      const order = await Order.findOne({ id: decodedId });
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Release all locks for this order by this user
      const result = await Lock.updateMany(
        {
          resourceId: decodedId,
          resourceType: 'order',
          userId: userId,
          status: 'active'
        },
        {
          status: 'released',
          releasedAt: new Date()
        }
      );

      res.status(200).json({
        success: true,
        message: 'Edit lock released',
        releasedCount: result.modifiedCount
      });
    } catch (error) {
      console.error('Release edit lock error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to release edit lock'
      });
    }
  }

  // Check edit lock status for an order
  static async checkEditLock(req, res) {
    try {
      const { id } = req.params;
      const decodedId = decodeURIComponent(id);
      const userId = req.user._id;

      // First, verify that the order exists
      const order = await Order.findOne({ id: decodedId });
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Find active lock for this order
      const lock = await Lock.findOne({
        resourceId: decodedId,
        resourceType: 'order',
        status: 'active'
      }).populate('userId', 'username fullName email');

      if (!lock) {
        return res.status(200).json({
          success: true,
          isLocked: false,
          message: 'Order is not locked'
        });
      }

      // Check if locked by current user
      const isLockedByMe = lock.userId._id.toString() === userId.toString();

      res.status(200).json({
        success: true,
        isLocked: true,
        isLockedByMe: isLockedByMe,
        lockedBy: {
          id: lock.userId._id.toString(),
          name: lock.userId.fullName || lock.userId.username || 'Unknown',
          email: lock.userId.email
        },
        lockedAt: lock.acquiredAt,
        expiresAt: lock.expiresAt
      });
    } catch (error) {
      console.error('Check edit lock error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check edit lock'
      });
    }
  }
}

module.exports = OrderController;

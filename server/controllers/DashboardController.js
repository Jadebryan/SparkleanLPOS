const mongoose = require('mongoose');
const Order = require('../models/OrderModel');
const Customer = require('../models/CustomerModel');
const Expense = require('../models/ExpenseModel');

class DashboardController {
  // Get dashboard statistics
  static async getDashboardStats(req, res) {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { timeRange = 'today' } = req.query;
      
      // Calculate date ranges
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      
      let startDate, endDate, previousStartDate, previousEndDate;
      
      switch (timeRange) {
        case 'today':
          startDate = startOfToday;
          endDate = now;
          previousStartDate = startOfYesterday;
          previousEndDate = startOfToday;
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          endDate = now;
          previousStartDate = new Date(startDate);
          previousStartDate.setDate(previousStartDate.getDate() - 7);
          previousEndDate = startDate;
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = now;
          previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          previousEndDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = now;
          previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
          previousEndDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = startOfToday;
          endDate = now;
          previousStartDate = startOfYesterday;
          previousEndDate = startOfToday;
      }

      // Build query based on user role
      // Exclude drafts and archived orders
      const query = { 
        isArchived: false,
        isDraft: { $ne: true } // Exclude draft orders
      };
      if (req.user.role === 'staff') {
        query.createdBy = req.user._id;
      }

      // Get orders in current period
      const currentOrders = await Order.find({
        ...query,
        date: { $gte: startDate, $lte: endDate }
      });

      // Get orders in previous period for comparison
      const previousOrders = await Order.find({
        ...query,
        date: { $gte: previousStartDate, $lt: previousEndDate }
      });

      // Calculate revenue (parse total string)
      const parseTotal = (totalStr) => {
        if (!totalStr) return 0;
        const numStr = totalStr.replace(/[₱,]/g, '');
        return parseFloat(numStr) || 0;
      };

      const currentRevenue = currentOrders.reduce((sum, order) => sum + parseTotal(order.total), 0);
      const previousRevenue = previousOrders.reduce((sum, order) => sum + parseTotal(order.total), 0);
      
      // Calculate trends
      const revenueTrend = previousRevenue > 0 
        ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
        : currentRevenue > 0 ? 100 : 0;

      const ordersTrend = previousOrders.length > 0
        ? Math.round(((currentOrders.length - previousOrders.length) / previousOrders.length) * 100)
        : currentOrders.length > 0 ? 100 : 0;

      // Count pending orders (orders with payment status 'Unpaid' or 'Partial')
      const pendingOrders = currentOrders.filter(order => 
        order.payment === 'Unpaid' || order.payment === 'Partial'
      ).length;
      
      const previousPendingOrders = previousOrders.filter(order =>
        order.payment === 'Unpaid' || order.payment === 'Partial'
      ).length;

      const pendingTrend = previousPendingOrders > 0
        ? Math.round(((pendingOrders - previousPendingOrders) / previousPendingOrders) * 100)
        : pendingOrders > 0 ? 100 : 0;

      // Get total customers
      const totalCustomers = await Customer.countDocuments({ isArchived: false });
      
      // Calculate previous customers (customers created before the start of current period)
      // Customer model has timestamps: true, so createdAt should exist
      const previousCustomers = await Customer.countDocuments({
        isArchived: false,
        createdAt: { $lt: startDate }
      });

      const customersTrend = previousCustomers > 0
        ? Math.round(((totalCustomers - previousCustomers) / previousCustomers) * 100)
        : totalCustomers > 0 ? 100 : 0;

      // Order status distribution (based on payment status)
      const orderStatusCounts = {
        pending: 0,
        inProgress: 0,
        completed: 0
      };

      currentOrders.forEach(order => {
        if (order.payment === 'Unpaid') {
          orderStatusCounts.pending++;
        } else if (order.payment === 'Partial') {
          orderStatusCounts.inProgress++;
        } else if (order.payment === 'Paid') {
          orderStatusCounts.completed++;
        }
      });

      // Revenue trend for last 7 days
      const revenueTrendData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const dayOrders = await Order.find({
          ...query,
          date: { $gte: dayStart, $lt: dayEnd }
        });

        const dayRevenue = dayOrders.reduce((sum, order) => sum + parseTotal(order.total), 0);
        
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        revenueTrendData.push({
          name: dayName,
          value: dayRevenue,
          target: 3000 // You can make this dynamic
        });
      }

      // Get recent activity (last 10 orders)
      const recentOrders = await Order.find(query)
        .populate('customerId', 'name')
        .sort({ date: -1, createdAt: -1 }) // Sort by date first, then createdAt if available
        .limit(10);

      const recentActivity = recentOrders.map(order => {
        const timeAgo = getTimeAgo(order.createdAt || order.date || new Date());
        const customerName = order.customerId ? (order.customerId.name || order.customer) : order.customer;
        return {
          id: order._id.toString(),
          type: 'order',
          message: `New order ${order.id} from ${customerName}`,
          time: timeAgo,
          orderId: order.id
        };
      });

      // Get pending expense approvals (admin only)
      let pendingExpenses = 0;
      if (req.user.role === 'admin') {
        pendingExpenses = await Expense.countDocuments({ 
          status: 'Pending',
          isArchived: false 
        });
      }

      res.status(200).json({
        success: true,
        data: {
          stats: {
            orders: currentOrders.length,
            revenue: currentRevenue,
            pending: pendingOrders,
            customers: totalCustomers
          },
          trends: {
            orders: ordersTrend,
            revenue: revenueTrend,
            pending: pendingTrend,
            customers: customersTrend
          },
          orderStatus: [
            { name: 'Pending', value: orderStatusCounts.pending },
            { name: 'In Progress', value: orderStatusCounts.inProgress },
            { name: 'Completed', value: orderStatusCounts.completed }
          ],
          revenueTrend: revenueTrendData,
          recentActivity: recentActivity,
          pendingExpenses: pendingExpenses
        }
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
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

module.exports = DashboardController;


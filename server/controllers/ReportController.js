const Order = require('../models/OrderModel');
const Customer = require('../models/CustomerModel');
const Expense = require('../models/ExpenseModel');
const Service = require('../models/ServiceModel');
const Employee = require('../models/EmployeeModel');

class ReportController {
  // Generate Orders Report
  static async generateOrdersReport(req, res) {
    try {
      const { dateFrom, dateTo } = req.body;
      
      if (!dateFrom || !dateTo) {
        return res.status(400).json({
          success: false,
          message: 'Date range is required'
        });
      }

      const startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);

      // Build query
      const query = {
        date: { $gte: startDate, $lte: endDate },
        isArchived: false,
        isDraft: { $ne: true }
      };

      // Staff can only see their own orders
      if (req.user.role === 'staff') {
        query.createdBy = req.user._id;
      }

      const orders = await Order.find(query)
        .populate('customerId', 'name email phone')
        .populate('createdBy', 'username')
        .sort({ date: -1 });

      // Parse total amounts
      const parseTotal = (totalStr) => {
        if (!totalStr) return 0;
        const numStr = totalStr.replace(/[₱,]/g, '');
        return parseFloat(numStr) || 0;
      };

      // Calculate summary statistics
      const totalRevenue = orders.reduce((sum, order) => sum + parseTotal(order.total), 0);
      const totalOrders = orders.length;
      const paidOrders = orders.filter(o => o.payment === 'Paid').length;
      const unpaidOrders = orders.filter(o => o.payment === 'Unpaid').length;
      const partialOrders = orders.filter(o => o.payment === 'Partial').length;

      // Format orders for export
      const formattedOrders = orders.map(order => ({
        id: order.id,
        date: order.date.toISOString().split('T')[0],
        customer: order.customer,
        customerPhone: order.customerPhone || '',
        payment: order.payment,
        total: order.total,
        paid: order.paid || 0,
        balance: order.balance || '₱0.00',
        items: order.items.map(item => ({
          service: item.service,
          quantity: item.quantity,
          status: item.status,
          amount: item.amount || 0
        })),
        pickupDate: order.pickupDate ? order.pickupDate.toISOString().split('T')[0] : null,
        deliveryDate: order.deliveryDate ? order.deliveryDate.toISOString().split('T')[0] : null,
        notes: order.notes || '',
        createdBy: order.createdBy ? order.createdBy.username : 'Unknown'
      }));

      res.status(200).json({
        success: true,
        data: {
          reportType: 'orders',
          dateRange: { from: dateFrom, to: dateTo },
          summary: {
            totalOrders,
            totalRevenue: totalRevenue.toFixed(2),
            paidOrders,
            unpaidOrders,
            partialOrders
          },
          orders: formattedOrders
        }
      });
    } catch (error) {
      console.error('Generate orders report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Generate Revenue Report
  static async generateRevenueReport(req, res) {
    try {
      const { dateFrom, dateTo } = req.body;
      
      if (!dateFrom || !dateTo) {
        return res.status(400).json({
          success: false,
          message: 'Date range is required'
        });
      }

      const startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);

      // Build query
      const query = {
        date: { $gte: startDate, $lte: endDate },
        isArchived: false,
        isDraft: { $ne: true }
      };

      if (req.user.role === 'staff') {
        query.createdBy = req.user._id;
      }

      const orders = await Order.find(query).sort({ date: 1 });
      const expenses = await Expense.find({
        date: { $gte: startDate, $lte: endDate },
        isArchived: false
      }).populate('requestedBy', 'username');

      // Parse totals
      const parseTotal = (totalStr) => {
        if (!totalStr) return 0;
        const numStr = totalStr.replace(/[₱,]/g, '');
        return parseFloat(numStr) || 0;
      };

      const totalRevenue = orders.reduce((sum, order) => sum + parseTotal(order.total), 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      const profit = totalRevenue - totalExpenses;

      // Daily breakdown
      const dailyBreakdown = {};
      orders.forEach(order => {
        const dateKey = order.date.toISOString().split('T')[0];
        if (!dailyBreakdown[dateKey]) {
          dailyBreakdown[dateKey] = { revenue: 0, orders: 0 };
        }
        dailyBreakdown[dateKey].revenue += parseTotal(order.total);
        dailyBreakdown[dateKey].orders += 1;
      });

      expenses.forEach(expense => {
        const dateKey = expense.date.toISOString().split('T')[0];
        if (!dailyBreakdown[dateKey]) {
          dailyBreakdown[dateKey] = { revenue: 0, orders: 0, expenses: 0 };
        }
        dailyBreakdown[dateKey].expenses = (dailyBreakdown[dateKey].expenses || 0) + (expense.amount || 0);
      });

      const formattedDailyBreakdown = Object.entries(dailyBreakdown).map(([date, data]) => ({
        date,
        revenue: data.revenue.toFixed(2),
        expenses: (data.expenses || 0).toFixed(2),
        profit: (data.revenue - (data.expenses || 0)).toFixed(2),
        orders: data.orders
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Expense breakdown by category
      const expenseByCategory = {};
      expenses.forEach(expense => {
        const category = expense.category || 'Other';
        if (!expenseByCategory[category]) {
          expenseByCategory[category] = 0;
        }
        expenseByCategory[category] += expense.amount || 0;
      });

      res.status(200).json({
        success: true,
        data: {
          reportType: 'revenue',
          dateRange: { from: dateFrom, to: dateTo },
          summary: {
            totalRevenue: totalRevenue.toFixed(2),
            totalExpenses: totalExpenses.toFixed(2),
            profit: profit.toFixed(2),
            profitMargin: totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) : '0.00'
          },
          dailyBreakdown: formattedDailyBreakdown,
          expenseByCategory,
          expenses: expenses.map(e => ({
            date: e.date.toISOString().split('T')[0],
            category: e.category,
            description: e.description,
            amount: e.amount,
            status: e.status,
            requestedBy: e.requestedBy ? e.requestedBy.username : 'Unknown'
          }))
        }
      });
    } catch (error) {
      console.error('Generate revenue report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Generate Customers Report
  static async generateCustomersReport(req, res) {
    try {
      const { dateFrom, dateTo } = req.body;
      
      const startDate = dateFrom ? new Date(dateFrom) : null;
      const endDate = dateTo ? new Date(dateTo) : null;

      // Build query - if date range provided, filter by customers who made orders in that range
      let customers;
      if (startDate && endDate) {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        // Find customers who have orders in date range
        const ordersInRange = await Order.find({
          date: { $gte: startDate, $lte: endDate },
          isArchived: false,
          isDraft: { $ne: true }
        }).select('customerId');

        const customerIds = [...new Set(ordersInRange.map(o => o.customerId).filter(Boolean))];
        
        if (customerIds.length > 0) {
          customers = await Customer.find({
            _id: { $in: customerIds },
            isArchived: false
          }).sort({ totalSpent: -1 });
        } else {
          customers = [];
        }
      } else {
        customers = await Customer.find({ isArchived: false }).sort({ totalSpent: -1 });
      }

      // Calculate statistics
      const totalCustomers = customers.length;
      const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
      const totalOrders = customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0);
      const avgSpent = totalCustomers > 0 ? (totalRevenue / totalCustomers).toFixed(2) : '0.00';

      // Top customers
      const topCustomers = customers.slice(0, 10).map(c => ({
        name: c.name,
        email: c.email || '',
        phone: c.phone,
        totalOrders: c.totalOrders || 0,
        totalSpent: (c.totalSpent || 0).toFixed(2),
        lastOrder: c.lastOrder ? c.lastOrder.toISOString().split('T')[0] : 'Never'
      }));

      res.status(200).json({
        success: true,
        data: {
          reportType: 'customers',
          dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null,
          summary: {
            totalCustomers,
            totalRevenue: totalRevenue.toFixed(2),
            totalOrders,
            avgSpentPerCustomer: avgSpent
          },
          topCustomers,
          allCustomers: customers.map(c => ({
            name: c.name,
            email: c.email || '',
            phone: c.phone,
            totalOrders: c.totalOrders || 0,
            totalSpent: (c.totalSpent || 0).toFixed(2),
            lastOrder: c.lastOrder ? c.lastOrder.toISOString().split('T')[0] : 'Never'
          }))
        }
      });
    } catch (error) {
      console.error('Generate customers report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Generate Expenses Report
  static async generateExpensesReport(req, res) {
    try {
      const { dateFrom, dateTo } = req.body;
      
      if (!dateFrom || !dateTo) {
        return res.status(400).json({
          success: false,
          message: 'Date range is required'
        });
      }

      const startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);

      // Build query
      const query = {
        date: { $gte: startDate, $lte: endDate },
        isArchived: false
      };

      // Staff can only see their own expenses
      if (req.user.role === 'staff') {
        query.requestedBy = req.user._id;
      }

      const expenses = await Expense.find(query)
        .populate('requestedBy', 'username')
        .populate('approvedBy', 'username')
        .sort({ date: -1 });

      // Calculate statistics
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const pendingExpenses = expenses.filter(e => e.status === 'Pending').length;
      const approvedExpenses = expenses.filter(e => e.status === 'Approved').length;
      const rejectedExpenses = expenses.filter(e => e.status === 'Rejected').length;

      // Breakdown by category
      const categoryBreakdown = {};
      expenses.forEach(expense => {
        const category = expense.category || 'Other';
        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = { total: 0, count: 0 };
        }
        categoryBreakdown[category].total += expense.amount || 0;
        categoryBreakdown[category].count += 1;
      });

      res.status(200).json({
        success: true,
        data: {
          reportType: 'expenses',
          dateRange: { from: dateFrom, to: dateTo },
          summary: {
            totalExpenses: totalExpenses.toFixed(2),
            pendingCount: pendingExpenses,
            approvedCount: approvedExpenses,
            rejectedCount: rejectedExpenses
          },
          categoryBreakdown,
          expenses: expenses.map(e => ({
            date: e.date.toISOString().split('T')[0],
            category: e.category,
            description: e.description,
            amount: e.amount,
            status: e.status,
            requestedBy: e.requestedBy ? e.requestedBy.username : 'Unknown',
            approvedBy: e.approvedBy ? e.approvedBy.username : null
          }))
        }
      });
    } catch (error) {
      console.error('Generate expenses report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Generate Services Report
  static async generateServicesReport(req, res) {
    try {
      const { dateFrom, dateTo } = req.body;

      const startDate = dateFrom ? new Date(dateFrom) : null;
      const endDate = dateTo ? new Date(dateTo) : null;

      // Get all active services
      const services = await Service.find({ isArchived: false }).sort({ name: 1 });

      // Get orders in date range (if provided) to calculate service usage
      let orders = [];
      if (startDate && endDate) {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const query = {
          date: { $gte: startDate, $lte: endDate },
          isArchived: false,
          isDraft: { $ne: true }
        };

        if (req.user.role === 'staff') {
          query.createdBy = req.user._id;
        }

        orders = await Order.find(query);
      } else {
        // Get all orders if no date range
        const query = { isArchived: false, isDraft: { $ne: true } };
        if (req.user.role === 'staff') {
          query.createdBy = req.user._id;
        }
        orders = await Order.find(query);
      }

      // Calculate service usage statistics
      const serviceStats = {};
      services.forEach(service => {
        serviceStats[service.name] = {
          name: service.name,
          category: service.category,
          price: service.price,
          unit: service.unit,
          usageCount: 0,
          totalRevenue: 0,
          isPopular: service.isPopular || false,
          isActive: service.isActive !== false
        };
      });

      // Count service usage from orders
      orders.forEach(order => {
        order.items.forEach(item => {
          if (serviceStats[item.service]) {
            serviceStats[item.service].usageCount += 1;
            serviceStats[item.service].totalRevenue += item.amount || 0;
          }
        });
      });

      const serviceArray = Object.values(serviceStats).sort((a, b) => b.usageCount - a.usageCount);

      // Calculate summary
      const totalServices = services.length;
      const activeServices = services.filter(s => s.isActive !== false).length;
      const popularServices = services.filter(s => s.isPopular).length;
      const totalRevenue = serviceArray.reduce((sum, s) => sum + s.totalRevenue, 0);

      res.status(200).json({
        success: true,
        data: {
          reportType: 'services',
          dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null,
          summary: {
            totalServices,
            activeServices,
            popularServices,
            totalRevenue: totalRevenue.toFixed(2)
          },
          services: serviceArray.map(s => ({
            name: s.name,
            category: s.category,
            price: s.price,
            unit: s.unit,
            usageCount: s.usageCount,
            totalRevenue: s.totalRevenue.toFixed(2),
            isPopular: s.isPopular,
            isActive: s.isActive
          }))
        }
      });
    } catch (error) {
      console.error('Generate services report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Generate Employee Report
  static async generateEmployeeReport(req, res) {
    try {
      const { dateFrom, dateTo } = req.body;

      // Get all employees
      const employees = await Employee.find({ isArchived: false })
        .populate('userId', 'username email isActive lastLogin')
        .sort({ name: 1 });

      const startDate = dateFrom ? new Date(dateFrom) : null;
      const endDate = dateTo ? new Date(dateTo) : null;

      // Build order query for date range
      let orderQuery = {
        isArchived: false,
        isDraft: { $ne: true }
      };

      if (startDate && endDate) {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        orderQuery.date = { $gte: startDate, $lte: endDate };
      }

      // Calculate employee performance
      const employeeStats = await Promise.all(
        employees.map(async (employee) => {
          if (!employee.userId) {
            return {
              name: employee.name,
              employeeId: employee.employeeId,
              position: employee.position,
              department: employee.department,
              ordersProcessed: 0,
              totalRevenue: 0,
              accountStatus: 'No Account',
              lastLogin: null
            };
          }

          const userOrderQuery = {
            ...orderQuery,
            createdBy: employee.userId._id || employee.userId
          };

          const employeeOrders = await Order.find(userOrderQuery);
          
          const parseTotal = (totalStr) => {
            if (!totalStr) return 0;
            const numStr = totalStr.replace(/[₱,]/g, '');
            return parseFloat(numStr) || 0;
          };

          const totalRevenue = employeeOrders.reduce((sum, order) => sum + parseTotal(order.total), 0);

          // Calculate attendance (simplified)
          let attendance = 0;
          if (employee.userId.isActive) {
            if (employee.userId.lastLogin) {
              const daysSinceLogin = Math.floor((Date.now() - new Date(employee.userId.lastLogin).getTime()) / (1000 * 60 * 60 * 24));
              if (daysSinceLogin <= 7) attendance = 95;
              else if (daysSinceLogin <= 30) attendance = 75;
              else attendance = 50;
            }
          }

          return {
            name: employee.name,
            employeeId: employee.employeeId,
            position: employee.position,
            department: employee.department,
            ordersProcessed: employeeOrders.length,
            totalRevenue: totalRevenue.toFixed(2),
            accountStatus: employee.userId.isActive ? 'Active' : 'Inactive',
            lastLogin: employee.userId.lastLogin ? employee.userId.lastLogin.toISOString().split('T')[0] : 'Never',
            attendance
          };
        })
      );

      // Calculate summary
      const totalEmployees = employees.length;
      const activeEmployees = employees.filter(e => e.userId && e.userId.isActive).length;
      const totalOrders = employeeStats.reduce((sum, e) => sum + e.ordersProcessed, 0);
      const totalRevenue = employeeStats.reduce((sum, e) => sum + parseFloat(e.totalRevenue), 0);

      res.status(200).json({
        success: true,
        data: {
          reportType: 'employee',
          dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null,
          summary: {
            totalEmployees,
            activeEmployees,
            totalOrders,
            totalRevenue: totalRevenue.toFixed(2)
          },
          employees: employeeStats.sort((a, b) => b.ordersProcessed - a.ordersProcessed)
        }
      });
    } catch (error) {
      console.error('Generate employee report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Generate Sales per Branch Report
  static async generateSalesPerBranchReport(req, res) {
    try {
      const { dateFrom, dateTo } = req.body;
      
      if (!dateFrom || !dateTo) {
        return res.status(400).json({
          success: false,
          message: 'Date range is required'
        });
      }

      const startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);

      // Get all stations
      const Station = require('../models/StationModel');
      const stations = await Station.find({ isArchived: false }).sort({ stationId: 1 });

      // Build query for orders
      const orderQuery = {
        date: { $gte: startDate, $lte: endDate },
        isArchived: false,
        isDraft: { $ne: true }
      };

      // Staff can only see their own orders
      if (req.user.role === 'staff') {
        orderQuery.createdBy = req.user._id;
      }

      const orders = await Order.find(orderQuery)
        .populate('createdBy', 'username')
        .sort({ date: -1 });

      // Parse total amounts
      const parseTotal = (totalStr) => {
        if (!totalStr) return 0;
        const numStr = totalStr.replace(/[₱,]/g, '');
        return parseFloat(numStr) || 0;
      };

      // Aggregate sales by branch
      const branchSales = {};
      
      // Initialize all stations
      stations.forEach(station => {
        branchSales[station.stationId] = {
          stationId: station.stationId,
          stationName: station.name,
          totalRevenue: 0,
          totalOrders: 0,
          paidOrders: 0,
          unpaidOrders: 0,
          partialOrders: 0,
          orders: []
        };
      });

      // Process orders
      orders.forEach(order => {
        const stationId = order.stationId || 'UNASSIGNED';
        
        if (!branchSales[stationId]) {
          branchSales[stationId] = {
            stationId: stationId,
            stationName: stationId === 'UNASSIGNED' ? 'Unassigned' : stationId,
            totalRevenue: 0,
            totalOrders: 0,
            paidOrders: 0,
            unpaidOrders: 0,
            partialOrders: 0,
            orders: []
          };
        }

        const revenue = parseTotal(order.total);
        branchSales[stationId].totalRevenue += revenue;
        branchSales[stationId].totalOrders += 1;
        
        if (order.payment === 'Paid') {
          branchSales[stationId].paidOrders += 1;
        } else if (order.payment === 'Unpaid') {
          branchSales[stationId].unpaidOrders += 1;
        } else if (order.payment === 'Partial') {
          branchSales[stationId].partialOrders += 1;
        }

        branchSales[stationId].orders.push({
          id: order.id,
          date: order.date.toISOString().split('T')[0],
          customer: order.customer,
          customerPhone: order.customerPhone || '',
          payment: order.payment,
          total: order.total,
          paid: order.paid || 0,
          balance: order.balance || '₱0.00',
          createdBy: order.createdBy ? order.createdBy.username : 'Unknown'
        });
      });

      // Convert to array and sort by revenue
      const branchSalesArray = Object.values(branchSales)
        .map(branch => ({
          ...branch,
          totalRevenue: branch.totalRevenue.toFixed(2)
        }))
        .sort((a, b) => parseFloat(b.totalRevenue) - parseFloat(a.totalRevenue));

      // Calculate totals
      const totalRevenue = branchSalesArray.reduce((sum, branch) => sum + parseFloat(branch.totalRevenue), 0);
      const totalOrders = branchSalesArray.reduce((sum, branch) => sum + branch.totalOrders, 0);

      res.status(200).json({
        success: true,
        data: {
          reportType: 'sales-per-branch',
          dateRange: { from: dateFrom, to: dateTo },
          summary: {
            totalBranches: branchSalesArray.length,
            totalRevenue: totalRevenue.toFixed(2),
            totalOrders: totalOrders
          },
          branches: branchSalesArray
        }
      });
    } catch (error) {
      console.error('Generate sales per branch report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Generate Cashflow per Branch Report
  static async generateCashflowPerBranchReport(req, res) {
    try {
      const { dateFrom, dateTo } = req.body;
      
      if (!dateFrom || !dateTo) {
        return res.status(400).json({
          success: false,
          message: 'Date range is required'
        });
      }

      const startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);

      // Get all stations
      const Station = require('../models/StationModel');
      const stations = await Station.find({ isArchived: false }).sort({ stationId: 1 });

      // Build query for orders
      const orderQuery = {
        date: { $gte: startDate, $lte: endDate },
        isArchived: false,
        isDraft: { $ne: true }
      };

      // Build query for expenses
      const expenseQuery = {
        date: { $gte: startDate, $lte: endDate },
        isArchived: false,
        status: 'Approved' // Only count approved expenses
      };

      // Staff can only see their own orders/expenses
      if (req.user.role === 'staff') {
        orderQuery.createdBy = req.user._id;
        expenseQuery.requestedBy = req.user._id;
      }

      const orders = await Order.find(orderQuery).sort({ date: 1 });
      const expenses = await Expense.find(expenseQuery)
        .populate('requestedBy', 'username')
        .sort({ date: 1 });

      // Parse total amounts
      const parseTotal = (totalStr) => {
        if (!totalStr) return 0;
        const numStr = totalStr.replace(/[₱,]/g, '');
        return parseFloat(numStr) || 0;
      };

      // Aggregate cashflow by branch
      const branchCashflow = {};
      
      // Initialize all stations
      stations.forEach(station => {
        branchCashflow[station.stationId] = {
          stationId: station.stationId,
          stationName: station.name,
          revenue: 0,
          expenses: 0,
          netCashflow: 0,
          orders: [],
          expensesList: []
        };
      });

      // Process orders (revenue)
      orders.forEach(order => {
        const stationId = order.stationId || 'UNASSIGNED';
        
        if (!branchCashflow[stationId]) {
          branchCashflow[stationId] = {
            stationId: stationId,
            stationName: stationId === 'UNASSIGNED' ? 'Unassigned' : stationId,
            revenue: 0,
            expenses: 0,
            netCashflow: 0,
            orders: [],
            expensesList: []
          };
        }

        const revenue = parseTotal(order.total);
        branchCashflow[stationId].revenue += revenue;
        branchCashflow[stationId].netCashflow += revenue;
      });

      // Process expenses (outflow)
      expenses.forEach(expense => {
        const stationId = expense.stationId || 'UNASSIGNED';
        
        if (!branchCashflow[stationId]) {
          branchCashflow[stationId] = {
            stationId: stationId,
            stationName: stationId === 'UNASSIGNED' ? 'Unassigned' : stationId,
            revenue: 0,
            expenses: 0,
            netCashflow: 0,
            orders: [],
            expensesList: []
          };
        }

        const expenseAmount = expense.amount || 0;
        branchCashflow[stationId].expenses += expenseAmount;
        branchCashflow[stationId].netCashflow -= expenseAmount;

        branchCashflow[stationId].expensesList.push({
          date: expense.date.toISOString().split('T')[0],
          category: expense.category,
          description: expense.description,
          amount: expenseAmount,
          requestedBy: expense.requestedBy ? expense.requestedBy.username : 'Unknown'
        });
      });

      // Convert to array and calculate daily breakdown
      const branchCashflowArray = Object.values(branchCashflow)
        .map(branch => {
          // Daily breakdown
          const dailyBreakdown = {};
          
          // Add revenue by day
          orders.forEach(order => {
            if ((order.stationId || 'UNASSIGNED') === branch.stationId) {
              const dateKey = order.date.toISOString().split('T')[0];
              if (!dailyBreakdown[dateKey]) {
                dailyBreakdown[dateKey] = { revenue: 0, expenses: 0, netCashflow: 0 };
              }
              dailyBreakdown[dateKey].revenue += parseTotal(order.total);
              dailyBreakdown[dateKey].netCashflow += parseTotal(order.total);
            }
          });

          // Add expenses by day
          expenses.forEach(expense => {
            if ((expense.stationId || 'UNASSIGNED') === branch.stationId) {
              const dateKey = expense.date.toISOString().split('T')[0];
              if (!dailyBreakdown[dateKey]) {
                dailyBreakdown[dateKey] = { revenue: 0, expenses: 0, netCashflow: 0 };
              }
              dailyBreakdown[dateKey].expenses += expense.amount || 0;
              dailyBreakdown[dateKey].netCashflow -= expense.amount || 0;
            }
          });

          const formattedDailyBreakdown = Object.entries(dailyBreakdown)
            .map(([date, data]) => ({
              date,
              revenue: data.revenue.toFixed(2),
              expenses: data.expenses.toFixed(2),
              netCashflow: data.netCashflow.toFixed(2)
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

          return {
            ...branch,
            revenue: branch.revenue.toFixed(2),
            expenses: branch.expenses.toFixed(2),
            netCashflow: branch.netCashflow.toFixed(2),
            dailyBreakdown: formattedDailyBreakdown
          };
        })
        .sort((a, b) => parseFloat(b.netCashflow) - parseFloat(a.netCashflow));

      // Calculate totals
      const totalRevenue = branchCashflowArray.reduce((sum, branch) => sum + parseFloat(branch.revenue), 0);
      const totalExpenses = branchCashflowArray.reduce((sum, branch) => sum + parseFloat(branch.expenses), 0);
      const totalNetCashflow = totalRevenue - totalExpenses;

      res.status(200).json({
        success: true,
        data: {
          reportType: 'cashflow-per-branch',
          dateRange: { from: dateFrom, to: dateTo },
          summary: {
            totalBranches: branchCashflowArray.length,
            totalRevenue: totalRevenue.toFixed(2),
            totalExpenses: totalExpenses.toFixed(2),
            totalNetCashflow: totalNetCashflow.toFixed(2)
          },
          branches: branchCashflowArray
        }
      });
    } catch (error) {
      console.error('Generate cashflow per branch report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = ReportController;


const Employee = require('../models/EmployeeModel');
const User = require('../models/UserModel');
const Order = require('../models/OrderModel');

class EmployeeController {
  // Get all employees (admin only)
  static async getAllEmployees(req, res) {
    try {
      const { search, department, status, showArchived = false } = req.query;

      const query = {};
      
      if (showArchived === 'true') {
        query.isArchived = true;
      } else {
        query.isArchived = false;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } },
          { position: { $regex: search, $options: 'i' } }
        ];
      }

      if (department && department !== 'All') {
        query.department = department;
      }

      if (status && status !== 'All') {
        query.status = status;
      }

      const employees = await Employee.find(query).populate('userId', 'username email role isActive').sort({ name: 1 });

      res.status(200).json({
        success: true,
        data: employees,
        count: employees.length
      });
    } catch (error) {
      console.error('Get all employees error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get single employee (admin only)
  static async getEmployee(req, res) {
    try {
      const { id } = req.params;
      const employee = await Employee.findById(id).populate('userId', 'username email role isActive');

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      res.status(200).json({
        success: true,
        data: employee
      });
    } catch (error) {
      console.error('Get employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create employee (admin only)
  static async createEmployee(req, res) {
    try {
      const { name, employeeId, username, email, password, hireDate, status, stationId } = req.body;

      if (!name || !employeeId || !username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Name, employee ID, username, email, and password are required'
        });
      }

      // Check if employee ID already exists
      const existingEmployee = await Employee.findOne({ employeeId });

      if (existingEmployee) {
        return res.status(409).json({
          success: false,
          message: 'Employee with this ID already exists'
        });
      }

      // Check if username or email already exists in User collection
      const existingUser = await User.findOne({
        $or: [
          { username: username },
          { email: email.toLowerCase() }
        ]
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: existingUser.username === username 
            ? 'Username already taken' 
            : 'Email already registered'
        });
      }

      // Create User account
      const user = new User({
        username,
        email: email.toLowerCase(),
        password, // Will be hashed by pre-save middleware
        role: 'staff',
        isActive: status === 'Active' || status === undefined || status === null,
        stationId: stationId || null
      });

      await user.save();

      // Create Employee record linked to User
      const employee = new Employee({
        name,
        employeeId,
        userId: user._id,
        position: 'Staff', // All employees are staff
        department: 'Staff',
        hireDate: hireDate || new Date(),
        email: email.toLowerCase(),
        status: status || 'Active',
        stationId: stationId || null
      });

      await employee.save();

      // Populate userId for response
      await employee.populate('userId', 'username email role isActive');

      res.status(201).json({
        success: true,
        message: 'Employee and account created successfully',
        data: employee
      });
    } catch (error) {
      console.error('Create employee error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Employee ID, username, or email already exists'
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

  // Toggle account status (enable/disable) (admin only)
  static async toggleAccountStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const employee = await Employee.findById(id).populate('userId');

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      if (!employee.userId) {
        return res.status(400).json({
          success: false,
          message: 'Employee does not have a user account'
        });
      }

      // Update User account status
      const user = await User.findById(employee.userId._id || employee.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User account not found'
        });
      }

      user.isActive = isActive === true || isActive === 'true';
      await user.save();

      // Update employee status as well
      employee.status = user.isActive ? 'Active' : 'Inactive';
      await employee.save();

      res.status(200).json({
        success: true,
        message: `Account ${user.isActive ? 'enabled' : 'disabled'} successfully`,
        data: {
          employee: employee,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            isActive: user.isActive
          }
        }
      });
    } catch (error) {
      console.error('Toggle account status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update employee (admin only)
  static async updateEmployee(req, res) {
    try {
      const { id } = req.params;
      const { name, employeeId, position, department, hireDate, email, phone, status, notes, stationId } = req.body;

      const employee = await Employee.findById(id);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      if (name) employee.name = name;
      if (employeeId && employeeId !== employee.employeeId) {
        // Check if new ID is taken
        const existing = await Employee.findOne({ employeeId, _id: { $ne: id } });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Employee ID already taken'
          });
        }
        employee.employeeId = employeeId;
      }
      if (position) employee.position = position;
      if (department) employee.department = department;
      if (hireDate) employee.hireDate = hireDate;
      if (email) employee.email = email.toLowerCase();
      if (phone !== undefined) employee.phone = phone;
      const previousStatus = employee.status;
      if (status) employee.status = status;
      if (notes !== undefined) employee.notes = notes;
      if (stationId !== undefined) employee.stationId = stationId;

      await employee.save();

      // Update linked User document when employee is edited
      if (employee.userId) {
        const userUpdates = {};
        if (stationId !== undefined) {
          userUpdates.stationId = stationId || null;
        }
        // If status changed, reflect it in User.isActive so login/access is enforced server-side
        if (status && status !== previousStatus) {
          userUpdates.isActive = status === 'Active';
        }
        if (Object.keys(userUpdates).length > 0) {
          await User.findByIdAndUpdate(employee.userId, userUpdates);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Employee updated successfully',
        data: employee
      });
    } catch (error) {
      console.error('Update employee error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Employee ID already exists'
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

  // Archive employee (admin only)
  static async archiveEmployee(req, res) {
    try {
      const { id } = req.params;

      const employee = await Employee.findByIdAndUpdate(
        id,
        { isArchived: true },
        { new: true }
      );

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Employee archived successfully',
        data: employee
      });
    } catch (error) {
      console.error('Archive employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get employee performance metrics (admin only)
  static async getEmployeePerformance(req, res) {
    try {
      const { id } = req.params;
      const employee = await Employee.findById(id).populate('userId', 'username email role isActive lastLogin');

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      if (!employee.userId) {
        return res.status(200).json({
          success: true,
          data: {
            ordersProcessed: 0,
            attendance: 0,
            rating: 0
          }
        });
      }

      // Count orders processed by this employee
      const ordersProcessed = await Order.countDocuments({
        createdBy: employee.userId._id || employee.userId,
        isArchived: false,
        isDraft: { $ne: true }
      });

      // Calculate attendance percentage
      // For now, calculate based on account status and activity
      // If account is active and has recent login, attendance is high
      // This is a simplified calculation - can be enhanced with actual attendance tracking
      let attendance = 0;
      if (employee.userId.isActive) {
        if (employee.userId.lastLogin) {
          const daysSinceLogin = Math.floor((Date.now() - new Date(employee.userId.lastLogin).getTime()) / (1000 * 60 * 60 * 24));
          // If logged in within last 7 days, attendance is good
          if (daysSinceLogin <= 7) {
            attendance = 95;
          } else if (daysSinceLogin <= 30) {
            attendance = 75;
          } else {
            attendance = 50;
          }
        } else {
          // Account created but never logged in
          attendance = 0;
        }
      } else {
        attendance = 0;
      }

      // Calculate rating (simplified - can be enhanced with actual rating system)
      // For now, base it on orders processed and attendance
      let rating = 0;
      if (ordersProcessed > 0) {
        // Base rating on orders and attendance
        const ordersScore = Math.min(ordersProcessed / 10, 1) * 2; // Max 2 points for orders
        const attendanceScore = (attendance / 100) * 3; // Max 3 points for attendance
        rating = Math.min(ordersScore + attendanceScore, 5); // Max 5.0 rating
        rating = Math.max(rating, 3.0); // Min 3.0 rating if employee has activity
      }

      res.status(200).json({
        success: true,
        data: {
          ordersProcessed,
          attendance: Math.round(attendance),
          rating: parseFloat(rating.toFixed(1))
        }
      });
    } catch (error) {
      console.error('Get employee performance error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Unarchive employee (admin only)
  static async unarchiveEmployee(req, res) {
    try {
      const { id } = req.params;

      const employee = await Employee.findByIdAndUpdate(
        id,
        { isArchived: false },
        { new: true }
      );

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Employee unarchived successfully',
        data: employee
      });
    } catch (error) {
      console.error('Unarchive employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = EmployeeController;


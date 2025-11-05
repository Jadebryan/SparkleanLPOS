require('dotenv').config();
const express = require("express");
const cors = require("cors");
const ConnectDb = require("./configs/db");
const { cleanupScheduledDeletions } = require("./utils/cleanupScheduledDeletions");

// Import routes
const authRoutes = require("./routes/AuthRoutes");
const orderRoutes = require("./routes/OrderRoutes");
const customerRoutes = require("./routes/CustomerRoutes");
const serviceRoutes = require("./routes/ServiceRoutes");
const expenseRoutes = require("./routes/ExpenseRoutes");
const employeeRoutes = require("./routes/EmployeeRoutes");
const discountRoutes = require("./routes/DiscountRoutes");
const dashboardRoutes = require("./routes/DashboardRoutes");
const reportRoutes = require("./routes/ReportRoutes");
const stationRoutes = require("./routes/StationRoutes");

const app = express();

// Middleware
app.use(cors());
// Increase body size limit to 50MB to handle base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/discounts", discountRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/notifications", require("./routes/NotificationRoutes"));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Connect DB and start server
ConnectDb().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`\n\n🚀 Server running on http://localhost:${PORT}\n`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    
    // Schedule cleanup task to run daily at midnight
    // Run cleanup immediately on startup, then schedule daily
    cleanupScheduledDeletions().catch(err => {
      console.error('Initial cleanup error:', err);
    });
    
    // Run cleanup every 24 hours
    setInterval(() => {
      cleanupScheduledDeletions().catch(err => {
        console.error('Scheduled cleanup error:', err);
      });
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
    
    // Cleanup expired verification codes every 5 minutes
    const AuthController = require('./controllers/AuthController');
    setInterval(() => {
      AuthController.cleanupExpiredCodes();
    }, 5 * 60 * 1000); // 5 minutes
    
    console.log('🧹 Scheduled deletion cleanup initialized (runs daily)\n');
    console.log('🔐 Email verification code cleanup initialized (runs every 5 minutes)\n');
    
    // Verify email configuration on startup
    const { verifyEmailConfig } = require('./utils/emailService');
    verifyEmailConfig().then(result => {
      if (result.configured) {
        console.log(`✅ ${result.message}\n`);
      } else {
        console.log(`⚠️  ${result.message}\n`);
        console.log('📧 To enable email functionality, configure one of the following:\n');
        console.log('   Option 1: Gmail App Password');
        console.log('   - Set GMAIL_USER=your-email@gmail.com');
        console.log('   - Set GMAIL_APP_PASSWORD=your-app-password\n');
        console.log('   Option 2: SMTP Server');
        console.log('   - Set SMTP_HOST=smtp.your-provider.com');
        console.log('   - Set SMTP_PORT=587 (or 465 for SSL)');
        console.log('   - Set SMTP_USER=your-email@domain.com');
        console.log('   - Set SMTP_PASS=your-password\n');
      }
    });
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

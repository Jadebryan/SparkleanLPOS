require('dotenv').config();
const express = require("express");
const cors = require("cors");
const http = require('http');
const ConnectDb = require("./configs/db");
const { cleanupScheduledDeletions } = require("./utils/cleanupScheduledDeletions");
const sslConfig = require("./configs/ssl");
const httpsRedirect = require("./middleware/httpsRedirect");
const requestLogger = require("./middleware/requestLogger");
const logger = require("./utils/logger");

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
const backupRoutes = require("./routes/BackupRoutes");
const rbacRoutes = require("./routes/RBACRoutes");
const systemSettingRoutes = require("./routes/SystemSettingRoutes");
const uploadRoutes = require("./routes/UploadRoutes");

const app = express();

// Middleware
// HTTPS redirect middleware (must be before other middleware)
app.use(httpsRedirect);

// Request logging middleware (log all HTTP requests)
app.use(requestLogger);

app.use(cors());
// Increase body size limit to 50MB to handle base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files (for emergency recovery page)
app.use(express.static('public'));

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
app.use("/api/backups", backupRoutes);
app.use("/api/audit-logs", require("./routes/AuditLogRoutes"));
app.use("/api/rbac", rbacRoutes);
app.use("/api/system-settings", systemSettingRoutes);
app.use("/api/upload", uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// SMS test endpoint (for debugging)
app.get('/api/test-sms', async (req, res) => {
  try {
    const smsService = require('./utils/smsService');
    const { phone, message } = req.query;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required. Use ?phone=+1234567890&message=Test'
      });
    }
    
    const testMessage = message || 'Test SMS from Laundry POS';
    const result = await smsService.sendSMS(phone, testMessage);
    
    res.json({
      success: result.success,
      message: result.success ? 'SMS sent successfully' : 'SMS failed to send',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing SMS',
      error: error.message
    });
  }
});

// Connect DB and start server
ConnectDb().then(async () => {
  logger.info('Database connected successfully');
  
  // Initialize RBAC
  try {
    const { initializeRBAC } = require('./utils/rbac');
    await initializeRBAC();
    logger.info('RBAC initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize RBAC:', error);
  }
  
  const PORT = process.env.PORT || 5000;
  const HTTPS_PORT = process.env.HTTPS_PORT || 5443;
  const sslStatus = sslConfig.getStatus();
    
  // Function to start scheduled tasks
  const startScheduledTasks = () => {
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
    
    // Automated database backups (daily at 2 AM)
    const backupService = require('./utils/backupService');
    const scheduleBackup = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(2, 0, 0, 0); // 2 AM
      
      const msUntilBackup = tomorrow.getTime() - now.getTime();
      
      setTimeout(() => {
        console.log('🔄 Starting scheduled daily backup...');
        backupService.createBackup().then(result => {
          if (result.success) {
            console.log(`✅ Scheduled backup completed: ${result.name}\n`);
          } else {
            console.error(`❌ Scheduled backup failed: ${result.error}\n`);
          }
        });
        
        // Schedule next backup (24 hours later)
        setInterval(() => {
          console.log('🔄 Starting scheduled daily backup...');
          backupService.createBackup().then(result => {
            if (result.success) {
              console.log(`✅ Scheduled backup completed: ${result.name}\n`);
            } else {
              console.error(`❌ Scheduled backup failed: ${result.error}\n`);
            }
          });
        }, 24 * 60 * 60 * 1000); // 24 hours
      }, msUntilBackup);
    };
    
    // Cleanup old backups (daily at 3 AM)
    const scheduleBackupCleanup = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(3, 0, 0, 0); // 3 AM
      
      const msUntilCleanup = tomorrow.getTime() - now.getTime();
      
      setTimeout(() => {
        console.log('🧹 Starting scheduled backup cleanup...');
        const result = backupService.cleanupOldBackups();
        if (result.success) {
          console.log(`✅ Cleanup completed: Deleted ${result.deletedCount} backup(s), Freed ${result.freedSpace}\n`);
        }
        
        // Schedule next cleanup (24 hours later)
        setInterval(() => {
          console.log('🧹 Starting scheduled backup cleanup...');
          const result = backupService.cleanupOldBackups();
          if (result.success) {
            console.log(`✅ Cleanup completed: Deleted ${result.deletedCount} backup(s), Freed ${result.freedSpace}\n`);
          }
        }, 24 * 60 * 60 * 1000); // 24 hours
      }, msUntilCleanup);
    };
    
    // Initialize scheduled backups
    if (process.env.ENABLE_AUTO_BACKUP !== 'false') {
      scheduleBackup();
      scheduleBackupCleanup();
      console.log('💾 Automated backups initialized (daily at 2 AM)\n');
      console.log('🧹 Backup cleanup initialized (daily at 3 AM)\n');
    }
    
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
  };

  // Check if HTTPS should be enabled
  if (sslStatus.enabled && sslStatus.certificatesExist()) {
    try {
      // Create HTTPS server
      const httpsServer = sslConfig.createHTTPSServer(app);
      
      // Start HTTPS server
      httpsServer.listen(HTTPS_PORT, () => {
        console.log(`\n\n🔒 HTTPS Server running on https://localhost:${HTTPS_PORT}\n`);
        console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}\n`);
        console.log(`✅ SSL/TLS encryption enabled\n`);
        console.log(`📜 Certificate: ${sslStatus.certPath}\n`);
        console.log(`🔑 Private Key: ${sslStatus.keyPath}\n`);
        
        startScheduledTasks();
      });

      // Start HTTP server for redirects (only in production or when explicitly enabled)
      if (process.env.NODE_ENV === 'production' || process.env.ENABLE_HTTPS === 'true') {
        const httpServer = http.createServer((req, res) => {
          const host = req.headers.host;
          const url = req.url;
          res.writeHead(301, { "Location": `https://${host}${url}` });
          res.end();
        });

        httpServer.listen(PORT, () => {
          console.log(`🔄 HTTP redirect server running on http://localhost:${PORT} (redirects to HTTPS)\n`);
        });
      } else {
        // In development, also start HTTP server on different port for convenience
        http.createServer(app).listen(PORT, () => {
          console.log(`🌐 HTTP Server also running on http://localhost:${PORT} (development mode)\n`);
          console.log(`⚠️  Note: Use HTTPS (port ${HTTPS_PORT}) for secure connections\n`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to start HTTPS server:', error.message);
      console.log('⚠️  Falling back to HTTP only...\n');
      
      // Fallback to HTTP
      app.listen(PORT, () => {
        console.log(`\n\n🚀 Server running on http://localhost:${PORT}\n`);
        console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}\n`);
        console.log(`⚠️  HTTPS not enabled. SSL certificates not found or invalid.\n`);
        console.log(`📝 To enable HTTPS, see server/HTTPS_SETUP.md\n`);
        
        startScheduledTasks();
      });
    }
  } else {
    // HTTPS not enabled or certificates not found - start HTTP only
    app.listen(PORT, () => {
      console.log(`\n\n🚀 Server running on http://localhost:${PORT}\n`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}\n`);
      
      if (process.env.NODE_ENV === 'production') {
        console.log(`⚠️  WARNING: Running in production without HTTPS!\n`);
        console.log(`📝 To enable HTTPS, see server/HTTPS_SETUP.md\n`);
      } else {
        console.log(`ℹ️  HTTPS not enabled (development mode)\n`);
        console.log(`📝 To enable HTTPS, see server/HTTPS_SETUP.md\n`);
      }
      
      startScheduledTasks();
    });
  }
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

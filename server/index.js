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
const { validateEnvironment } = require("./utils/envValidator");

// Validate environment variables on startup
try {
  validateEnvironment();
} catch (error) {
  logger.error('❌ Environment validation failed:', error.message);
  logger.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

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
const supportRoutes = require("./routes/SupportRoutes");
const voucherRoutes = require("./routes/VoucherRoutes");

const app = express();

// Security middleware (must be first)
const helmet = require('helmet');
const compression = require('compression');

// Helmet security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  crossOriginEmbedderPolicy: false, // Allow external resources if needed
}));

// Compression middleware (compress responses)
app.use(compression());

// HTTPS redirect middleware (must be before other middleware)
app.use(httpsRedirect);

// Request logging middleware (log all HTTP requests)
app.use(requestLogger);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
// Reduced from 50MB to 10MB for better security
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (for emergency recovery page)
app.use(express.static('public'));

// Rate limiting middleware
const { apiLimiter, authLimiter, sensitiveLimiter, uploadLimiter } = require('./middleware/rateLimiter');

// Apply rate limiting to routes
// The rate limiter itself handles skipping (health check, lock endpoints in dev, etc.)
app.use("/api/", apiLimiter);

// API Versioning - Create versioned route handlers
const v1Router = express.Router();

// Apply rate limiting to versioned routes
v1Router.use("/auth/login", authLimiter);
v1Router.use("/auth/register", authLimiter);
v1Router.use("/auth/forgot-password", sensitiveLimiter);
v1Router.use("/auth/reset-password", sensitiveLimiter);

// Mount all routes under v1
v1Router.use("/auth", authRoutes);
v1Router.use("/orders", orderRoutes);
v1Router.use("/customers", customerRoutes);
v1Router.use("/services", serviceRoutes);
v1Router.use("/expenses", expenseRoutes);
v1Router.use("/employees", employeeRoutes);
v1Router.use("/discounts", discountRoutes);
v1Router.use("/dashboard", dashboardRoutes);
v1Router.use("/reports", reportRoutes);
v1Router.use("/stations", stationRoutes);
v1Router.use("/notifications", require("./routes/NotificationRoutes"));
v1Router.use("/backups", backupRoutes);
v1Router.use("/audit-logs", require("./routes/AuditLogRoutes"));
v1Router.use("/rbac", rbacRoutes);
v1Router.use("/system-settings", systemSettingRoutes);
v1Router.use("/upload", uploadLimiter, uploadRoutes);
v1Router.use("/support", supportRoutes);
v1Router.use("/vouchers", voucherRoutes);

// Mount versioned API routes
app.use("/api/v1", v1Router);

// Backward compatibility: Also mount routes at /api (defaults to v1)
// This ensures existing clients continue to work
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", sensitiveLimiter);
app.use("/api/auth/reset-password", sensitiveLimiter);
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
app.use("/api/upload", uploadLimiter, uploadRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/vouchers", voucherRoutes);

// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
    },
    database: 'unknown',
    version: require('./package.json').version,
    environment: process.env.NODE_ENV || 'development',
  };

  // Check database connection
  try {
    await mongoose.connection.db.admin().ping();
    health.database = 'connected';
  } catch (error) {
    health.database = 'disconnected';
    health.status = 'unhealthy';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Error handling middleware (must be last)
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

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

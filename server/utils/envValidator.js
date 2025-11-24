/**
 * Environment Variable Validator
 * Validates required environment variables on server startup
 */

const logger = require('./logger');

const requiredEnvVars = {
  production: [
    'MONGODB_URI',
    'JWT_SECRET',
    'ALLOWED_ORIGINS',
  ],
  development: [
    'MONGODB_URI',
    'JWT_SECRET',
  ],
};

const optionalEnvVars = [
  'GMAIL_USER',
  'GMAIL_APP_PASSWORD',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'RECAPTCHA_SECRET_KEY',
  'CLOUDINARY_CLOUD_NAME',
];

/**
 * Validates JWT_SECRET strength
 */
function validateJWTSecret() {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is required but not set');
  }
  
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  
  if (secret === 'your-super-secret-jwt-key-change-this-in-production') {
    throw new Error('JWT_SECRET must be changed from default value');
  }
  
  // Check for common weak secrets
  const weakSecrets = [
    'secret',
    'password',
    '123456',
    'admin',
    'test',
  ];
  
  if (weakSecrets.some(weak => secret.toLowerCase().includes(weak))) {
    logger.warn('JWT_SECRET appears to be weak. Please use a strong, randomly generated secret.');
  }
}

/**
 * Validates MongoDB URI format
 */
function validateMongoDBURI() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    throw new Error('MONGODB_URI is required but not set');
  }
  
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  }
}

/**
 * Validates CORS origins format
 */
function validateCORSOrigins() {
  const origins = process.env.ALLOWED_ORIGINS;
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production' && !origins) {
    throw new Error('ALLOWED_ORIGINS is required in production');
  }
  
  if (origins) {
    const originList = origins.split(',');
    originList.forEach(origin => {
      const trimmed = origin.trim();
      if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        throw new Error(`Invalid CORS origin format: ${trimmed}. Must start with http:// or https://`);
      }
    });
  }
}

/**
 * Main validation function
 */
function validateEnvironment() {
  const env = process.env.NODE_ENV || 'development';
  const required = requiredEnvVars[env] || requiredEnvVars.development;
  
  logger.info('Validating environment variables...');
  
  // Check required variables
  const missing = required.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(error);
    throw new Error(error);
  }
  
  // Validate specific variables
  try {
    validateJWTSecret();
    validateMongoDBURI();
    validateCORSOrigins();
  } catch (error) {
    logger.error('Environment validation failed:', error.message);
    throw error;
  }
  
  // Warn about missing optional variables
  const missingOptional = optionalEnvVars.filter(varName => !process.env[varName]);
  if (missingOptional.length > 0) {
    logger.warn(`Optional environment variables not set: ${missingOptional.join(', ')}`);
    logger.warn('Some features may not work without these variables.');
  }
  
  logger.info('✅ Environment variables validated successfully');
}

module.exports = {
  validateEnvironment,
  validateJWTSecret,
  validateMongoDBURI,
  validateCORSOrigins,
};


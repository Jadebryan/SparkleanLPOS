/**
 * HTTPS Redirect Middleware
 * Redirects all HTTP traffic to HTTPS in production
 */
const httpsRedirect = (req, res, next) => {
  // Only redirect in production or when HTTPS is explicitly enabled
  const isProduction = process.env.NODE_ENV === 'production';
  const httpsEnabled = process.env.ENABLE_HTTPS === 'true';

  if ((isProduction || httpsEnabled) && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    // Check if we're behind a proxy (like Heroku, AWS ELB, etc.)
    const protocol = req.get('x-forwarded-proto') || 'http';
    const host = req.get('host');
    const url = req.originalUrl || req.url;
    
    return res.redirect(301, `https://${host}${url}`);
  }

  next();
};

module.exports = httpsRedirect;


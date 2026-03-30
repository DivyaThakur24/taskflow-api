const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Verify JWT and attach user to req
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Support Bearer token in Authorization header
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 'Authentication required. Please log in.', 401);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check user still exists and is active
    const user = await User.findById(decoded.id).select('+isActive');
    if (!user || !user.isActive) {
      return errorResponse(res, 'User no longer exists or has been deactivated.', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token has expired. Please log in again.', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token. Please log in again.', 401);
    }
    logger.error('Auth middleware error:', error);
    return errorResponse(res, 'Authentication failed.', 500);
  }
};

/**
 * Role-based access control factory
 * Usage: authorize('admin') or authorize('admin', 'moderator')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
        403
      );
    }
    next();
  };
};

module.exports = { authenticate, authorize };

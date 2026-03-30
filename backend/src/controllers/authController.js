const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

// ─── Token generators ──────────────────────────────────────────────────────────
const generateAccessToken = (userId, role) =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

// ─── Register ──────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'Email already registered', 409);
    }

    // Prevent self-assigning admin via API (only existing admins can create admins)
    const assignedRole = role === 'admin' && req.user?.role !== 'admin' ? 'user' : (role || 'user');

    const user = await User.create({ name, email, password, role: assignedRole });

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store hashed refresh token
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    logger.info(`New user registered: ${email} (${assignedRole})`);

    return successResponse(
      res,
      { user, accessToken, refreshToken },
      'Registration successful',
      201
    );
  } catch (error) {
    next(error);
  }
};

// ─── Login ─────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account has been deactivated. Contact support.', 403);
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`User logged in: ${email}`);

    return successResponse(res, { user, accessToken, refreshToken }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// ─── Refresh Token ─────────────────────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return errorResponse(res, 'Refresh token required', 400);

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return successResponse(
      res,
      { accessToken: newAccessToken, refreshToken: newRefreshToken },
      'Token refreshed'
    );
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Refresh token expired. Please log in again.', 401);
    }
    next(error);
  }
};

// ─── Logout ────────────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    return successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

// ─── Get Current User ──────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    return successResponse(res, { user }, 'Profile fetched');
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refreshToken, logout, getMe };

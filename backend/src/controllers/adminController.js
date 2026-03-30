const User = require('../models/User');
const Task = require('../models/Task');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// ─── List all users ────────────────────────────────────────────────────────────
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return paginatedResponse(res, users, {
      page, limit, total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Deactivate a user ─────────────────────────────────────────────────────────
const deactivateUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return errorResponse(res, 'Cannot deactivate your own account', 400);
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!user) return errorResponse(res, 'User not found', 404);
    return successResponse(res, { user }, 'User deactivated');
  } catch (error) {
    next(error);
  }
};

// ─── Promote user to admin ─────────────────────────────────────────────────────
const promoteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: 'admin' },
      { new: true }
    );
    if (!user) return errorResponse(res, 'User not found', 404);
    return successResponse(res, { user }, 'User promoted to admin');
  } catch (error) {
    next(error);
  }
};

// ─── Dashboard stats ───────────────────────────────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const [totalUsers, totalTasks, tasksByStatus, recentUsers] = await Promise.all([
      User.countDocuments(),
      Task.countDocuments(),
      Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt'),
    ]);

    return successResponse(res, {
      totalUsers,
      totalTasks,
      tasksByStatus,
      recentUsers,
    }, 'Dashboard data fetched');
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, deactivateUser, promoteUser, getDashboard };

const Task = require('../models/Task');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// ─── Create Task ───────────────────────────────────────────────────────────────
const createTask = async (req, res, next) => {
  try {
    const task = await Task.create({ ...req.body, owner: req.user._id });
    return successResponse(res, { task }, 'Task created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// ─── Get All Tasks (own tasks; admin sees all) ─────────────────────────────────
const getTasks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filters
    const filter = {};
    if (req.user.role !== 'admin') filter.owner = req.user._id;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('owner', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    return paginatedResponse(res, tasks, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Single Task ───────────────────────────────────────────────────────────
const getTask = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') query.owner = req.user._id;

    const task = await Task.findOne(query).populate('owner', 'name email');
    if (!task) return errorResponse(res, 'Task not found', 404);

    return successResponse(res, { task });
  } catch (error) {
    next(error);
  }
};

// ─── Update Task ───────────────────────────────────────────────────────────────
const updateTask = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') query.owner = req.user._id;

    const task = await Task.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true,
    });
    if (!task) return errorResponse(res, 'Task not found or not authorized', 404);

    return successResponse(res, { task }, 'Task updated successfully');
  } catch (error) {
    next(error);
  }
};

// ─── Delete Task (soft delete) ─────────────────────────────────────────────────
const deleteTask = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') query.owner = req.user._id;

    const task = await Task.findOneAndUpdate(
      query,
      { isDeleted: true },
      { new: true }
    );
    if (!task) return errorResponse(res, 'Task not found or not authorized', 404);

    return successResponse(res, null, 'Task deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Get All Users (admin only) ────────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const [total, byStatus, byPriority] = await Promise.all([
      Task.countDocuments(),
      Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Task.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
    ]);

    return successResponse(res, { total, byStatus, byPriority }, 'Stats fetched');
  } catch (error) {
    next(error);
  }
};

module.exports = { createTask, getTasks, getTask, updateTask, deleteTask, getStats };

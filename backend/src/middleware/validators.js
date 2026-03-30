const { body, param, query, validationResult } = require('express-validator');

/**
 * Runs after validator chains — returns 400 if any errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

// ─── Auth validators ───────────────────────────────────────────────────────────
const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
  validate,
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

// ─── Task validators ───────────────────────────────────────────────────────────
const createTaskValidator = [
  body('title').trim().notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters'),
  body('description').optional().trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('status').optional().isIn(['todo', 'in-progress', 'done']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('Invalid date format (use ISO 8601)'),
  body('tags').optional().isArray({ max: 10 }).withMessage('Tags must be an array (max 10)'),
  validate,
];

const updateTaskValidator = [
  param('id').isMongoId().withMessage('Invalid task ID'),
  body('title').optional().trim()
    .isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters'),
  body('description').optional().trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('status').optional().isIn(['todo', 'in-progress', 'done']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('Invalid date format'),
  validate,
];

const mongoIdValidator = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  validate,
];

const paginationValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),
  validate,
];

module.exports = {
  registerValidator,
  loginValidator,
  createTaskValidator,
  updateTaskValidator,
  mongoIdValidator,
  paginationValidator,
};

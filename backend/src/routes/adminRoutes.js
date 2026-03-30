const express = require('express');
const router = express.Router();
const { getUsers, deactivateUser, promoteUser, getDashboard } = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const { mongoIdValidator, paginationValidator } = require('../middleware/validators');

// All admin routes: authenticated + admin role
router.use(authenticate, authorize('admin'));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints
 */

router.get('/dashboard', getDashboard);
router.get('/users', paginationValidator, getUsers);
router.patch('/users/:id/deactivate', mongoIdValidator, deactivateUser);
router.patch('/users/:id/promote', mongoIdValidator, promoteUser);

module.exports = router;

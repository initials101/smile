import express from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  getUserStats,
  deactivateAccount,
  activateAccount
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  validateUserRegistration,
  validateUserLogin,
  validateObjectId
} from '../middleware/validation.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/register', authLimiter, validateUserRegistration, register);
router.post('/login', authLimiter, validateUserLogin, login);

// Protected routes
router.use(protect); // All routes below require authentication

router.get('/profile', generalLimiter, getProfile);
router.put('/profile', generalLimiter, updateProfile);
router.post('/logout', logout);

// Password management
router.put('/change-password', authLimiter, changePassword);

// Account management
router.put('/deactivate', deactivateAccount);

// Admin only routes
router.get('/stats', authorize('admin'), getUserStats);
router.put('/activate/:userId',
  authorize('admin'),
  validateObjectId('userId'),
  activateAccount
);

export default router;

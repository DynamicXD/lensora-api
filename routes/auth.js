// routes/auth.js
import express from 'express';
import { body } from 'express-validator';
import { 
  register, 
  login, 
  getMe, 
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
  verifyEmail
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['user', 'photographer', 'videographer']).withMessage('Invalid role'),
  body('businessName')
    .if(body('role').isIn(['photographer', 'videographer']))
    .notEmpty()
    .withMessage('Business name is required for photographers and videographers'),
  body('description')
    .if(body('role').isIn(['photographer', 'videographer']))
    .notEmpty()
    .withMessage('Description is required for photographers and videographers')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Protected routes (require authentication)
router.get('/me', authenticate, getMe);
router.post('/refresh-token', authenticate, refreshToken);
router.put('/change-password', authenticate, changePasswordValidation, changePassword);
router.post('/logout', authenticate, logout);

export default router;

// routes/reviews.js
import express from 'express';
import { body } from 'express-validator';
import {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  respondToReview,
  markHelpful,
  getProviderReviews,
  getReviewStats
} from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleAuth.js';
import { uploadMultiple } from '../middleware/upload.js';

const router = express.Router();

// Validation rules
const reviewValidation = [
  body('ratings.overall').isInt({ min: 1, max: 5 }).withMessage('Overall rating must be between 1-5'),
  body('ratings.quality').isInt({ min: 1, max: 5 }).withMessage('Quality rating must be between 1-5'),
  body('ratings.professionalism').isInt({ min: 1, max: 5 }).withMessage('Professionalism rating must be between 1-5'),
  body('ratings.communication').isInt({ min: 1, max: 5 }).withMessage('Communication rating must be between 1-5'),
  body('ratings.valueForMoney').isInt({ min: 1, max: 5 }).withMessage('Value rating must be between 1-5'),
  body('ratings.timeliness').isInt({ min: 1, max: 5 }).withMessage('Timeliness rating must be between 1-5'),
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5-100 characters'),
  body('content').trim().isLength({ min: 20, max: 1000 }).withMessage('Content must be between 20-1000 characters'),
  body('recommended').isBoolean().withMessage('Recommended must be a boolean value')
];

// Public routes
router.get('/provider/:providerId/:providerType', getProviderReviews);
router.get('/provider/:providerId/:providerType/stats', getReviewStats);
router.get('/:id', getReviewById);

// Protected routes
router.use(authenticate);

// User routes
router.post('/', authorize('user'), uploadMultiple('photos'), reviewValidation, createReview);
router.get('/my-reviews', authorize('user'), getReviews);
router.put('/:id', authorize('user'), updateReview);
router.delete('/:id', authorize('user'), deleteReview);
router.post('/:id/helpful', markHelpful);

// Provider routes
router.post('/:id/respond', authorize('photographer', 'videographer'), respondToReview);

export default router;

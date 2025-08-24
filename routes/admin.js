// routes/admin.js
import express from 'express';
import {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getAllPhotographers,
  getAllVideographers,
  approveProvider,
  rejectProvider,
  getAllBookings,
  getBookingById,
  updateBookingStatus as adminUpdateBookingStatus,
  getAllReviews,
  hideReview,
  unhideReview,
  getAnalytics,
  getRevenueStats,
  exportData,
  sendBulkNotification,
  manageSubscriptions
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleAuth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard and analytics
router.get('/dashboard', getDashboardStats);
router.get('/analytics', getAnalytics);
router.get('/revenue', getRevenueStats);

// User management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

// Provider management
router.get('/photographers', getAllPhotographers);
router.get('/videographers', getAllVideographers);
router.put('/providers/:id/:type/approve', approveProvider);
router.put('/providers/:id/:type/reject', rejectProvider);

// Booking management
router.get('/bookings', getAllBookings);
router.get('/bookings/:id', getBookingById);
router.put('/bookings/:id/status', adminUpdateBookingStatus);

// Review management
router.get('/reviews', getAllReviews);
router.put('/reviews/:id/hide', hideReview);
router.put('/reviews/:id/unhide', unhideReview);

// System management
router.post('/export/:type', exportData);
router.post('/notifications/bulk', sendBulkNotification);
router.get('/subscriptions', manageSubscriptions);

export default router;

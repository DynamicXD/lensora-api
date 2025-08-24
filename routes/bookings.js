// routes/bookings.js
import express from 'express';
import { 
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  addMessage,
  getAvailableSlots
} from '../controllers/bookingController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleAuth.js';

const router = express.Router();

// All booking routes require authentication
router.use(authenticate);

// Client routes
router.post('/', authorize('user'), createBooking);
router.get('/my-bookings', authorize('user'), getBookings);

// Provider routes
router.get('/my-jobs', authorize('photographer', 'videographer'), getBookings);
router.put('/:id/status', authorize('photographer', 'videographer'), updateBookingStatus);

// Shared routes
router.get('/:id', getBookingById);
router.delete('/:id', cancelBooking);
router.post('/:id/messages', addMessage);

// Utility routes
router.get('/availability/:providerId/:providerType', getAvailableSlots);

export default router;

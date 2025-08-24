// routes/users.js
import express from 'express';
import { 
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
  getUserBookings,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  updatePreferences
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleAuth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', getUserProfile);
router.put('/profile', uploadSingle('avatar'), updateUserProfile);
router.delete('/account', deleteUserAccount);

// Booking routes for users
router.get('/bookings', authorize('user'), getUserBookings);

// Favorites routes
router.post('/favorites/:providerId/:providerType', authorize('user'), addToFavorites);
router.delete('/favorites/:providerId', authorize('user'), removeFromFavorites);
router.get('/favorites', authorize('user'), getFavorites);

// Preferences
router.put('/preferences', updatePreferences);

export default router;

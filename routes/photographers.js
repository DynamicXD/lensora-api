// routes/photographers.js
import express from 'express';
import { 
  getPhotographers, 
  getPhotographerById,
  getPhotographerByUserId,
  updatePhotographer,
  addTeamMember,
  updateTeamMember,
  getTeamAvailability,
  getDashboardStats
} from '../controllers/photographerController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize, authorizeProviderAccess } from '../middleware/roleAuth.js';

const router = express.Router();

// Debug middleware (remove after fixing)
router.use((req, res, next) => {
  console.log(`Photographer Route: ${req.method} ${req.path}`);
  next();
});

// Public routes
router.get('/', getPhotographers);
router.get('/user/:userId', getPhotographerByUserId);
router.get('/:id/availability', getTeamAvailability);

// Protected routes
router.put('/:id', authenticate, authorize('photographer'), authorizeProviderAccess, updatePhotographer);
router.get('/:id/dashboard', authenticate, authorize('photographer'), authorizeProviderAccess, getDashboardStats);
router.post('/:id/team', authenticate, authorize('photographer'), authorizeProviderAccess, addTeamMember);
router.put('/:id/team/:memberId', authenticate, authorize('photographer'), authorizeProviderAccess, updateTeamMember);

// This should be last among /:id routes
router.get('/:id', getPhotographerById);

export default router;

// routes/videographers.js
import express from 'express';
import { 
  getVideographers, 
  getVideographerById, 
  updateVideographer,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
  addEquipment,
  updateEquipment,
  deleteEquipment,
  updateAvailability,
  getTeamAvailability,
  getDashboardStats,
  uploadPortfolioVideo,
  deletePortfolioVideo,
  getBookingHistory
} from '../controllers/videographerController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize, authorizeProviderAccess } from '../middleware/roleAuth.js';
import { uploadSingle, uploadMultiple } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/', getVideographers);
router.get('/:id', getVideographerById);
router.get('/:id/availability', getTeamAvailability);

// Protected routes - videographer only
router.put('/:id', authenticate, authorize('videographer'), authorizeProviderAccess, updateVideographer);
router.get('/:id/dashboard', authenticate, authorize('videographer'), authorizeProviderAccess, getDashboardStats);
router.get('/:id/bookings', authenticate, authorize('videographer'), authorizeProviderAccess, getBookingHistory);

// Portfolio management
router.post('/:id/portfolio', authenticate, authorize('videographer'), authorizeProviderAccess, uploadSingle('video'), uploadPortfolioVideo);
router.delete('/:id/portfolio/:portfolioId', authenticate, authorize('videographer'), authorizeProviderAccess, deletePortfolioVideo);

// Team management routes
router.post('/:id/team', authenticate, authorize('videographer'), authorizeProviderAccess, addTeamMember);
router.put('/:id/team/:memberId', authenticate, authorize('videographer'), authorizeProviderAccess, updateTeamMember);
router.delete('/:id/team/:memberId', authenticate, authorize('videographer'), authorizeProviderAccess, deleteTeamMember);

// Equipment management
router.post('/:id/equipment', authenticate, authorize('videographer'), authorizeProviderAccess, uploadMultiple('images'), addEquipment);
router.put('/:id/equipment/:equipmentId', authenticate, authorize('videographer'), authorizeProviderAccess, updateEquipment);
router.delete('/:id/equipment/:equipmentId', authenticate, authorize('videographer'), authorizeProviderAccess, deleteEquipment);

// Availability management
router.put('/:id/availability', authenticate, authorize('videographer'), authorizeProviderAccess, updateAvailability);

export default router;

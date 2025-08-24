// middleware/validation.js
import { body, param, query, validationResult } from 'express-validator';

// Common validation rules
export const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email address');

export const validatePassword = body('password')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long');

export const validateName = body('name')
  .trim()
  .isLength({ min: 2, max: 50 })
  .withMessage('Name must be between 2-50 characters');

export const validateObjectId = (fieldName) => 
  param(fieldName).isMongoId().withMessage(`Invalid ${fieldName} ID`);

// Registration validation
export const validateRegistration = [
  validateName,
  validateEmail,
  validatePassword,
  body('role')
    .optional()
    .isIn(['user', 'photographer', 'videographer'])
    .withMessage('Invalid role'),
  body('businessName')
    .if(body('role').isIn(['photographer', 'videographer']))
    .notEmpty()
    .withMessage('Business name is required for photographers and videographers'),
  body('description')
    .if(body('role').isIn(['photographer', 'videographer']))
    .notEmpty()
    .withMessage('Description is required for photographers and videographers')
];

// Login validation
export const validateLogin = [
  validateEmail,
  body('password').notEmpty().withMessage('Password is required')
];

// Profile update validation
export const validateProfileUpdate = [
  body('businessName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2-100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10-1000 characters'),
  body('specializations')
    .optional()
    .isArray()
    .withMessage('Specializations must be an array'),
  body('experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0-50 years'),
  body('pricing.hourly')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number'),
  body('pricing.halfDay')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Half day rate must be a positive number'),
  body('pricing.fullDay')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Full day rate must be a positive number')
];

// Booking validation
export const validateBooking = [
  body('providerId').isMongoId().withMessage('Invalid provider ID'),
  body('providerType')
    .isIn(['Photographer', 'Videographer'])
    .withMessage('Invalid provider type'),
  body('eventDetails.type')
    .isIn(['wedding', 'portrait', 'event', 'corporate', 'commercial', 'other'])
    .withMessage('Invalid event type'),
  body('eventDetails.title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Event title must be between 5-100 characters'),
  body('eventDetails.date')
    .isISO8601()
    .withMessage('Invalid event date'),
  body('eventDetails.startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid start time format (HH:MM)'),
  body('eventDetails.endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid end time format (HH:MM)'),
  body('eventDetails.location.venue')
    .trim()
    .notEmpty()
    .withMessage('Venue is required'),
  body('eventDetails.location.address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('pricing.totalAmount')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number')
];

// Review validation
export const validateReview = [
  body('bookingId').isMongoId().withMessage('Invalid booking ID'),
  body('ratings.overall')
    .isInt({ min: 1, max: 5 })
    .withMessage('Overall rating must be between 1-5'),
  body('ratings.quality')
    .isInt({ min: 1, max: 5 })
    .withMessage('Quality rating must be between 1-5'),
  body('ratings.professionalism')
    .isInt({ min: 1, max: 5 })
    .withMessage('Professionalism rating must be between 1-5'),
  body('ratings.communication')
    .isInt({ min: 1, max: 5 })
    .withMessage('Communication rating must be between 1-5'),
  body('ratings.valueForMoney')
    .isInt({ min: 1, max: 5 })
    .withMessage('Value rating must be between 1-5'),
  body('ratings.timeliness')
    .isInt({ min: 1, max: 5 })
    .withMessage('Timeliness rating must be between 1-5'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5-100 characters'),
  body('content')
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Content must be between 20-1000 characters'),
  body('recommended')
    .isBoolean()
    .withMessage('Recommended must be a boolean value')
];

// Team member validation
export const validateTeamMember = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2-50 characters'),
  body('role')
    .isIn(['photographer', 'assistant', 'editor', 'equipment_manager', 'drone_operator', 'lighting_specialist'])
    .withMessage('Invalid role'),
  body('experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0-50 years'),
  body('hourlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number')
];

// Equipment validation
export const validateEquipment = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Equipment name must be between 2-100 characters'),
  body('category')
    .isIn(['camera', 'lens', 'lighting', 'audio', 'drone', 'tripod', 'stabilizer', 'other'])
    .withMessage('Invalid category'),
  body('condition')
    .optional()
    .isIn(['excellent', 'good', 'fair', 'needs_repair'])
    .withMessage('Invalid condition'),
  body('rentalPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Rental price must be a positive number')
];

// Query validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1-100')
];

export const validateSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search term must be between 2-100 characters'),
  query('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2-50 characters'),
  query('specialization')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Specialization must be between 2-50 characters'),
  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0-5'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
];

// Validation result handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Combined validation middleware
export const validate = (validations) => {
  return [
    ...validations,
    handleValidationErrors
  ];
};

export default {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validateBooking,
  validateReview,
  validateTeamMember,
  validateEquipment,
  validatePagination,
  validateSearch,
  handleValidationErrors,
  validate
};

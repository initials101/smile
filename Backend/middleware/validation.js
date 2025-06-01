import { body, param, query, validationResult } from 'express-validator';
import { validationErrorResponse } from '../utils/response.js';

// Check validation results
export const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationErrorResponse(res, errors.array());
  }
  next();
};

// User validation rules
export const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name must contain only letters and spaces'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name must contain only letters and spaces'),
  body('phone')
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  body('role')
    .optional()
    .isIn(['patient', 'dentist', 'admin', 'staff'])
    .withMessage('Invalid role'),
  checkValidation
];

export const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  checkValidation
];

// Patient validation rules
export const validatePatient = [
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
    .custom(value => {
      const today = new Date();
      const birthDate = new Date(value);
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age > 120 || birthDate > today) {
        throw new Error('Invalid date of birth');
      }
      return true;
    }),
  body('gender')
    .isIn(['male', 'female', 'other', 'prefer-not-to-say'])
    .withMessage('Invalid gender'),
  body('address.street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required'),
  body('address.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('address.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('address.zipCode')
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage('Please provide a valid ZIP code'),
  body('emergencyContact.name')
    .trim()
    .notEmpty()
    .withMessage('Emergency contact name is required'),
  body('emergencyContact.phone')
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid emergency contact phone'),
  body('emergencyContact.relationship')
    .trim()
    .notEmpty()
    .withMessage('Emergency contact relationship is required'),
  checkValidation
];

// Dentist validation rules
export const validateDentist = [
  body('specializations')
    .isArray()
    .withMessage('Specializations must be an array')
    .custom(value => {
      const validSpecializations = [
        'general-dentistry', 'orthodontics', 'periodontics', 'endodontics',
        'oral-surgery', 'prosthodontics', 'pediatric-dentistry', 'cosmetic-dentistry',
        'oral-pathology', 'dental-implants'
      ];
      const invalid = value.filter(spec => !validSpecializations.includes(spec));
      if (invalid.length > 0) {
        throw new Error(`Invalid specializations: ${invalid.join(', ')}`);
      }
      return true;
    }),
  body('title')
    .optional()
    .isIn(['Dr.', 'DDS', 'DMD', 'MS', 'PhD'])
    .withMessage('Invalid title'),
  body('experience.yearsOfPractice')
    .optional()
    .isInt({ min: 0, max: 60 })
    .withMessage('Years of practice must be between 0 and 60'),
  checkValidation
];

// Appointment validation rules
export const validateAppointment = [
  body('patient')
    .isMongoId()
    .withMessage('Invalid patient ID'),
  body('dentist')
    .isMongoId()
    .withMessage('Invalid dentist ID'),
  body('appointmentDate')
    .isISO8601()
    .withMessage('Please provide a valid appointment date')
    .custom(value => {
      const appointmentDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (appointmentDate < today) {
        throw new Error('Appointment date cannot be in the past');
      }

      // Check if appointment is too far in the future (1 year)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      if (appointmentDate > oneYearFromNow) {
        throw new Error('Appointment date cannot be more than 1 year in the future');
      }

      return true;
    }),
  body('startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide start time in HH:MM format'),
  body('endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide end time in HH:MM format')
    .custom((value, { req }) => {
      const startTime = req.body.startTime;
      if (startTime && value <= startTime) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('type')
    .isIn([
      'consultation', 'cleaning', 'checkup', 'filling', 'extraction',
      'root-canal', 'crown', 'bridge', 'implant', 'orthodontic',
      'cosmetic', 'emergency', 'follow-up', 'other'
    ])
    .withMessage('Invalid appointment type'),
  body('reason')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  checkValidation
];

// Query validation rules
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  checkValidation
];

export const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid start date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid end date')
    .custom((value, { req }) => {
      if (req.query.startDate && value < req.query.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  checkValidation
];

// MongoDB ObjectId validation
export const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  checkValidation
];

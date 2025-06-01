import express from 'express';
import {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  rescheduleAppointment,
  confirmAppointment,
  completeAppointment,
  getAppointmentsByDateRange,
  sendReminder,
  getAppointmentStats,
  deleteAppointment
} from '../controllers/appointmentController.js';
import { protect, canManageAppointments, authorize } from '../middleware/auth.js';
import {
  validateAppointment,
  validatePagination,
  validateDateRange,
  validateObjectId
} from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all appointments with pagination and filtering
router.get('/',
  canManageAppointments,
  validatePagination,
  getAppointments
);

// Get appointment statistics (staff only)
router.get('/stats',
  authorize('dentist', 'admin', 'staff'),
  validateDateRange,
  getAppointmentStats
);

// Get appointments by date range
router.get('/date-range',
  canManageAppointments,
  validateDateRange,
  getAppointmentsByDateRange
);

// Get single appointment
router.get('/:id',
  validateObjectId('id'),
  canManageAppointments,
  getAppointment
);

// Create new appointment
router.post('/',
  canManageAppointments,
  validateAppointment,
  createAppointment
);

// Update appointment
router.put('/:id',
  validateObjectId('id'),
  canManageAppointments,
  updateAppointment
);

// Cancel appointment
router.put('/:id/cancel',
  validateObjectId('id'),
  canManageAppointments,
  cancelAppointment
);

// Reschedule appointment
router.put('/:id/reschedule',
  validateObjectId('id'),
  canManageAppointments,
  rescheduleAppointment
);

// Confirm appointment (staff only)
router.put('/:id/confirm',
  validateObjectId('id'),
  authorize('dentist', 'admin', 'staff'),
  confirmAppointment
);

// Complete appointment (dentist/staff only)
router.put('/:id/complete',
  validateObjectId('id'),
  authorize('dentist', 'admin', 'staff'),
  completeAppointment
);

// Send appointment reminder (staff only)
router.post('/:id/reminder',
  validateObjectId('id'),
  authorize('dentist', 'admin', 'staff'),
  sendReminder
);

// Delete appointment (admin only)
router.delete('/:id',
  validateObjectId('id'),
  authorize('admin'),
  deleteAppointment
);

export default router;

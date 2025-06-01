import express from 'express';
import {
  getPatients,
  getPatient,
  getPatientByPatientId,
  createPatient,
  updatePatient,
  updatePatientMedical,
  addMedicalHistory,
  addAllergy,
  addMedication,
  updatePatientPreferences,
  deletePatient,
  getPatientStats
} from '../controllers/patientController.js';
import { protect, authorize, requireStaff, authorizeOwnerOrAdmin } from '../middleware/auth.js';
import {
  validatePatient,
  validatePagination,
  validateObjectId
} from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all patients (staff only) with pagination and filtering
router.get('/',
  requireStaff,
  validatePagination,
  getPatients
);

// Get patient statistics (admin only)
router.get('/stats',
  authorize('admin'),
  getPatientStats
);

// Get patient by patient ID (staff only)
router.get('/patient-id/:patientId',
  requireStaff,
  getPatientByPatientId
);

// Get single patient
router.get('/:id',
  validateObjectId('id'),
  getPatient
);

// Create new patient profile
router.post('/',
  validatePatient,
  createPatient
);

// Update patient basic information
router.put('/:id',
  validateObjectId('id'),
  updatePatient
);

// Update patient medical information (medical staff only)
router.put('/:id/medical',
  validateObjectId('id'),
  requireStaff,
  updatePatientMedical
);

// Add medical history entry
router.post('/:id/medical-history',
  validateObjectId('id'),
  requireStaff,
  addMedicalHistory
);

// Add allergy
router.post('/:id/allergies',
  validateObjectId('id'),
  requireStaff,
  addAllergy
);

// Add current medication
router.post('/:id/medications',
  validateObjectId('id'),
  requireStaff,
  addMedication
);

// Update patient preferences
router.put('/:id/preferences',
  validateObjectId('id'),
  updatePatientPreferences
);

// Delete patient (admin only)
router.delete('/:id',
  validateObjectId('id'),
  authorize('admin'),
  deletePatient
);

export default router;

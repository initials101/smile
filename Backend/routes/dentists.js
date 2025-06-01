import express from 'express';
import {
  getDentists,
  getDentist,
  createDentist,
  updateDentist,
  getDentistAvailability,
  updateDentistSchedule,
  addTimeOff,
  updateTimeOffStatus,
  deleteDentist,
  getDentistStats
} from '../controllers/dentistController.js';
import { protect, authorize, requireStaff } from '../middleware/auth.js';
import {
  validateDentist,
  validatePagination,
  validateObjectId
} from '../middleware/validation.js';

const router = express.Router();

router.use(protect);

router.get('/', validatePagination, getDentists);
router.get('/stats', authorize('admin'), getDentistStats);
router.get('/:id', validateObjectId('id'), getDentist);
router.post('/', requireStaff, validateDentist, createDentist);
router.put('/:id', validateObjectId('id'), requireStaff, updateDentist);
router.get('/:id/availability', validateObjectId('id'), getDentistAvailability);
router.put('/:id/schedule', validateObjectId('id'), updateDentistSchedule);
router.post('/:id/time-off', validateObjectId('id'), addTimeOff);
router.put('/:id/time-off/:timeOffId', validateObjectId('id'), requireStaff, updateTimeOffStatus);
router.delete('/:id', validateObjectId('id'), authorize('admin'), deleteDentist);

export default router;

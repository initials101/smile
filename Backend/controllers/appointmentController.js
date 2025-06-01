import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import Dentist from '../models/Dentist.js';
import { successResponse, errorResponse, notFoundResponse, paginatedResponse, conflictResponse } from '../utils/response.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { applyPagination, applyFilters } from '../utils/pagination.js';

// Get all appointments with pagination and filtering
export const getAppointments = asyncHandler(async (req, res) => {
  const allowedFilters = [
    { field: 'status', type: 'in' },
    { field: 'type', type: 'exact' },
    { field: 'priority', type: 'exact' },
    { field: 'dentist', type: 'exact' },
    { field: 'patient', type: 'exact' },
    { field: 'appointmentDate', type: 'date' }
  ];

  let baseFilter = {};

  // If user is a patient, only show their appointments
  if (req.patientOnly) {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (patient) {
      baseFilter.patient = patient._id;
    } else {
      return successResponse(res, [], 'No appointments found');
    }
  }

  // If user is a dentist, only show their appointments (unless admin/staff)
  if (req.user.role === 'dentist' && !req.patientOnly) {
    const dentist = await Dentist.findOne({ userId: req.user._id });
    if (dentist) {
      baseFilter.dentist = dentist._id;
    }
  }

  // Apply other filters
  const filters = applyFilters(baseFilter, req.query, allowedFilters);

  const populate = [
    {
      path: 'patient',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    },
    {
      path: 'dentist',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    }
  ];

  const result = await applyPagination(Appointment, req.query, filters, populate);

  paginatedResponse(res, result.items, result.pagination, 'Appointments retrieved successfully');
});

// Get single appointment by ID
export const getAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const appointment = await Appointment.findById(id)
    .populate({
      path: 'patient',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    })
    .populate({
      path: 'dentist',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    });

  if (!appointment) {
    return notFoundResponse(res, 'Appointment');
  }

  // Check if user can access this appointment
  if (req.patientOnly) {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient || appointment.patient._id.toString() !== patient._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }
  }

  successResponse(res, appointment, 'Appointment retrieved successfully');
});

// Create new appointment
export const createAppointment = asyncHandler(async (req, res) => {
  const {
    patient: patientId,
    dentist: dentistId,
    appointmentDate,
    startTime,
    endTime,
    type,
    reason,
    symptoms,
    priority = 'normal',
    notes
  } = req.body;

  // Verify patient exists
  const patient = await Patient.findById(patientId);
  if (!patient) {
    return errorResponse(res, 'Patient not found', 404);
  }

  // Verify dentist exists and is active
  const dentist = await Dentist.findById(dentistId);
  if (!dentist) {
    return errorResponse(res, 'Dentist not found', 404);
  }

  if (dentist.status !== 'active') {
    return errorResponse(res, 'Dentist is not available for appointments', 400);
  }

  // Check if patient is trying to book their own appointment
  if (req.patientOnly) {
    const userPatient = await Patient.findOne({ userId: req.user._id });
    if (!userPatient || patientId !== userPatient._id.toString()) {
      return errorResponse(res, 'You can only book appointments for yourself', 403);
    }
  }

  // Validate appointment date (not in the past)
  const appointmentDateTime = new Date(appointmentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (appointmentDateTime < today) {
    return errorResponse(res, 'Appointment date cannot be in the past', 400);
  }

  // Check if dentist is available at the requested time
  const isAvailable = dentist.isAvailableAt(appointmentDateTime, startTime, endTime);
  if (!isAvailable) {
    return errorResponse(res, 'Dentist is not available at the requested time', 409);
  }

  // Check for appointment conflicts
  const conflict = await Appointment.checkConflict(dentistId, appointmentDate, startTime, endTime);
  if (conflict) {
    return conflictResponse(res, 'Appointment time conflicts with existing appointment');
  }

  // Create appointment
  const appointment = await Appointment.create({
    patient: patientId,
    dentist: dentistId,
    appointmentDate,
    startTime,
    endTime,
    type,
    reason,
    symptoms,
    priority,
    notes: {
      beforeAppointment: notes?.beforeAppointment || ''
    },
    status: 'scheduled'
  });

  // Populate for response
  await appointment.populate([
    {
      path: 'patient',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    },
    {
      path: 'dentist',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    }
  ]);

  successResponse(res, appointment, 'Appointment created successfully', 201);
});

// Update appointment
export const updateAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Remove fields that shouldn't be updated directly
  delete updates.appointmentId;
  delete updates.createdAt;
  delete updates.updatedAt;

  const appointment = await Appointment.findById(id);

  if (!appointment) {
    return notFoundResponse(res, 'Appointment');
  }

  // Check permissions
  if (req.patientOnly) {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient || appointment.patient.toString() !== patient._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Patients can only update certain fields
    const allowedFields = ['symptoms', 'notes.beforeAppointment'];
    const updateKeys = Object.keys(updates);
    const hasDisallowedFields = updateKeys.some(key => !allowedFields.includes(key));

    if (hasDisallowedFields) {
      return errorResponse(res, 'Patients can only update symptoms and notes', 403);
    }
  }

  // If updating time/date, check for conflicts
  if (updates.appointmentDate || updates.startTime || updates.endTime) {
    const newDate = updates.appointmentDate || appointment.appointmentDate;
    const newStartTime = updates.startTime || appointment.startTime;
    const newEndTime = updates.endTime || appointment.endTime;
    const dentistId = updates.dentist || appointment.dentist;

    // Check if dentist is available
    if (updates.dentist) {
      const dentist = await Dentist.findById(dentistId);
      if (!dentist || dentist.status !== 'active') {
        return errorResponse(res, 'Selected dentist is not available', 400);
      }

      const isAvailable = dentist.isAvailableAt(new Date(newDate), newStartTime, newEndTime);
      if (!isAvailable) {
        return errorResponse(res, 'Dentist is not available at the requested time', 409);
      }
    }

    // Check for conflicts
    const conflict = await Appointment.checkConflict(dentistId, newDate, newStartTime, newEndTime, id);
    if (conflict) {
      return conflictResponse(res, 'Appointment time conflicts with existing appointment');
    }
  }

  // Update appointment
  const updatedAppointment = await Appointment.findByIdAndUpdate(
    id,
    updates,
    {
      new: true,
      runValidators: true
    }
  ).populate([
    {
      path: 'patient',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    },
    {
      path: 'dentist',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    }
  ]);

  successResponse(res, updatedAppointment, 'Appointment updated successfully');
});

// Cancel appointment
export const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, refundAmount = 0 } = req.body;

  const appointment = await Appointment.findById(id);

  if (!appointment) {
    return notFoundResponse(res, 'Appointment');
  }

  // Check permissions
  if (req.patientOnly) {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient || appointment.patient.toString() !== patient._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }
  }

  if (appointment.status === 'cancelled') {
    return errorResponse(res, 'Appointment is already cancelled', 400);
  }

  if (appointment.status === 'completed') {
    return errorResponse(res, 'Cannot cancel completed appointment', 400);
  }

  // Determine who cancelled
  let cancelledBy = 'staff';
  if (req.patientOnly) cancelledBy = 'patient';
  else if (req.user.role === 'dentist') cancelledBy = 'dentist';

  // Cancel appointment
  await appointment.cancel(reason, cancelledBy, refundAmount);

  await appointment.populate([
    {
      path: 'patient',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    },
    {
      path: 'dentist',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    }
  ]);

  successResponse(res, appointment, 'Appointment cancelled successfully');
});

// Reschedule appointment
export const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newDate, newStartTime, newEndTime, reason } = req.body;

  const appointment = await Appointment.findById(id);

  if (!appointment) {
    return notFoundResponse(res, 'Appointment');
  }

  // Check permissions
  if (req.patientOnly) {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient || appointment.patient.toString() !== patient._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }
  }

  if (appointment.status === 'cancelled' || appointment.status === 'completed') {
    return errorResponse(res, 'Cannot reschedule cancelled or completed appointment', 400);
  }

  // Validate new date
  const newAppointmentDate = new Date(newDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (newAppointmentDate < today) {
    return errorResponse(res, 'New appointment date cannot be in the past', 400);
  }

  // Check if dentist is available at new time
  const dentist = await Dentist.findById(appointment.dentist);
  const isAvailable = dentist.isAvailableAt(newAppointmentDate, newStartTime, newEndTime);

  if (!isAvailable) {
    return errorResponse(res, 'Dentist is not available at the requested time', 409);
  }

  // Check for conflicts
  const conflict = await Appointment.checkConflict(appointment.dentist, newDate, newStartTime, newEndTime, id);
  if (conflict) {
    return conflictResponse(res, 'New appointment time conflicts with existing appointment');
  }

  // Determine who rescheduled
  let rescheduledBy = 'staff';
  if (req.patientOnly) rescheduledBy = 'patient';
  else if (req.user.role === 'dentist') rescheduledBy = 'dentist';

  // Reschedule appointment
  await appointment.reschedule(newDate, newStartTime, newEndTime, reason, rescheduledBy);

  await appointment.populate([
    {
      path: 'patient',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    },
    {
      path: 'dentist',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    }
  ]);

  successResponse(res, appointment, 'Appointment rescheduled successfully');
});

// Confirm appointment
export const confirmAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const appointment = await Appointment.findByIdAndUpdate(
    id,
    { status: 'confirmed' },
    { new: true, runValidators: true }
  ).populate([
    {
      path: 'patient',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    },
    {
      path: 'dentist',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    }
  ]);

  if (!appointment) {
    return notFoundResponse(res, 'Appointment');
  }

  successResponse(res, appointment, 'Appointment confirmed successfully');
});

// Mark appointment as completed
export const completeAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { treatments, notes, followUp, cost } = req.body;

  const appointment = await Appointment.findById(id);

  if (!appointment) {
    return notFoundResponse(res, 'Appointment');
  }

  if (appointment.status === 'cancelled') {
    return errorResponse(res, 'Cannot complete cancelled appointment', 400);
  }

  // Update appointment with completion data
  const updateData = {
    status: 'completed',
    treatments: treatments || [],
    'notes.duringAppointment': notes?.duringAppointment || '',
    'notes.afterAppointment': notes?.afterAppointment || '',
    'notes.dentistNotes': notes?.dentistNotes || '',
    followUp: followUp || { required: false },
    'cost.actual': cost?.actual || 0
  };

  const updatedAppointment = await Appointment.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  ).populate([
    {
      path: 'patient',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    },
    {
      path: 'dentist',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone'
      }
    }
  ]);

  successResponse(res, updatedAppointment, 'Appointment completed successfully');
});

// Get appointments by date range
export const getAppointmentsByDateRange = asyncHandler(async (req, res) => {
  const { startDate, endDate, dentistId, patientId } = req.query;

  if (!startDate || !endDate) {
    return errorResponse(res, 'Start date and end date are required', 400);
  }

  let filters = {
    appointmentDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  if (dentistId) filters.dentist = dentistId;
  if (patientId) filters.patient = patientId;

  // Apply user-specific filters
  if (req.patientOnly) {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (patient) {
      filters.patient = patient._id;
    }
  }

  const appointments = await Appointment.find(filters)
    .populate([
      {
        path: 'patient',
        populate: {
          path: 'userId',
          select: 'firstName lastName email phone'
        }
      },
      {
        path: 'dentist',
        populate: {
          path: 'userId',
          select: 'firstName lastName email phone'
        }
      }
    ])
    .sort({ appointmentDate: 1, startTime: 1 });

  successResponse(res, appointments, 'Appointments retrieved successfully');
});

// Send appointment reminder
export const sendReminder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type = 'email' } = req.body;

  const appointment = await Appointment.findById(id);

  if (!appointment) {
    return notFoundResponse(res, 'Appointment');
  }

  if (appointment.status === 'cancelled' || appointment.status === 'completed') {
    return errorResponse(res, 'Cannot send reminder for cancelled or completed appointment', 400);
  }

  // Send reminder
  const reminder = await appointment.sendReminder(type);

  successResponse(res, reminder, 'Reminder sent successfully');
});

// Get appointment statistics
export const getAppointmentStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.appointmentDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const stats = await Promise.all([
    Appointment.countDocuments({ ...dateFilter }),
    Appointment.countDocuments({ ...dateFilter, status: 'scheduled' }),
    Appointment.countDocuments({ ...dateFilter, status: 'confirmed' }),
    Appointment.countDocuments({ ...dateFilter, status: 'completed' }),
    Appointment.countDocuments({ ...dateFilter, status: 'cancelled' }),
    Appointment.countDocuments({ ...dateFilter, status: 'no-show' }),
    Appointment.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    Appointment.aggregate([
      { $match: { ...dateFilter, status: 'completed' } },
      { $group: { _id: null, avgCost: { $avg: '$cost.actual' } } }
    ])
  ]);

  const appointmentStats = {
    totalAppointments: stats[0],
    scheduledAppointments: stats[1],
    confirmedAppointments: stats[2],
    completedAppointments: stats[3],
    cancelledAppointments: stats[4],
    noShowAppointments: stats[5],
    appointmentsByType: stats[6],
    averageCost: stats[7][0]?.avgCost || 0,
    completionRate: stats[0] > 0 ? ((stats[3] / stats[0]) * 100).toFixed(1) : 0,
    cancellationRate: stats[0] > 0 ? ((stats[4] / stats[0]) * 100).toFixed(1) : 0
  };

  successResponse(res, appointmentStats, 'Appointment statistics retrieved successfully');
});

// Delete appointment (admin only)
export const deleteAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const appointment = await Appointment.findByIdAndDelete(id);

  if (!appointment) {
    return notFoundResponse(res, 'Appointment');
  }

  successResponse(res, null, 'Appointment deleted successfully');
});

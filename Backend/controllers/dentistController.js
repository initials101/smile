import Dentist from '../models/Dentist.js';
import User from '../models/User.js';
import { successResponse, errorResponse, notFoundResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { applyPagination, applyFilters } from '../utils/pagination.js';

// Get all dentists with pagination and filtering
export const getDentists = asyncHandler(async (req, res) => {
  const allowedFilters = [
    { field: 'search', type: 'regex', dbField: '$or' },
    { field: 'specialization', type: 'in', dbField: 'specializations' },
    { field: 'status', type: 'exact' },
    { field: 'experience', type: 'range', dbField: 'experience.yearsOfPractice' },
    { field: 'rating', type: 'range', dbField: 'rating.average' }
  ];

  let baseFilter = {};

  // Handle search across multiple fields
  if (req.query.search) {
    const searchRegex = { $regex: req.query.search, $options: 'i' };
    baseFilter.$or = [
      { 'userId.firstName': searchRegex },
      { 'userId.lastName': searchRegex },
      { 'userId.email': searchRegex },
      { dentistId: searchRegex },
      { specializations: searchRegex },
      { 'professionalInfo.bio': searchRegex }
    ];
  }

  // Apply other filters
  const filters = applyFilters(baseFilter, req.query, allowedFilters.filter(f => f.field !== 'search'));

  const populate = [
    {
      path: 'userId',
      select: 'firstName lastName email phone isActive createdAt'
    }
  ];

  const result = await applyPagination(Dentist, req.query, filters, populate);

  paginatedResponse(res, result.items, result.pagination, 'Dentists retrieved successfully');
});

// Get single dentist by ID
export const getDentist = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const dentist = await Dentist.findById(id).populate('userId', 'firstName lastName email phone isActive createdAt lastLogin');

  if (!dentist) {
    return notFoundResponse(res, 'Dentist');
  }

  successResponse(res, dentist, 'Dentist retrieved successfully');
});

// Get dentist by dentist ID
export const getDentistByDentistId = asyncHandler(async (req, res) => {
  const { dentistId } = req.params;

  const dentist = await Dentist.findOne({ dentistId }).populate('userId', 'firstName lastName email phone isActive createdAt lastLogin');

  if (!dentist) {
    return notFoundResponse(res, 'Dentist');
  }

  successResponse(res, dentist, 'Dentist retrieved successfully');
});

// Create new dentist profile
export const createDentist = asyncHandler(async (req, res) => {
  const {
    userId,
    title,
    specializations,
    credentials,
    experience,
    contactInfo,
    professionalInfo
  } = req.body;

  // Check if user exists and is a dentist
  const user = await User.findById(userId);
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  if (user.role !== 'dentist') {
    return errorResponse(res, 'User must have dentist role', 400);
  }

  // Check if dentist profile already exists
  const existingDentist = await Dentist.findOne({ userId });
  if (existingDentist) {
    return errorResponse(res, 'Dentist profile already exists', 409);
  }

  // Create dentist profile
  const dentist = await Dentist.create({
    userId,
    title,
    specializations,
    credentials,
    experience,
    schedule: {
      regularHours: [],
      consultationDuration: 30,
      bufferTime: 15
    },
    contactInfo,
    professionalInfo,
    status: 'active'
  });

  // Update user's profileId
  user.profileId = dentist._id;
  await user.save();

  // Populate user data for response
  await dentist.populate('userId', 'firstName lastName email phone isActive createdAt');

  successResponse(res, dentist, 'Dentist profile created successfully', 201);
});

// Update dentist
export const updateDentist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Remove fields that shouldn't be updated directly
  delete updates.userId;
  delete updates.dentistId;
  delete updates.createdAt;
  delete updates.updatedAt;
  delete updates.rating; // Rating should be calculated, not set directly

  const dentist = await Dentist.findByIdAndUpdate(
    id,
    updates,
    {
      new: true,
      runValidators: true
    }
  ).populate('userId', 'firstName lastName email phone isActive createdAt');

  if (!dentist) {
    return notFoundResponse(res, 'Dentist');
  }

  successResponse(res, dentist, 'Dentist updated successfully');
});

// Get dentist availability for a specific date
export const getDentistAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;

  if (!date) {
    return errorResponse(res, 'Date parameter is required', 400);
  }

  const dentist = await Dentist.findById(id);

  if (!dentist) {
    return notFoundResponse(res, 'Dentist');
  }

  if (dentist.status !== 'active') {
    return errorResponse(res, 'Dentist is not available', 400);
  }

  const requestDate = new Date(date);
  const availableSlots = dentist.getAvailableSlots(requestDate);

  successResponse(res, {
    date: requestDate,
    availableSlots,
    consultationDuration: dentist.schedule.consultationDuration,
    bufferTime: dentist.schedule.bufferTime
  }, 'Dentist availability retrieved successfully');
});

// Update dentist schedule
export const updateDentistSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { regularHours, consultationDuration, bufferTime } = req.body;

  const updateFields = {};

  if (regularHours !== undefined) updateFields['schedule.regularHours'] = regularHours;
  if (consultationDuration !== undefined) updateFields['schedule.consultationDuration'] = consultationDuration;
  if (bufferTime !== undefined) updateFields['schedule.bufferTime'] = bufferTime;

  const dentist = await Dentist.findByIdAndUpdate(
    id,
    updateFields,
    {
      new: true,
      runValidators: true
    }
  ).populate('userId', 'firstName lastName email phone');

  if (!dentist) {
    return notFoundResponse(res, 'Dentist');
  }

  successResponse(res, dentist, 'Dentist schedule updated successfully');
});

// Add time off for dentist
export const addTimeOff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const timeOffData = req.body;

  const dentist = await Dentist.findById(id);

  if (!dentist) {
    return notFoundResponse(res, 'Dentist');
  }

  // Validate dates
  const startDate = new Date(timeOffData.startDate);
  const endDate = new Date(timeOffData.endDate);

  if (startDate >= endDate) {
    return errorResponse(res, 'End date must be after start date', 400);
  }

  if (startDate < new Date()) {
    return errorResponse(res, 'Start date cannot be in the past', 400);
  }

  dentist.schedule.timeOff.push(timeOffData);
  await dentist.save();

  await dentist.populate('userId', 'firstName lastName email phone');

  successResponse(res, dentist, 'Time off added successfully');
});

// Update time off status (approve/reject)
export const updateTimeOffStatus = asyncHandler(async (req, res) => {
  const { id, timeOffId } = req.params;
  const { isApproved } = req.body;

  const dentist = await Dentist.findById(id);

  if (!dentist) {
    return notFoundResponse(res, 'Dentist');
  }

  const timeOff = dentist.schedule.timeOff.id(timeOffId);

  if (!timeOff) {
    return errorResponse(res, 'Time off request not found', 404);
  }

  timeOff.isApproved = isApproved;
  await dentist.save();

  await dentist.populate('userId', 'firstName lastName email phone');

  successResponse(res, dentist, `Time off ${isApproved ? 'approved' : 'rejected'} successfully`);
});

// Add credential
export const addCredential = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const credential = req.body;

  const dentist = await Dentist.findById(id);

  if (!dentist) {
    return notFoundResponse(res, 'Dentist');
  }

  dentist.credentials.push(credential);
  await dentist.save();

  await dentist.populate('userId', 'firstName lastName email phone');

  successResponse(res, dentist, 'Credential added successfully');
});

// Update credential status
export const updateCredentialStatus = asyncHandler(async (req, res) => {
  const { id, credentialId } = req.params;
  const { isActive } = req.body;

  const dentist = await Dentist.findById(id);

  if (!dentist) {
    return notFoundResponse(res, 'Dentist');
  }

  const credential = dentist.credentials.id(credentialId);

  if (!credential) {
    return errorResponse(res, 'Credential not found', 404);
  }

  credential.isActive = isActive;
  await dentist.save();

  await dentist.populate('userId', 'firstName lastName email phone');

  successResponse(res, dentist, 'Credential status updated successfully');
});

// Update dentist status
export const updateDentistStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const dentist = await Dentist.findByIdAndUpdate(
    id,
    { status },
    {
      new: true,
      runValidators: true
    }
  ).populate('userId', 'firstName lastName email phone');

  if (!dentist) {
    return notFoundResponse(res, 'Dentist');
  }

  successResponse(res, dentist, 'Dentist status updated successfully');
});

// Get dentists by specialization
export const getDentistsBySpecialization = asyncHandler(async (req, res) => {
  const { specialization } = req.params;

  const filters = {
    specializations: specialization,
    status: 'active'
  };

  const populate = [
    {
      path: 'userId',
      select: 'firstName lastName email phone'
    }
  ];

  const result = await applyPagination(Dentist, req.query, filters, populate);

  paginatedResponse(res, result.items, result.pagination, 'Dentists retrieved successfully');
});

// Get available dentists for a specific date and time
export const getAvailableDentists = asyncHandler(async (req, res) => {
  const { date, startTime, endTime, specialization } = req.query;

  if (!date || !startTime || !endTime) {
    return errorResponse(res, 'Date, start time, and end time are required', 400);
  }

  let filters = { status: 'active' };

  if (specialization) {
    filters.specializations = specialization;
  }

  const dentists = await Dentist.find(filters).populate('userId', 'firstName lastName email phone');

  const requestDate = new Date(date);
  const availableDentists = dentists.filter(dentist =>
    dentist.isAvailableAt(requestDate, startTime, endTime)
  );

  successResponse(res, availableDentists, 'Available dentists retrieved successfully');
});

// Delete dentist
export const deleteDentist = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const dentist = await Dentist.findById(id);

  if (!dentist) {
    return notFoundResponse(res, 'Dentist');
  }

  // Remove profileId from user
  await User.findByIdAndUpdate(dentist.userId, { $unset: { profileId: 1 } });

  // Delete dentist
  await Dentist.findByIdAndDelete(id);

  successResponse(res, null, 'Dentist deleted successfully');
});

// Get dentist statistics
export const getDentistStats = asyncHandler(async (req, res) => {
  const stats = await Promise.all([
    Dentist.countDocuments(),
    Dentist.countDocuments({ status: 'active' }),
    Dentist.countDocuments({ status: 'inactive' }),
    Dentist.countDocuments({ status: 'on-leave' }),
    Dentist.aggregate([
      { $group: { _id: '$specializations', count: { $sum: 1 } } }
    ]),
    Dentist.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating.average' } } }
    ])
  ]);

  const dentistStats = {
    totalDentists: stats[0],
    activeDentists: stats[1],
    inactiveDentists: stats[2],
    dentistsOnLeave: stats[3],
    specializations: stats[4],
    averageRating: stats[5][0]?.avgRating || 0
  };

  successResponse(res, dentistStats, 'Dentist statistics retrieved successfully');
});

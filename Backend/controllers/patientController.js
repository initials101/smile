import Patient from '../models/Patient.js';
import User from '../models/User.js';
import { successResponse, errorResponse, notFoundResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { applyPagination, applyFilters } from '../utils/pagination.js';

// Get all patients with pagination and filtering
export const getPatients = asyncHandler(async (req, res) => {
  const allowedFilters = [
    { field: 'search', type: 'regex', dbField: '$or' },
    { field: 'gender', type: 'exact' },
    { field: 'age', type: 'range' },
    { field: 'city', type: 'exact', dbField: 'address.city' },
    { field: 'state', type: 'exact', dbField: 'address.state' },
    { field: 'zipCode', type: 'exact', dbField: 'address.zipCode' },
    { field: 'hasInsurance', type: 'exact' }
  ];

  let baseFilter = {};

  // Handle search across multiple fields
  if (req.query.search) {
    const searchRegex = { $regex: req.query.search, $options: 'i' };
    baseFilter.$or = [
      { 'userId.firstName': searchRegex },
      { 'userId.lastName': searchRegex },
      { 'userId.email': searchRegex },
      { patientId: searchRegex },
      { 'userId.phone': searchRegex }
    ];
  }

  // Handle insurance filter
  if (req.query.hasInsurance !== undefined) {
    if (req.query.hasInsurance === 'true') {
      baseFilter['insurance.provider'] = { $exists: true, $ne: '' };
    } else {
      baseFilter.$or = [
        { 'insurance.provider': { $exists: false } },
        { 'insurance.provider': '' },
        { 'insurance.provider': null }
      ];
    }
  }

  // Apply other filters
  const filters = applyFilters(baseFilter, req.query, allowedFilters.filter(f => f.field !== 'search' && f.field !== 'hasInsurance'));

  // Handle age filtering separately (requires virtual field calculation)
  if (req.query.age_min || req.query.age_max) {
    const today = new Date();
    const ageFilter = {};

    if (req.query.age_min) {
      const maxBirthDate = new Date();
      maxBirthDate.setFullYear(today.getFullYear() - parseInt(req.query.age_min));
      ageFilter.$lte = maxBirthDate;
    }

    if (req.query.age_max) {
      const minBirthDate = new Date();
      minBirthDate.setFullYear(today.getFullYear() - parseInt(req.query.age_max) - 1);
      ageFilter.$gte = minBirthDate;
    }

    if (Object.keys(ageFilter).length > 0) {
      filters.dateOfBirth = ageFilter;
    }
  }

  const populate = [
    {
      path: 'userId',
      select: 'firstName lastName email phone isActive createdAt'
    }
  ];

  const result = await applyPagination(Patient, req.query, filters, populate);

  paginatedResponse(res, result.items, result.pagination, 'Patients retrieved successfully');
});

// Get single patient by ID
export const getPatient = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const patient = await Patient.findById(id).populate('userId', 'firstName lastName email phone isActive createdAt lastLogin');

  if (!patient) {
    return notFoundResponse(res, 'Patient');
  }

  successResponse(res, patient, 'Patient retrieved successfully');
});

// Get patient by patient ID
export const getPatientByPatientId = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  const patient = await Patient.findOne({ patientId }).populate('userId', 'firstName lastName email phone isActive createdAt lastLogin');

  if (!patient) {
    return notFoundResponse(res, 'Patient');
  }

  successResponse(res, patient, 'Patient retrieved successfully');
});

// Create new patient profile (complete patient registration)
export const createPatient = asyncHandler(async (req, res) => {
  const {
    userId,
    dateOfBirth,
    gender,
    address,
    insurance,
    medicalHistory,
    allergies,
    currentMedications,
    emergencyContact,
    dentalHistory,
    preferences,
    notes
  } = req.body;

  // Check if user exists and is a patient
  const user = await User.findById(userId);
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  if (user.role !== 'patient') {
    return errorResponse(res, 'User must have patient role', 400);
  }

  // Check if patient profile already exists
  const existingPatient = await Patient.findOne({ userId });
  if (existingPatient) {
    return errorResponse(res, 'Patient profile already exists', 409);
  }

  // Create patient profile
  const patient = await Patient.create({
    userId,
    dateOfBirth,
    gender,
    address,
    insurance,
    medicalHistory,
    allergies,
    currentMedications,
    emergencyContact,
    dentalHistory,
    preferences,
    notes
  });

  // Update user's profileId
  user.profileId = patient._id;
  await user.save();

  // Populate user data for response
  await patient.populate('userId', 'firstName lastName email phone isActive createdAt');

  successResponse(res, patient, 'Patient profile created successfully', 201);
});

// Update patient
export const updatePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Remove fields that shouldn't be updated directly
  delete updates.userId;
  delete updates.patientId;
  delete updates.createdAt;
  delete updates.updatedAt;

  const patient = await Patient.findByIdAndUpdate(
    id,
    updates,
    {
      new: true,
      runValidators: true
    }
  ).populate('userId', 'firstName lastName email phone isActive createdAt');

  if (!patient) {
    return notFoundResponse(res, 'Patient');
  }

  successResponse(res, patient, 'Patient updated successfully');
});

// Update patient medical information
export const updatePatientMedical = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { medicalHistory, allergies, currentMedications, dentalHistory } = req.body;

  const updateFields = {};

  if (medicalHistory !== undefined) updateFields.medicalHistory = medicalHistory;
  if (allergies !== undefined) updateFields.allergies = allergies;
  if (currentMedications !== undefined) updateFields.currentMedications = currentMedications;
  if (dentalHistory !== undefined) updateFields.dentalHistory = dentalHistory;

  const patient = await Patient.findByIdAndUpdate(
    id,
    updateFields,
    {
      new: true,
      runValidators: true
    }
  ).populate('userId', 'firstName lastName email phone');

  if (!patient) {
    return notFoundResponse(res, 'Patient');
  }

  successResponse(res, patient, 'Patient medical information updated successfully');
});

// Add medical history entry
export const addMedicalHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const medicalEntry = req.body;

  const patient = await Patient.findById(id);

  if (!patient) {
    return notFoundResponse(res, 'Patient');
  }

  patient.medicalHistory.push(medicalEntry);
  await patient.save();

  await patient.populate('userId', 'firstName lastName email phone');

  successResponse(res, patient, 'Medical history entry added successfully');
});

// Add allergy
export const addAllergy = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allergy = req.body;

  const patient = await Patient.findById(id);

  if (!patient) {
    return notFoundResponse(res, 'Patient');
  }

  patient.allergies.push(allergy);
  await patient.save();

  await patient.populate('userId', 'firstName lastName email phone');

  successResponse(res, patient, 'Allergy added successfully');
});

// Add current medication
export const addMedication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const medication = req.body;

  const patient = await Patient.findById(id);

  if (!patient) {
    return notFoundResponse(res, 'Patient');
  }

  patient.currentMedications.push(medication);
  await patient.save();

  await patient.populate('userId', 'firstName lastName email phone');

  successResponse(res, patient, 'Medication added successfully');
});

// Update patient preferences
export const updatePatientPreferences = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { preferences } = req.body;

  const patient = await Patient.findByIdAndUpdate(
    id,
    { preferences },
    {
      new: true,
      runValidators: true
    }
  ).populate('userId', 'firstName lastName email phone');

  if (!patient) {
    return notFoundResponse(res, 'Patient');
  }

  successResponse(res, patient, 'Patient preferences updated successfully');
});

// Delete patient
export const deletePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const patient = await Patient.findById(id);

  if (!patient) {
    return notFoundResponse(res, 'Patient');
  }

  // Remove profileId from user
  await User.findByIdAndUpdate(patient.userId, { $unset: { profileId: 1 } });

  // Delete patient
  await Patient.findByIdAndDelete(id);

  successResponse(res, null, 'Patient deleted successfully');
});

// Get patient statistics
export const getPatientStats = asyncHandler(async (req, res) => {
  const stats = await Promise.all([
    Patient.countDocuments(),
    Patient.countDocuments({ gender: 'male' }),
    Patient.countDocuments({ gender: 'female' }),
    Patient.countDocuments({ 'insurance.provider': { $exists: true, $ne: '' } }),
    Patient.countDocuments({
      allergies: { $exists: true, $ne: [] }
    }),
    Patient.countDocuments({
      createdAt: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    })
  ]);

  const patientStats = {
    totalPatients: stats[0],
    malePatients: stats[1],
    femalePatients: stats[2],
    patientsWithInsurance: stats[3],
    patientsWithAllergies: stats[4],
    newPatientsLastMonth: stats[5],
    insuranceRate: stats[0] > 0 ? ((stats[3] / stats[0]) * 100).toFixed(1) : 0
  };

  successResponse(res, patientStats, 'Patient statistics retrieved successfully');
});

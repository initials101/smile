import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Dentist from '../models/Dentist.js';
import { generateToken } from '../utils/jwt.js';
import { successResponse, errorResponse, unauthorizedResponse } from '../utils/response.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Register a new user
export const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, role = 'patient' } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return errorResponse(res, 'User with this email already exists', 409);
  }

  // Create user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    phone,
    role
  });

  // Create role-specific profile
  let profileId = null;

  if (role === 'patient') {
    // Create basic patient profile - will be completed later
    const patient = await Patient.create({
      userId: user._id,
      dateOfBirth: new Date('1990-01-01'), // Placeholder - should be updated
      gender: 'prefer-not-to-say', // Placeholder - should be updated
      address: {
        street: 'To be updated',
        city: 'To be updated',
        state: 'To be updated',
        zipCode: '00000'
      },
      emergencyContact: {
        name: 'To be updated',
        relationship: 'To be updated',
        phone: '000-000-0000'
      }
    });
    profileId = patient._id;
  } else if (role === 'dentist') {
    // Create basic dentist profile - will be completed later
    const dentist = await Dentist.create({
      userId: user._id,
      specializations: ['general-dentistry'],
      credentials: [],
      schedule: {
        regularHours: [],
        consultationDuration: 30,
        bufferTime: 15
      }
    });
    profileId = dentist._id;
  }

  // Update user with profile reference
  if (profileId) {
    user.profileId = profileId;
    await user.save();
  }

  // Generate token
  const token = generateToken({
    userId: user._id,
    email: user.email,
    role: user.role
  });

  // Update last login
  await user.updateLastLogin();

  // Prepare response data
  const userData = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    profileId,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt
  };

  successResponse(res, {
    user: userData,
    token,
    tokenExpiry: process.env.JWT_EXPIRE
  }, 'User registered successfully', 201);
});

// Login user
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password for verification
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return unauthorizedResponse(res, 'Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    return unauthorizedResponse(res, 'Account is deactivated. Please contact support.');
  }

  // Check password
  const isPasswordValid = await user.matchPassword(password);

  if (!isPasswordValid) {
    return unauthorizedResponse(res, 'Invalid email or password');
  }

  // Generate token
  const token = generateToken({
    userId: user._id,
    email: user.email,
    role: user.role
  });

  // Update last login
  await user.updateLastLogin();

  // Prepare response data
  const userData = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    profileId: user.profileId,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt
  };

  successResponse(res, {
    user: userData,
    token,
    tokenExpiry: process.env.JWT_EXPIRE
  }, 'Login successful');
});

// Get current user profile
export const getProfile = asyncHandler(async (req, res) => {
  let user = req.user;
  let profile = null;

  // Fetch role-specific profile
  if (user.role === 'patient' && user.profileId) {
    profile = await Patient.findById(user.profileId).populate('userId', 'firstName lastName email phone');
  } else if (user.role === 'dentist' && user.profileId) {
    profile = await Dentist.findById(user.profileId).populate('userId', 'firstName lastName email phone');
  }

  const userData = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    profile
  };

  successResponse(res, userData, 'Profile retrieved successfully');
});

// Update user profile (basic info)
export const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  // Update fields if provided
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) user.phone = phone;

  await user.save();

  const userData = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt
  };

  successResponse(res, userData, 'Profile updated successfully');
});

// Change password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isCurrentPasswordValid = await user.matchPassword(currentPassword);

  if (!isCurrentPasswordValid) {
    return unauthorizedResponse(res, 'Current password is incorrect');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  successResponse(res, null, 'Password changed successfully');
});

// Logout (client-side token removal)
export const logout = asyncHandler(async (req, res) => {
  successResponse(res, null, 'Logout successful');
});

// Get user stats (for admin)
export const getUserStats = asyncHandler(async (req, res) => {
  const stats = await Promise.all([
    User.countDocuments({ role: 'patient', isActive: true }),
    User.countDocuments({ role: 'dentist', isActive: true }),
    User.countDocuments({ role: 'staff', isActive: true }),
    User.countDocuments({ isActive: true }),
    User.countDocuments({
      createdAt: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    })
  ]);

  const userStats = {
    totalPatients: stats[0],
    totalDentists: stats[1],
    totalStaff: stats[2],
    totalActiveUsers: stats[3],
    newUsersLastMonth: stats[4]
  };

  successResponse(res, userStats, 'User statistics retrieved successfully');
});

// Deactivate user account
export const deactivateAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  user.isActive = false;
  await user.save();

  successResponse(res, null, 'Account deactivated successfully');
});

// Activate user account (admin only)
export const activateAccount = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  user.isActive = true;
  await user.save();

  successResponse(res, null, 'Account activated successfully');
});

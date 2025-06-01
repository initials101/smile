import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';
import { unauthorizedResponse, forbiddenResponse } from '../utils/response.js';
import User from '../models/User.js';

// Protect routes - require authentication
export const protect = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return unauthorizedResponse(res, 'Access denied. No token provided.');
    }

    const decoded = verifyToken(token);

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return unauthorizedResponse(res, 'User not found.');
    }

    if (!user.isActive) {
      return unauthorizedResponse(res, 'Account is deactivated.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.message === 'Invalid or expired token') {
      return unauthorizedResponse(res, 'Invalid or expired token.');
    }
    return unauthorizedResponse(res, 'Authentication failed.');
  }
};

// Optional authentication - sets req.user if token is valid
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-password');

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Authorize specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorizedResponse(res, 'Authentication required.');
    }

    if (!roles.includes(req.user.role)) {
      return forbiddenResponse(res, `Access denied. ${req.user.role} role is not authorized.`);
    }

    next();
  };
};

// Check if user owns the resource or has admin privileges
export const authorizeOwnerOrAdmin = (resourceField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorizedResponse(res, 'Authentication required.');
    }

    // Admin can access anything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params.userId || req.body[resourceField] || req.resource?.[resourceField];

    if (req.user._id.toString() !== resourceUserId?.toString()) {
      return forbiddenResponse(res, 'Access denied. You can only access your own resources.');
    }

    next();
  };
};

// Middleware to check if user is a patient
export const requirePatient = (req, res, next) => {
  if (!req.user) {
    return unauthorizedResponse(res, 'Authentication required.');
  }

  if (req.user.role !== 'patient' && req.user.role !== 'admin') {
    return forbiddenResponse(res, 'Access denied. Patient role required.');
  }

  next();
};

// Middleware to check if user is a dentist
export const requireDentist = (req, res, next) => {
  if (!req.user) {
    return unauthorizedResponse(res, 'Authentication required.');
  }

  if (req.user.role !== 'dentist' && req.user.role !== 'admin') {
    return forbiddenResponse(res, 'Access denied. Dentist role required.');
  }

  next();
};

// Middleware to check if user is staff (dentist, admin, or staff)
export const requireStaff = (req, res, next) => {
  if (!req.user) {
    return unauthorizedResponse(res, 'Authentication required.');
  }

  const allowedRoles = ['dentist', 'admin', 'staff'];
  if (!allowedRoles.includes(req.user.role)) {
    return forbiddenResponse(res, 'Access denied. Staff privileges required.');
  }

  next();
};

// Middleware to check if user can manage appointments
export const canManageAppointments = (req, res, next) => {
  if (!req.user) {
    return unauthorizedResponse(res, 'Authentication required.');
  }

  const allowedRoles = ['dentist', 'admin', 'staff'];

  // If user is allowed role, they can manage
  if (allowedRoles.includes(req.user.role)) {
    return next();
  }

  // If patient, they can only manage their own appointments
  if (req.user.role === 'patient') {
    // This will be checked in the controller level
    req.patientOnly = true;
    return next();
  }

  return forbiddenResponse(res, 'Access denied. Insufficient permissions.');
};

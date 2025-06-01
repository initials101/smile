import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Generate JWT token
export const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
    issuer: 'SmileCare',
    audience: 'SmileCare-Users'
  });
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'SmileCare',
      audience: 'SmileCare-Users'
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Generate refresh token (longer expiry)
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '30d',
    issuer: 'SmileCare',
    audience: 'SmileCare-Refresh'
  });
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'SmileCare',
      audience: 'SmileCare-Refresh'
    });
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

// Extract token from Authorization header
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

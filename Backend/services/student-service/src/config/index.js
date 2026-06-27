/**
 * ===========================================
 * Configuration Module
 * ===========================================
 * Centralizes all environment configuration
 * and provides validation for required vars.
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

/** Some loaders (e.g. Docker --env-file) may leave wrapping quotes on values */
const cleanEnv = (key) => {
  const raw = process.env[key];
  if (raw == null) return undefined;
  let v = String(raw).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v || undefined;
};

/**
 * Validates that required environment variables are set
 * @param {string[]} requiredVars - Array of required variable names
 */
const validateEnv = (requiredVars) => {
  const missing = requiredVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Validate required variables in production
if (process.env.NODE_ENV === 'production') {
  validateEnv(['MONGODB_URI', 'JWT_SECRET']);
}

/**
 * Application configuration object
 * All config values should be accessed through this object
 */
const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // Server
  port: parseInt(process.env.PORT, 10) || 5000,
  host: process.env.HOST || 'localhost',

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/class_track_db',
    options: {
      // Connection options for Serverless Functions (Vercel)
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      connectTimeoutMS: 10000, // Give up initial connection after 10s
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 1, // Maintain at least 1 socket connection
    },
  },

  // JWT Authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Password Hashing
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  },

  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5173',
          'https://class-track-udr8.vercel.app', // Vercel frontend domain
        ],
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    user: cleanEnv('EMAIL_USER'),
    pass: cleanEnv('EMAIL_PASS'),
    from: cleanEnv('EMAIL_FROM') || 'ClassTrack <noreply@classtrack.com>',
  },
};

module.exports = config;

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const config = require('../config');

/**
 * ===========================================
 * Authentication Middleware
 * ===========================================
 * Multi-Tenant Support: Extracts teacherId from authenticated user
 * and attaches it to the request object for tenant-scoped queries.
 */

const protect = catchAsync(async (req, res, next) => {
    let token;

    // Check for token in Authorization header
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Check for token in cookies (if using cookie-based auth)
    if (!token && req.cookies?.jwt) {
        token = req.cookies.jwt;
    }

    // No token found
    if (!token) {
        throw ApiError.unauthorized('Access denied, no token provided.');
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        // Find user and attach to request
        // For assistants, we need to ensure createdBy is populated or at least available
        const user = await User.findById(decoded.id).select('+createdBy');

        if (!user) {
            throw ApiError.unauthorized('The user associated with this token no longer exists.');
        }

        if (!user.isActive) {
            throw ApiError.unauthorized('User account is deactivated.');
        }

        // Attach user to request object
        req.user = user;

        // Multi-Tenant: Extract teacherId for tenant-scoped queries
        // For assistants, use the teacher who created them (createdBy)
        // For teachers/admins, use their own ID
        if (user.role === 'assistant') {
            if (!user.createdBy) {
                throw ApiError.unauthorized('Assistant account is not linked to a teacher. Please contact technical support.');
            }
            // Assistant should see data of the teacher who created them
            req.teacherId = user.createdBy;
        } else {
            // Teacher/Admin use their own ID for data isolation
            req.teacherId = user._id;
        }

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            throw ApiError.unauthorized('Token is invalid.');
        }
        if (error.name === 'TokenExpiredError') {
            throw ApiError.unauthorized('Token has expired.');
        }
        throw error;
    }
});


const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(ApiError.unauthorized('You must login to access these resources.'));
        }

        if (!roles.includes(req.user.role)) {
            return next(
                ApiError.forbidden('You do not have permission to perform this action.')
            );
        }

        next();
    };
};


const optionalAuth = catchAsync(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const user = await User.findById(decoded.id);

        if (user && user.isActive) {
            req.user = user;
        }
    } catch (error) {
        // Silently fail for optional auth
    }

    next();
});

module.exports = {
    protect,
    restrictTo,
    optionalAuth,
};

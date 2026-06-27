const ApiError = require('../utils/ApiError');
const config = require('../config');


const handleCastError = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return ApiError.badRequest(message);
};


const handleDuplicateKeyError = (err) => {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    return ApiError.conflict(message);
};


const handleValidationError = (err) => {
    const errors = Object.values(err.errors).map((e) => e.message);
    const message = `Validation failed: ${errors.join(', ')}`;
    return ApiError.badRequest(message);
};


const handleJWTError = () => {
    return ApiError.unauthorized('Invalid token. Please log in again.');
};

const handleJWTExpiredError = () => {
    return ApiError.unauthorized('Your token has expired. Please log in again.');
};


const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
        stack: err.stack,
        error: err,
    });
};


const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            success: false,
            status: err.status,
            message: err.message,
        });
    } else {
        // Programming or unknown error: don't leak details
        console.error('ERROR 💥:', err);

        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Something went wrong. Please try again later.',
        });
    }
};


const errorHandler = (err, req, res, next) => {
    // Set default values
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (config.isDevelopment) {
        sendErrorDev(err, res);
    } else {
        // Create a copy of the error
        let error = { ...err, message: err.message, name: err.name };

        // Handle specific error types
        if (err.name === 'CastError') error = handleCastError(err);
        if (err.code === 11000) error = handleDuplicateKeyError(err);
        if (err.name === 'ValidationError') error = handleValidationError(err);
        if (err.name === 'JsonWebTokenError') error = handleJWTError();
        if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, res);
    }
};

const notFoundHandler = (req, res, next) => {
    const error = ApiError.notFound(`Route ${req.originalUrl} not found`);
    next(error);
};

module.exports = {
    errorHandler,
    notFoundHandler,
};

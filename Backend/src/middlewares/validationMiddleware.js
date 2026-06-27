const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // Format errors into a readable message
        const errorMessages = errors.array().map((error) => ({
            field: error.path,
            message: error.msg,
        }));

        // Create error response
        const error = ApiError.badRequest('Validation failed');
        error.errors = errorMessages;

        return res.status(400).json({
            success: false,
            status: 'fail',
            message: 'Validation failed',
            errors: errorMessages,
        });
    }

    next();
};


const registerValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        // Allow any language letters (including Arabic) + spaces only
        .matches(/^[\p{L}\s]+$/u)
        .withMessage('Name can only contain letters and spaces'),

    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please enter a valid email address')
        .normalizeEmail(),

    body('password')
        .trim()
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/\d/)
        .withMessage('Password must contain at least one number')
        .matches(/[a-zA-Z]/)
        .withMessage('Password must contain at least one letter'),

    body('confirmPassword')
        .optional()
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    validate,
];


const loginValidation = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please enter a valid email address')
        .normalizeEmail(),

    body('password')
        .trim()
        .notEmpty()
        .withMessage('Password is required'),

    validate,
];


const updateProfileValidation = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        // Allow any language letters (including Arabic) + spaces only
        .matches(/^[\p{L}\s]+$/u)
        .withMessage('Name can only contain letters and spaces'),

    validate,
];


const changePasswordValidation = [
    body('currentPassword')
        .trim()
        .notEmpty()
        .withMessage('Current password is required'),

    body('newPassword')
        .trim()
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters')
        .matches(/\d/)
        .withMessage('New password must contain at least one number')
        .matches(/[a-zA-Z]/)
        .withMessage('New password must contain at least one letter')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('New password must be different from current password');
            }
            return true;
        }),

    body('confirmNewPassword')
        .optional()
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    validate,
];

module.exports = {
    validate,
    registerValidation,
    loginValidation,
    updateProfileValidation,
    changePasswordValidation,
};

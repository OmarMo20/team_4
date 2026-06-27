const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const {
    registerValidation,
    loginValidation,
    updateProfileValidation,
    changePasswordValidation,
} = require('../middlewares/validationMiddleware');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validationMiddleware');

const router = express.Router();


// Register & Send OTP
router.post('/register', registerValidation, authController.register);

// Verify Registration OTP
router.post('/verify-otp', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    validate,
], authController.verifyOTP);

// Resend OTP
router.post('/resend-otp', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('type').optional().isIn(['registration', 'password-reset']),
    validate,
], authController.resendOTP);

// Login
router.post('/login', loginValidation, authController.login);

// Forgot Password (Send OTP)
router.post('/forgot-password', [
    body('email').isEmail().withMessage('Valid email is required'),
    validate,
], authController.forgotPassword);

// Validate OTP (Check only)
router.post('/validate-otp', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('type').optional().isIn(['registration', 'password-reset']),
    validate,
], authController.validateOTP);

// Reset Password with OTP
router.post('/reset-password', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
    validate,
], authController.resetPassword);

router.use(protect);

router.get('/profile', authController.getProfile);
router.patch('/profile', updateProfileValidation, authController.updateProfile);
router.post('/change-password', changePasswordValidation, authController.changePassword);
router.post('/logout', authController.logout);

module.exports = router;

const User = require('../models/User');
const OTP = require('../models/OTP');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { sendRegistrationOTP, sendPasswordResetOTP } = require('../services/emailService');

// Register a new user (sends OTP)
const register = catchAsync(async (req, res) => {
    const { name, email, password, phone, subject, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
        if (existingUser.isVerified) {
            throw ApiError.conflict('This email is already registered');
        }
        // Delete unverified user to allow re-registration
        await User.deleteOne({ _id: existingUser._id });
    }

    // Create new user (not verified yet)
    // Default role is 'teacher', but can be overridden if provided
    const userData = {
        name,
        email: email.toLowerCase(),
        password,
        phone,
        subject,
        isVerified: false,
    };
    
    // Only set role if provided and valid (for security, only allow 'parent' or 'teacher' during registration)
    // 'admin' and 'assistant' roles should be set by admins/teachers only
    if (role && ['teacher', 'parent'].includes(role)) {
        userData.role = role;
    }
    // Otherwise, defaults to 'teacher' from schema

    const user = await User.create(userData);

    // Generate and send OTP
    const otpDoc = await OTP.createOTP(email.toLowerCase(), 'registration');
    await sendRegistrationOTP(email, otpDoc.otp, name);

    res.status(201).json({
        success: true,
        message: 'Verification code sent to your email',
        data: {
            email: user.email,
        },
    });
});

// Verify registration OTP
const verifyOTP = catchAsync(async (req, res) => {
    const { email, otp } = req.body;

    const otpDoc = await OTP.verifyOTP(email.toLowerCase(), otp, 'registration');

    if (!otpDoc) {
        throw ApiError.badRequest('Verification code is incorrect or expired');
    }

    // Activate user
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        throw ApiError.notFound('User not found');
    }
    
    user.isVerified = true;
    user.isActive = true;
    await user.save(); // Triggers pre-save hook to generate teacherCode

    // Generate token
    const token = user.generateAuthToken();

    res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: {
            user,
            token,
        },
    });
});

// Resend OTP
const resendOTP = catchAsync(async (req, res) => {
    const { email, type: requestType } = req.body;
    const type = requestType || 'registration';

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        throw ApiError.notFound('User not found');
    }

    if (type === 'registration' && user.isVerified) {
        throw ApiError.badRequest('Email already verified');
    }

    // Generate and send new OTP
    const otpDoc = await OTP.createOTP(email.toLowerCase(), type);

    if (type === 'registration') {
        await sendRegistrationOTP(email, otpDoc.otp, user.name);
    } else {
        await sendPasswordResetOTP(email, otpDoc.otp, user.name);
    }

    res.status(200).json({
        success: true,
        message: 'Verification code sent successfully',
    });
});

// Login user
const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;

    let user = await User.findByCredentials(email.toLowerCase(), password);

    if (!user) {
        throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isVerified) {
        throw ApiError.unauthorized('Please verify your email first');
    }

    // Ensure teacherCode exists for existing teachers/admins
    if (!user.teacherCode && (user.role === 'teacher' || user.role === 'admin')) {
        await user.save(); // Triggers pre-save for teacherCode
    }

    // Update last login timestamp
    await user.updateLastLogin();

    // Generate token
    const token = user.generateAuthToken();

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            user,
            token,
        },
    });
});

// Forgot password (sends OTP)
const forgotPassword = catchAsync(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });

    if (!user) {
        res.status(200).json({
            success: true,
            message: 'This email address is not registered',
        });
        return;
    }

    // Generate and send OTP
    const otpDoc = await OTP.createOTP(email.toLowerCase(), 'password-reset');
    await sendPasswordResetOTP(email, otpDoc.otp, user.name);

    res.status(200).json({
        success: true,
        message: 'Verification code sent to your email',
    });
});

// Validate OTP (check only)
const validateOTP = catchAsync(async (req, res) => {
    const { email, otp, type: requestType } = req.body;
    const type = requestType || 'registration';

    const isValid = await OTP.checkOTP(email.toLowerCase(), otp, type);

    if (!isValid) {
        throw ApiError.badRequest('Invalid or expired OTP');
    }

    res.status(200).json({
        success: true,
        message: 'Verification code is valid',
    });
});

// Reset password with OTP
const resetPassword = catchAsync(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    const otpDoc = await OTP.verifyOTP(email.toLowerCase(), otp, 'password-reset');

    if (!otpDoc) {
        throw ApiError.badRequest('Invalid or expired OTP');
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        throw ApiError.notFound('User not found');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Password reset successfully',
    });
});

// Get current user profile
const getProfile = catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        throw ApiError.notFound('User not found');
    }

    // Ensure teacherCode exists (legacy users fix)
    if (!user.teacherCode && (user.role === 'teacher' || user.role === 'admin')) {
        await user.save(); // Triggers pre-save for teacherCode
    }

    res.status(200).json({
        success: true,
        data: {
            user,
        },
    });
});

// Update user profile
const updateProfile = catchAsync(async (req, res) => {
    const allowedUpdates = ['name', 'phone', 'subject'];
    const updates = {};
    const updateData = req.body;

    Object.keys(updateData).forEach((key) => {
        if (allowedUpdates.includes(key)) {
            updates[key] = updateData[key];
        }
    });

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updates },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw ApiError.notFound('User not found');
    }

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            user,
        },
    });
});

// Change password
const changePassword = catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
        throw ApiError.notFound('User not found');
    }

    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
        throw ApiError.unauthorized('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Password changed successfully',
    });
});

// Logout
const logout = catchAsync(async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
    });
});

module.exports = {
    register,
    verifyOTP,
    resendOTP,
    login,
    forgotPassword,
    validateOTP,
    resetPassword,
    getProfile,
    updateProfile,
    changePassword,
    logout,
};

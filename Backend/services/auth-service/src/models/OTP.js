const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        otp: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['registration', 'password-reset'],
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        },
        isUsed: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index for auto-deletion of expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, type: 1 });

// Generate 6-digit OTP
otpSchema.statics.generateOTP = function () {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create or update OTP for email
otpSchema.statics.createOTP = async function (email, type) {
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Delete any existing OTP for this email and type
    await this.deleteMany({ email, type });

    // Create new OTP
    const otpDoc = await this.create({
        email,
        otp,
        type,
        expiresAt,
    });

    return otpDoc;
};

// Verify OTP
otpSchema.statics.verifyOTP = async function (email, otp, type) {
    const otpDoc = await this.findOne({
        email,
        otp,
        type,
        isUsed: false,
        expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
        return null;
    }

    // Mark as used
    otpDoc.isUsed = true;
    await otpDoc.save();

    return otpDoc;
};

// Check OTP without marking as used
otpSchema.statics.checkOTP = async function (email, otp, type) {
    const otpDoc = await this.findOne({
        email,
        otp,
        type,
        isUsed: false,
        expiresAt: { $gt: new Date() },
    });

    return !!otpDoc;
};

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;

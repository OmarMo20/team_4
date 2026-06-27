const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config');

/**
 * ===========================================
 * Student Model
 * ===========================================
 * Multi-Tenant Support: Each student belongs to a specific teacher (tenant).
 * The teacherId field ensures data isolation between teachers.
 */

const studentSchema = new mongoose.Schema(
    {
        // Multi-Tenant: Teacher who owns this student
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Teacher ID is required'],
            index: true,
        },
        fullName: {
            type: String,
            required: [true, 'الاسم الكامل مطلوب'],
            trim: true,
            minlength: [2, 'يجب أن يكون الاسم على الأقل حرفين'],
            maxlength: [100, 'يجب ألا يزيد الاسم عن 100 حرف'],
        },
        /**
         * Student Code (UNIQUE per teacher/tenant)
         * NOTE: Existing codebase uses `nationalId` as the student code in controllers/attendance.
         */
        nationalId: {
            type: String,
            required: [true, 'كود الطالب مطلوب'],
            trim: true,
            unique: false, // Index handles uniqueness scoped by teacherId
        },
        birthDate: {
            type: Date,
        },
        grade: {
            type: String,
            required: [true, 'الصف الدراسي مطلوب'],
            trim: true,
        },
        classroom: {
            type: String,
            trim: true,
        },
        studentPhone: {
            type: String,
            trim: true,
        },
        parentPhone: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        enrollmentDate: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'graduated', 'transferred'],
            default: 'active',
        },
        subscriptionType: {
            type: String,
            enum: ['monthly', 'quarterly', 'yearly', 'none'],
            default: 'none',
        },
        monthlyFee: {
            type: Number,
            default: 0,
        },
        notes: {
            type: String,
            trim: true,
        },
        /**
         * Signed QR token (static/reusable)
         * This value is what gets encoded into the QR code printed on the student card.
         */
        qrToken: {
            type: String,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            select: false, // Don't return password in queries by default
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                delete ret.password; // Ensure password is never returned in JSON
                return ret;
            },
        },
    }
);

// Multi-Tenant: Compound indexes for efficient tenant-scoped queries
// These indexes include teacherId as the first field for optimal query performance
studentSchema.index({ teacherId: 1, fullName: 'text' });
studentSchema.index({ teacherId: 1, grade: 1 });
studentSchema.index({ teacherId: 1, status: 1 });
studentSchema.index({ teacherId: 1, nationalId: 1 }, { unique: true });
studentSchema.index({ teacherId: 1, createdAt: -1 });


// Encrypt password using bcrypt
studentSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
studentSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;

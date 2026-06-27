const mongoose = require('mongoose');

/**
 * ===========================================
 * Attendance Model
 * ===========================================
 * Multi-Tenant Support: Each attendance record belongs to a specific teacher (tenant).
 * The teacherId field ensures data isolation between teachers.
 */

const attendanceSchema = new mongoose.Schema(
    {
        // Multi-Tenant: Teacher who owns this attendance record
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Teacher ID is required'],
            index: true,
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: [true, 'Student is required'],
        },
        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Session',
            required: [true, 'Session is required'],
        },
        date: {
            type: Date,
            required: [true, 'Date is required'],
        },
        checkInTime: {
            type: String,
        },
        checkOutTime: {
            type: String,
        },
        status: {
            type: String,
            enum: ['present', 'absent', 'late', 'excused'],
            default: 'present',
        },
        amount: {
            type: Number,
            default: 0,
        },
        notes: {
            type: String,
            trim: true,
        },
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Multi-Tenant: Compound indexes for efficient tenant-scoped queries
attendanceSchema.index({ teacherId: 1, student: 1, date: -1 });
attendanceSchema.index({ teacherId: 1, session: 1 });
attendanceSchema.index({ teacherId: 1, date: -1 });
attendanceSchema.index({ teacherId: 1, status: 1 });

// Compound unique index to prevent duplicate attendance records per tenant
attendanceSchema.index({ teacherId: 1, student: 1, session: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;

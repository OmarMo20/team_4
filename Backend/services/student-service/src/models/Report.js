const mongoose = require('mongoose');

/**
 * ===========================================
 * Report Model
 * ===========================================
 * Multi-Tenant Support: Each report belongs to a specific teacher (tenant).
 * The teacherId field ensures data isolation between teachers.
 */

const reportSchema = new mongoose.Schema(
    {
        // Multi-Tenant: Teacher who owns this report
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Teacher ID is required'],
            index: true,
        },
        title: {
            type: String,
            required: [true, 'Report title is required'],
            trim: true,
        },
        type: {
            type: String,
            enum: ['attendance', 'financial', 'student', 'session', 'comprehensive'],
            required: [true, 'Report type is required'],
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
        },
        dateFrom: {
            type: Date,
        },
        dateTo: {
            type: Date,
        },
        grade: {
            type: String,
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
        },
        summary: {
            totalStudents: Number,
            totalSessions: Number,
            attendanceRate: Number,
            totalRevenue: Number,
            totalPending: Number,
        },
        generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['generating', 'completed', 'failed'],
            default: 'completed',
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
reportSchema.index({ teacherId: 1, type: 1 });
reportSchema.index({ teacherId: 1, createdAt: -1 });
reportSchema.index({ teacherId: 1, student: 1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;

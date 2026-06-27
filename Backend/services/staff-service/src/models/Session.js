const mongoose = require('mongoose');

/**
 * ===========================================
 * Session Model
 * ===========================================
 * Multi-Tenant Support: Each session belongs to a specific teacher (tenant).
 * The teacherId field ensures data isolation between teachers.
 */

const sessionSchema = new mongoose.Schema(
    {
        // Multi-Tenant: Teacher who owns this session
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Teacher ID is required'],
            index: true,
        },
        title: {
            type: String,
            trim: true,
        },
        date: {
            type: Date,
            required: [true, 'تاريخ الحصة مطلوب'],
        },
        startTime: {
            type: String,
            required: [true, 'وقت بداية الحصة مطلوب'],
        },
        endTime: {
            type: String,
        },
        grade: {
            type: String,
            required: [true, 'الصف الدراسي مطلوب'],
        },
        classroom: {
            type: String,
        },
        status: {
            type: String,
            enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
            default: 'scheduled',
        },
        price: {
            type: Number,
            default: 0,
            min: 0,
        },
        notes: {
            type: String,
            trim: true,
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
sessionSchema.index({ teacherId: 1, date: -1 });
sessionSchema.index({ teacherId: 1, status: 1 });
sessionSchema.index({ teacherId: 1, grade: 1 });
sessionSchema.index({ teacherId: 1, grade: 1, date: -1 });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;

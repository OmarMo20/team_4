const mongoose = require('mongoose');

/**
 * ===========================================
 * Exam Model
 * ===========================================
 * Multi-Tenant Support: Each exam belongs to a specific teacher (tenant).
 */

const examSchema = new mongoose.Schema(
    {
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Teacher ID is required'],
            index: true,
        },
        title: {
            type: String,
            required: [true, 'عنوان الامتحان مطلوب'],
            trim: true,
        },
        date: {
            type: Date,
            required: [true, 'تاريخ الامتحان مطلوب'],
        },
        fullMark: {
            type: Number,
            required: [true, 'الدرجة النهائية مطلوبة'],
            min: 0,
        },
        passingMark: {
            type: Number,
            required: [true, 'درجة النجاح مطلوبة'],
            min: 0,
        },
        subject: {
            type: String,
            trim: true,
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

// Indexes for efficient querying
examSchema.index({ teacherId: 1, date: -1 });

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;

const mongoose = require('mongoose');

/**
 * ===========================================
 * ExamResult Model
 * ===========================================
 * Stores individual student results for exams.
 */

const examResultSchema = new mongoose.Schema(
    {
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Teacher ID is required'],
            index: true,
        },
        examId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Exam',
            required: [true, 'Exam ID is required'],
            index: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: [true, 'Student ID is required'],
            index: true,
        },
        score: {
            type: Number,
            default: 0,
            min: 0,
        },
        // status: present, absent
        status: {
            type: String,
            enum: ['present', 'absent'],
            default: 'present',
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

// Indexes
examResultSchema.index({ teacherId: 1, examId: 1 });
examResultSchema.index({ teacherId: 1, studentId: 1 });
examResultSchema.index({ examId: 1, studentId: 1 }, { unique: true }); // Prevent duplicate results for same student/exam

const ExamResult = mongoose.model('ExamResult', examResultSchema);

module.exports = ExamResult;

const mongoose = require('mongoose');

/**
 * ===========================================
 * Payment Model
 * ===========================================
 * Multi-Tenant Support: Each payment record belongs to a specific teacher (tenant).
 * The teacherId field ensures data isolation between teachers.
 */

const paymentSchema = new mongoose.Schema(
    {
        // Multi-Tenant: Teacher who owns this payment record
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
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0, 'Amount cannot be negative'],
        },
        date: {
            type: Date,
            default: Date.now,
        },
        dueDate: {
            type: Date,
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'overdue', 'cancelled', 'refunded'],
            default: 'pending',
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'card', 'bank_transfer', 'other'],
            default: 'cash',
        },
        receiptNumber: {
            type: String,
        },
        description: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            enum: ['tuition', 'additional_service', 'registration', 'other'],
            default: 'tuition',
        },
        month: {
            type: String, // e.g., "2026-01"
        },
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
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
paymentSchema.index({ teacherId: 1, student: 1 });
paymentSchema.index({ teacherId: 1, date: -1 });
paymentSchema.index({ teacherId: 1, status: 1 });
paymentSchema.index({ teacherId: 1, type: 1 });
paymentSchema.index({ teacherId: 1, month: 1 });
// Unique receipt number per tenant
paymentSchema.index({ teacherId: 1, receiptNumber: 1 }, { unique: true, sparse: true });

// Generate receipt number before saving
paymentSchema.pre('save', async function (next) {
    if (!this.receiptNumber && this.status === 'paid') {
        const date = new Date();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.receiptNumber = `RCP-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${random}`;
    }
    next();
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;

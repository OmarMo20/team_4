const mongoose = require('mongoose');

/**
 * ===========================================
 * Additional Service Model
 * ===========================================
 * Multi-Tenant Support: Each service belongs to a specific teacher (tenant).
 * The teacherId field ensures data isolation between teachers.
 */

const additionalServiceSchema = new mongoose.Schema(
    {
        // Multi-Tenant: Teacher who owns this service
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Teacher ID is required'],
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Service name is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative'],
        },
        isActive: {
            type: Boolean,
            default: true,
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
additionalServiceSchema.index({ teacherId: 1, name: 1 });
additionalServiceSchema.index({ teacherId: 1, isActive: 1 });

/**
 * ===========================================
 * Service Request Model
 * ===========================================
 * Multi-Tenant Support: Each request belongs to a specific teacher (tenant).
 */

const serviceRequestSchema = new mongoose.Schema(
    {
        // Multi-Tenant: Teacher who owns this request
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Teacher ID is required'],
            index: true,
        },
        service: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AdditionalService',
            required: true,
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true,
        },
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'completed'],
            default: 'pending',
        },
        notes: {
            type: String,
            trim: true,
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        approvedAt: {
            type: Date,
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
serviceRequestSchema.index({ teacherId: 1, service: 1 });
serviceRequestSchema.index({ teacherId: 1, student: 1 });
serviceRequestSchema.index({ teacherId: 1, status: 1 });
serviceRequestSchema.index({ teacherId: 1, requestedBy: 1 });

const AdditionalService = mongoose.model('AdditionalService', additionalServiceSchema);
const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);

module.exports = { AdditionalService, ServiceRequest };

const mongoose = require('mongoose');

/**
 * ===========================================
 * Message Model
 * ===========================================
 * Multi-Tenant Support: Each message belongs to a specific teacher (tenant).
 * The teacherId field ensures data isolation between teachers.
 */

const messageSchema = new mongoose.Schema(
    {
        // Multi-Tenant: Teacher who owns this message
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Teacher ID is required'],
            index: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Sender is required'],
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Recipient is required'],
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
        },
        subject: {
            type: String,
            trim: true,
        },
        content: {
            type: String,
            required: [true, 'Message content is required'],
            trim: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
        },
        parentMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
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
messageSchema.index({ teacherId: 1, sender: 1, createdAt: -1 });
messageSchema.index({ teacherId: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ teacherId: 1, recipient: 1, isRead: 1 });
messageSchema.index({ teacherId: 1, student: 1 });

// Mark message as read
messageSchema.methods.markAsRead = async function () {
    if (!this.isRead) {
        this.isRead = true;
        this.readAt = new Date();
        await this.save();
    }
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;

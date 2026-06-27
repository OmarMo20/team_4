const Message = require('../models/Message');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { scopeQuery, scopeCreate, belongsToTenant } = require('../utils/tenantHelper');

/**
 * Record a new message
 * @route POST /api/messages
 * @access Private
 */
exports.sendMessage = async (req, res, next) => {
    try {
        const { studentId, content, recipientType } = req.body;

        if (!studentId || !content) {
            throw new ApiError('من فضلك أدخل محتوى الرسالة والطالب', 400);
        }

        const student = await Student.findById(studentId);
        if (!student || !belongsToTenant(student, req.teacherId)) {
            throw new ApiError('الطالب غير موجود أو غير تابع لك', 404);
        }

        // Create message record
        const message = await Message.create(scopeCreate({
            sender: req.user._id,
            recipient: student._id, // Using student ID as recipient reference for now, or could be a specific user
            student: student._id,
            content: content
        }, req.teacherId));

        res.status(201).json({
            success: true,
            message: 'تم تسجيل الرسالة بنجاح',
            data: message
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get message history for a student or teacher
 * @route GET /api/messages
 * @access Private
 */
exports.getMessages = async (req, res, next) => {
    try {
        const { studentId } = req.query;
        let query = {};
        if (studentId) {
            query.student = studentId;
        }

        const messages = await Message.find(scopeQuery(query, req.teacherId))
            .populate('sender', 'name')
            .populate('student', 'fullName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });
    } catch (error) {
        next(error);
    }
};

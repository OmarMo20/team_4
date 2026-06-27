const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

// Create a new assistant account
const createAssistant = catchAsync(async (req, res) => {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
        throw ApiError.conflict('هذا البريد الإلكتروني مسجّل بالفعل');
    }

    // Create assistant account
    const assistant = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        phone,
        role: 'assistant',
        isVerified: true, // Skip OTP verification for assistants
        isActive: true,
        createdBy: req.user._id, // Link to creator teacher
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء حساب المساعد بنجاح',
        data: {
            assistant: {
                id: assistant._id,
                name: assistant.name,
                email: assistant.email,
                phone: assistant.phone,
                role: assistant.role,
                createdAt: assistant.createdAt,
            },
        },
    });
});

// Get all assistants for the current teacher
const getAssistants = catchAsync(async (req, res) => {
    const assistants = await User.find({
        role: 'assistant',
        createdBy: req.user._id,
        isActive: true,
    }).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: {
            assistants,
            count: assistants.length,
        },
    });
});

// Update assistant account
const updateAssistant = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, phone, isActive } = req.body;

    // Find assistant and verify it belongs to the current teacher
    const assistant = await User.findOne({
        _id: id,
        role: 'assistant',
        createdBy: req.user._id,
    });

    if (!assistant) {
        throw ApiError.notFound('المساعد غير موجود أو ليس لديك صلاحية لتعديله');
    }

    // Update allowed fields
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (isActive !== undefined) updates.isActive = isActive;

    const updatedAssistant = await User.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
        success: true,
        message: 'تم تحديث بيانات المساعد بنجاح',
        data: {
            assistant: updatedAssistant,
        },
    });
});

// Delete/deactivate assistant account
const deleteAssistant = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Find assistant and verify it belongs to the current teacher
    const assistant = await User.findOne({
        _id: id,
        role: 'assistant',
        createdBy: req.user._id,
    });

    if (!assistant) {
        throw ApiError.notFound('المساعد غير موجود أو ليس لديك صلاحية لحذفه');
    }

    // Soft delete by setting isActive to false
    assistant.isActive = false;
    await assistant.save();

    res.status(200).json({
        success: true,
        message: 'تم حذف حساب المساعد بنجاح',
    });
});

module.exports = {
    createAssistant,
    getAssistants,
    updateAssistant,
    deleteAssistant,
};





















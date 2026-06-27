/**
 * ===========================================
 * Admin Controller
 * ===========================================
 * Handles admin operations for managing teachers
 */

const User = require('../models/User');
const Student = require('../models/Student');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const ApiError = require('../utils/ApiError');
const { scopeQuery } = require('../utils/tenantHelper');

/**
 * Get all teachers with statistics
 * @route GET /api/admin/teachers
 * @access Private (Admin only)
 */
exports.getTeachers = async (req, res, next) => {
    try {
        const teachers = await User.find({ role: 'teacher' })
            .select('name email phone subject isActive isVerified createdAt lastLogin')
            .sort({ createdAt: -1 })
            .lean();

        // Get statistics for each teacher
        const teachersWithStats = await Promise.all(
            teachers.map(async (teacher) => {
                const teacherId = teacher._id || teacher.id;

                const [studentsCount, sessionsCount, attendanceCount] = await Promise.all([
                    Student.countDocuments({ teacherId }),
                    Session.countDocuments({ teacherId }),
                    Attendance.countDocuments({ teacherId }),
                ]);

                return {
                    ...teacher,
                    id: teacherId.toString(),
                    stats: {
                        studentsCount,
                        sessionsCount,
                        attendanceCount,
                    },
                };
            })
        );

        res.status(200).json({
            success: true,
            count: teachersWithStats.length,
            data: teachersWithStats,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Activate a teacher
 * @route PATCH /api/admin/teachers/:id/activate
 * @access Private (Admin only)
 */
exports.activateTeacher = async (req, res, next) => {
    try {
        const teacher = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: true },
            { new: true, runValidators: true }
        ).select('name email phone subject isActive isVerified');

        if (!teacher) {
            throw new ApiError('المعلم غير موجود', 404);
        }

        if (teacher.role !== 'teacher') {
            throw new ApiError('المستخدم ليس معلماً', 400);
        }

        res.status(200).json({
            success: true,
            message: 'تم تفعيل حساب المعلم بنجاح',
            data: teacher,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Deactivate a teacher
 * @route PATCH /api/admin/teachers/:id/deactivate
 * @access Private (Admin only)
 */
exports.deactivateTeacher = async (req, res, next) => {
    try {
        const teacher = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true, runValidators: true }
        ).select('name email phone subject isActive isVerified');

        if (!teacher) {
            throw new ApiError('المعلم غير موجود', 404);
        }

        if (teacher.role !== 'teacher') {
            throw new ApiError('المستخدم ليس معلماً', 400);
        }

        res.status(200).json({
            success: true,
            message: 'تم تعطيل حساب المعلم بنجاح',
            data: teacher,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get teacher details with full statistics
 * @route GET /api/admin/teachers/:id
 * @access Private (Admin only)
 */
exports.getTeacherDetails = async (req, res, next) => {
    try {
        const teacher = await User.findById(req.params.id)
            .select('name email phone subject isActive isVerified createdAt lastLogin')
            .lean();

        if (!teacher) {
            throw new ApiError('المعلم غير موجود', 404);
        }

        if (teacher.role !== 'teacher') {
            throw new ApiError('المستخدم ليس معلماً', 400);
        }

        const teacherId = teacher._id || teacher.id;

        // Get detailed statistics
        const [studentsCount, sessionsCount, attendanceCount, recentSessions] = await Promise.all([
            Student.countDocuments({ teacherId }),
            Session.countDocuments({ teacherId }),
            Attendance.countDocuments({ teacherId }),
            Session.find({ teacherId })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('title date status grade')
                .lean(),
        ]);

        res.status(200).json({
            success: true,
            data: {
                ...teacher,
                id: teacherId.toString(),
                stats: {
                    studentsCount,
                    sessionsCount,
                    attendanceCount,
                    recentSessions,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a teacher (and optionally their data)
 * @route DELETE /api/admin/teachers/:id
 * @access Private (Admin only)
 */
exports.deleteTeacher = async (req, res, next) => {
    try {
        const teacher = await User.findById(req.params.id);

        if (!teacher) {
            throw new ApiError('المعلم غير موجود', 404);
        }

        if (teacher.role !== 'teacher') {
            throw new ApiError('المستخدم ليس معلماً', 400);
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'تم حذف المعلم بنجاح',
        });
    } catch (error) {
        next(error);
    }
};





















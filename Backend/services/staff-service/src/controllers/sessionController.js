/**
 * ===========================================
 * Session Controller
 * ===========================================
 * Multi-Tenant Support: All operations are scoped by teacherId.
 * Uses req.teacherId from auth middleware for tenant isolation.
 */

const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { scopeQuery, scopeCreate, belongsToTenant } = require('../utils/tenantHelper');

/**
 * Get session statistics for today
 * @route GET /api/sessions/stats
 * @access Private
 * Multi-Tenant: All counts are scoped by teacherId
 */
exports.getSessionStats = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Multi-Tenant: Get today's sessions count for authenticated teacher
        const todaySessionsCount = await Session.countDocuments(
            scopeQuery({ date: { $gte: today, $lt: tomorrow } }, req.teacherId)
        );

        // Multi-Tenant: Get today's attendance counts directly using teacherId
        const todayPresentCount = await Attendance.countDocuments(
            scopeQuery({
                date: { $gte: today, $lt: tomorrow },
                status: 'present'
            }, req.teacherId)
        );

        const todayAbsentCount = await Attendance.countDocuments(
            scopeQuery({
                date: { $gte: today, $lt: tomorrow },
                status: 'absent'
            }, req.teacherId)
        );

        // Multi-Tenant: Calculate today's revenue from attendance records
        const todayAttendances = await Attendance.find(
            scopeQuery({
                date: { $gte: today, $lt: tomorrow },
                status: 'present'
            }, req.teacherId)
        ).select('amount').lean();

        const todayRevenue = todayAttendances.reduce((sum, attendance) => {
            return sum + (attendance.amount || 0);
        }, 0);

        res.status(200).json({
            success: true,
            data: {
                todaySessions: todaySessionsCount,
                todayPresent: todayPresentCount,
                todayAbsent: todayAbsentCount,
                todayRevenue: todayRevenue
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get recent sessions
 * @route GET /api/sessions/recent
 * @access Private
 * Multi-Tenant: Returns only sessions belonging to authenticated teacher
 */
exports.getRecentSessions = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        // Multi-Tenant: Scope query by teacherId
        const sessions = await Session.find(scopeQuery({}, req.teacherId))
            .sort({ date: -1, startTime: -1 })
            .limit(limit)
            .populate('teacherId', 'name email')
            .lean();

        res.status(200).json({
            success: true,
            count: sessions.length,
            data: sessions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create new session
 * @route POST /api/sessions
 * @access Private
 * Multi-Tenant: Session is created with teacherId from authenticated user
 */
exports.createSession = async (req, res, next) => {
    try {
        const { title, date, startTime, endTime, grade, classroom, price, notes } = req.body;

        // Validate required fields
        if (!date || !startTime || !grade) {
            throw new ApiError('من فضلك أدخل التاريخ ووقت البداية والصف الدراسي', 400);
        }



        // Multi-Tenant: Create session with teacherId for tenant scoping
        const sessionData = scopeCreate({
            title,
            date,
            startTime,
            endTime,
            grade,
            classroom,
            price,
            notes,
            status: 'scheduled'
        }, req.teacherId);

        const session = await Session.create(sessionData);

        // Populate teacher data
        await session.populate('teacherId', 'name email');

        res.status(201).json({
            success: true,
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all sessions with filters
 * @route GET /api/sessions
 * @access Private
 * Multi-Tenant: Returns only sessions belonging to authenticated teacher
 */
exports.getSessions = async (req, res, next) => {
    try {
        const { status, grade, startDate, endDate } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (grade) filter.grade = grade;

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        // Multi-Tenant: Scope query by teacherId
        const sessions = await Session.find(scopeQuery(filter, req.teacherId))
            .sort({ date: -1, startTime: -1 })
            .populate('teacherId', 'name email')
            .lean();

        res.status(200).json({
            success: true,
            count: sessions.length,
            data: sessions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get session by ID
 * @route GET /api/sessions/:id
 * @access Private
 * Multi-Tenant: Validates session belongs to authenticated teacher
 */
exports.getSessionById = async (req, res, next) => {
    try {
        const session = await Session.findById(req.params.id)
            .populate('teacherId', 'name email')
            .lean();

        if (!session) {
            throw new ApiError('لم يتم العثور على الجلسة', 404);
        }

        // Multi-Tenant: Ensure session belongs to authenticated teacher
        // Support both teacherId (new) and teacher (legacy) fields
        // Handle populated objects (when teacherId is populated, it's a User object)
        let sessionTeacherId = session.teacherId || session.teacher;
        
        // If teacherId was populated, extract the _id from the User object
        if (sessionTeacherId && typeof sessionTeacherId === 'object' && sessionTeacherId._id) {
            sessionTeacherId = sessionTeacherId._id;
        }
        
        if (!sessionTeacherId) {
            throw new ApiError('الجلسة غير مرتبطة بمعلم', 403);
        }
        
        if (!req.teacherId) {
            throw new ApiError('غير مسموح - يجب تسجيل الدخول كمعلم', 403);
        }
        
        // Convert both to strings for comparison (handles ObjectId objects)
        const sessionTeacherIdStr = sessionTeacherId.toString ? sessionTeacherId.toString() : String(sessionTeacherId);
        const reqTeacherIdStr = req.teacherId.toString ? req.teacherId.toString() : String(req.teacherId);
        
        if (sessionTeacherIdStr !== reqTeacherIdStr) {
            throw new ApiError('غير مسموح لك بالوصول إلى هذه الجلسة', 403);
        }

        // Multi-Tenant: Get attendance count scoped by teacherId
        const attendanceCount = await Attendance.countDocuments(
            scopeQuery({ session: session._id, status: 'present' }, req.teacherId)
        );

        res.status(200).json({
            success: true,
            data: {
                ...session,
                attendanceCount
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get attendance list for a session
 * @route GET /api/sessions/:id/attendance
 * @access Private
 * Multi-Tenant: Validates session and attendance belong to authenticated teacher
 */
exports.getSessionAttendance = async (req, res, next) => {
    try {
        const session = await Session.findById(req.params.id);

        if (!session) {
            throw new ApiError('لم يتم العثور على الجلسة', 404);
        }

        // Multi-Tenant: Ensure session belongs to authenticated teacher
        if (!belongsToTenant(session, req.teacherId)) {
            throw new ApiError('غير مسموح لك بعرض حضور هذه الجلسة', 403);
        }

        // Multi-Tenant: Get attendance scoped by teacherId (all statuses, not just 'present')
        const attendances = await Attendance.find(
            scopeQuery({ session: session._id }, req.teacherId)
        )
            .sort({ createdAt: -1 })
            .populate('student', 'fullName nationalId parentPhone');

        res.status(200).json({
            success: true,
            data: {
                attendances
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add student attendance to a session using student code
 * @route POST /api/sessions/:id/attendance
 * @access Private
 * Multi-Tenant: All entities are scoped by teacherId
 */
exports.addAttendanceByCode = async (req, res, next) => {
    try {
        const { studentCode } = req.body;

        if (!studentCode) {
            throw new ApiError('من فضلك أدخل كود الطالب', 400);
        }

        // Find session and ensure it exists
        const session = await Session.findById(req.params.id);
        if (!session) {
            throw new ApiError('لم يتم العثور على الجلسة', 404);
        }

        // Multi-Tenant: Ensure the session belongs to the authenticated teacher
        if (!belongsToTenant(session, req.teacherId)) {
            throw new ApiError('غير مسموح لك بتسجيل حضور لهذه الجلسة', 403);
        }

        // Multi-Tenant: Find student by code and teacherId
        const student = await Student.findOne(
            scopeQuery({ nationalId: studentCode }, req.teacherId)
        );

        if (!student) {
            throw new ApiError('لم يتم العثور على طالب بهذا الكود', 404);
        }

        // Multi-Tenant: Check if attendance already exists
        let attendance = await Attendance.findOne(
            scopeQuery({ student: student._id, session: session._id }, req.teacherId)
        );
        if (attendance) {
            throw new ApiError('تم تسجيل هذا الطالب في هذه الجلسة من قبل', 400);
        }

        // Multi-Tenant: Create attendance record with teacherId
        try {
            const attendanceData = scopeCreate({
                student: student._id,
                session: session._id,
                date: new Date(),
                status: 'present',
                amount: session.price,
                recordedBy: req.user._id
            }, req.teacherId);

            attendance = await Attendance.create(attendanceData);

                // Populate student data for response
                attendance = await attendance.populate('student', 'fullName nationalId parentPhone');
        } catch (error) {
            // Handle duplicate attendance (unique index on teacherId + student + session)
            if (error && error.code === 11000) {
                return next(new ApiError('تم تسجيل حضور هذا الطالب في هذه الجلسة من قبل', 400));
            }
            throw error;
        }

        // Recalculate attendance count for the session
        const attendanceCount = await Attendance.countDocuments(
            scopeQuery({ session: session._id, status: 'present' }, req.teacherId)
        );

        res.status(201).json({
            success: true,
            message: 'Student attendance added successfully',
            data: {
                attendance,
                attendanceCount
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove student attendance from a session
 * @route DELETE /api/sessions/:id/attendance/:attendanceId
 * @access Private
 * Multi-Tenant: Validates ownership before deletion
 */
exports.removeAttendance = async (req, res, next) => {
    try {
        const { id: sessionId, attendanceId } = req.params;

        const session = await Session.findById(sessionId);
        if (!session) {
            throw new ApiError('لم يتم العثور على الجلسة', 404);
        }

        // Multi-Tenant: Ensure the session belongs to the authenticated teacher
        if (!belongsToTenant(session, req.teacherId)) {
            throw new ApiError('غير مسموح لك بتعديل حضور هذه الجلسة', 403);
        }

        // Multi-Tenant: Delete attendance with teacherId scope
        const attendance = await Attendance.findOneAndDelete(
            scopeQuery({ _id: attendanceId, session: sessionId }, req.teacherId)
        );

        if (!attendance) {
            throw new ApiError('لم يتم العثور على سجل الحضور', 404);
        }

        // Recalculate attendance count for the session
        const attendanceCount = await Attendance.countDocuments(
            scopeQuery({ session: sessionId, status: 'present' }, req.teacherId)
        );

        res.status(200).json({
            success: true,
            message: 'تم إلغاء حضور الطالب بنجاح',
            data: {
                attendanceId,
                attendanceCount
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update attendance status (e.g., mark as unpaid)
 * @route PATCH /api/sessions/:id/attendance/:attendanceId/status
 * Body: { status: 'paid' | 'unpaid' }
 */
exports.updateAttendanceStatus = async (req, res, next) => {
    try {
        const { status } = req.body || {};
        const { id: sessionId, attendanceId } = req.params;

        if (!status || !['paid', 'unpaid'].includes(status)) {
            throw new ApiError('يرجى اختيار حالة صحيحة (paid | unpaid)', 400);
        }

        const session = await Session.findById(sessionId);
        if (!session) {
            throw new ApiError('لم يتم العثور على الجلسة', 404);
        }
        if (!belongsToTenant(session, req.teacherId)) {
            throw new ApiError('غير مسموح لك بتعديل حضور هذه الجلسة', 403);
        }

        const attendance = await Attendance.findById(attendanceId).populate('student', 'fullName nationalId');
        if (!attendance) {
            throw new ApiError('لم يتم العثور على سجل الحضور', 404);
        }
        if (!belongsToTenant(attendance, req.teacherId)) {
            throw new ApiError('غير مسموح لك بتعديل هذا الحضور', 403);
        }
        if (attendance.session.toString() !== sessionId.toString()) {
            throw new ApiError('هذا الحضور لا ينتمي لهذه الجلسة', 400);
        }

        if (status === 'paid') {
            attendance.status = 'present';
            attendance.amount = session.price || 0;
        } else {
            attendance.status = 'absent';
            // Keep the session price as "amount owed" for finance views; revenue queries count only status='present'
            attendance.amount = session.price || attendance.amount || 0;
        }

        await attendance.save();

        const attendanceCount = await Attendance.countDocuments(
            scopeQuery({ session: session._id, status: 'present' }, req.teacherId)
        );

        res.status(200).json({
            success: true,
            message: 'تم تحديث حالة الطالب',
            data: {
                attendance: {
                    id: attendance.id,
                    status: attendance.status,
                    amount: attendance.amount,
                    student: attendance.student,
                    session: attendance.session,
                    createdAt: attendance.createdAt,
                },
                attendanceCount,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update session status
 * @route PATCH /api/sessions/:id/status
 * @access Private
 * Multi-Tenant: Validates ownership before update
 */
exports.updateSessionStatus = async (req, res, next) => {
    try {
        const { status } = req.body;

        if (!status) {
            throw new ApiError('من فضلك اختر حالة للجلسة', 400);
        }

        const validStatuses = ['scheduled', 'in-progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new ApiError('قيمة الحالة غير صحيحة', 400);
        }

        // Multi-Tenant: Update with teacherId scope
        const session = await Session.findOneAndUpdate(
            scopeQuery({ _id: req.params.id }, req.teacherId),
            { status },
            { new: true, runValidators: true }
        ).populate('teacherId', 'name email');

        if (!session) {
            throw new ApiError('لم يتم العثور على الجلسة', 404);
        }

        res.status(200).json({
            success: true,
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * End session (mark as completed)
 * @route POST /api/sessions/:id/end
 * @access Private
 * Multi-Tenant: Validates ownership before update
 */
exports.endSession = async (req, res, next) => {
    try {
        // Multi-Tenant: Update with teacherId scope
        const session = await Session.findOneAndUpdate(
            scopeQuery({ _id: req.params.id }, req.teacherId),
            { status: 'completed' },
            { new: true, runValidators: true }
        ).populate('teacherId', 'name email');

        if (!session) {
            throw new ApiError('لم يتم العثور على الجلسة', 404);
        }

        res.status(200).json({
            success: true,
            message: 'Session ended successfully',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete session
 * @route DELETE /api/sessions/:id
 * @access Private
 * Multi-Tenant: Validates ownership before deletion
 */
exports.deleteSession = async (req, res, next) => {
    try {
        // Multi-Tenant: Delete with teacherId scope
        const session = await Session.findOneAndDelete(
            scopeQuery({ _id: req.params.id }, req.teacherId)
        );

        if (!session) {
            throw new ApiError('لم يتم العثور على الجلسة', 404);
        }

        // Multi-Tenant: Delete related attendance records
        await Attendance.deleteMany(
            scopeQuery({ session: session._id }, req.teacherId)
        );

        res.status(200).json({
            success: true,
            message: 'Session deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get recent attendance records for dashboard
 * @route GET /api/sessions/attendance/recent
 * @access Private
 * Multi-Tenant: Returns only attendance records belonging to authenticated teacher
 */
exports.getRecentAttendance = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Multi-Tenant: Get recent attendance records directly using teacherId
        const attendances = await Attendance.find(
            scopeQuery({
                date: { $gte: today, $lt: tomorrow },
                status: 'present'
            }, req.teacherId)
        )
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('student', 'fullName nationalId')
            .populate('session', 'title date startTime endTime')
            .lean();

        // Format the response
        const formattedAttendances = attendances.map(attendance => ({
            id: attendance._id || attendance.id,
            code: attendance.student?.nationalId || '',
            name: attendance.student?.fullName || '',
            checkIn: attendance.checkInTime || new Date(attendance.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            checkOut: attendance.checkOutTime || '-',
            status: attendance.status === 'present' ? 'حاضر' : 'غائب',
            createdAt: attendance.createdAt
        }));

        res.status(200).json({
            success: true,
            count: formattedAttendances.length,
            data: formattedAttendances
        });
    } catch (error) {
        next(error);
    }
};

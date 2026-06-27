/**
 * ===========================================
 * Report Controller
 * ===========================================
 * Multi-Tenant Support: All operations are scoped by teacherId.
 * Provides comprehensive student reports including attendance, payments, and grades.
 */

const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const Session = require('../models/Session');
const ExamResult = require('../models/ExamResult');
const { ServiceRequest } = require('../models/AdditionalService');
const ApiError = require('../utils/ApiError');
const { scopeQuery, belongsToTenant } = require('../utils/tenantHelper');

/**
 * Get comprehensive report for a student by code
 * @route GET /api/reports/student/:code
 * @access Private
 * Multi-Tenant: Returns only data for students belonging to authenticated teacher
 */
exports.getStudentReport = async (req, res, next) => {
    try {
        const { code } = req.params;

        if (!code) {
            throw new ApiError('من فضلك أدخل كود الطالب', 400);
        }

        // Multi-Tenant: Find student by code and teacherId (search from beginning)
        const student = await Student.findOne(
            scopeQuery({ 
                nationalId: { $regex: `^${code}`, $options: 'i' } 
            }, req.teacherId)
        );

        if (!student) {
            throw new ApiError('لم يتم العثور على طالب بهذا الكود', 404);
        }

        // Get attendance records
        const attendances = await Attendance.find(
            scopeQuery({ student: student._id }, req.teacherId)
        )
            .populate('session', 'title date startTime endTime grade price')
            .sort({ date: -1, createdAt: -1 })
            .lean();

        // Get payment records
        const payments = await Payment.find(
            scopeQuery({ student: student._id }, req.teacherId)
        )
            .sort({ date: -1, createdAt: -1 })
            .lean();

        // Get exam grades
        const exams = await ExamResult.find(
            scopeQuery({ studentId: student._id }, req.teacherId)
        )
            .populate('examId', 'title date subject fullMark')
            .sort({ createdAt: -1 })
            .lean();

        // Get additional services
        const additionalServices = await ServiceRequest.find(
            scopeQuery({ student: student._id }, req.teacherId)
        )
            .populate('service', 'name price')
            .sort({ createdAt: -1 })
            .lean();

        // Calculate statistics
        const totalAttendance = attendances.length;
        const presentCount = attendances.filter(a => a.status === 'present').length;
        const absentCount = attendances.filter(a => a.status === 'absent').length;
        const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

        const totalPaid = payments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        const totalPending = payments
            .filter(p => p.status === 'pending' || p.status === 'unpaid')
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        // Calculate average grade
        const gradesWithScores = exams.filter(e => e.score !== undefined && e.score !== null);
        const averageGrade = gradesWithScores.length > 0
            ? gradesWithScores.reduce((sum, e) => sum + e.score, 0) / gradesWithScores.length
            : null;

        res.status(200).json({
            success: true,
            data: {
                student: {
                    id: student._id,
                    fullName: student.fullName,
                    nationalId: student.nationalId,
                    grade: student.grade,
                    classroom: student.classroom,
                    studentPhone: student.studentPhone,
                    parentPhone: student.parentPhone,
                    monthlyFee: student.monthlyFee || 0,
                    notes: student.notes,
                    status: student.status,
                },
                additionalServices: additionalServices.map(s => ({
                    id: s._id,
                    service: s.service,
                    status: s.status,
                    notes: s.notes,
                    createdAt: s.createdAt,
                })),
                statistics: {
                    totalAttendance,
                    presentCount,
                    absentCount,
                    attendanceRate: Math.round(attendanceRate * 100) / 100,
                    totalPaid,
                    totalPending,
                    totalExams: exams.length,
                    totalAdditionalServices: additionalServices.length,
                    averageGrade: averageGrade ? Math.round(averageGrade * 100) / 100 : null,
                },
                attendances: attendances.map(a => ({
                    id: a._id,
                    date: a.date,
                    checkInTime: a.checkInTime,
                    checkOutTime: a.checkOutTime,
                    status: a.status,
                    session: a.session,
                    amount: a.amount || 0,
                })),
                payments: payments.map(p => ({
                    id: p._id,
                    type: p.type,
                    amount: p.amount || 0,
                    status: p.status,
                    date: p.date,
                    description: p.description,
                })),
                grades: exams.map(e => ({
                    id: e._id,
                    exam: e.examId,
                    score: e.score,
                    maxScore: e.examId?.fullMark || null,
                    status: e.status,
                    createdAt: e.createdAt,
                })),
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get comprehensive report for a student by ID
 * @route GET /api/reports/student-id/:id
 * @access Private
 * Multi-Tenant: Returns only data for students belonging to authenticated teacher
 */
exports.getStudentReportById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) {
            throw new ApiError('من فضلك أدخل معرف الطالب', 400);
        }

        // Multi-Tenant: Find student by ID and teacherId
        const student = await Student.findById(id);

        if (!student) {
            throw new ApiError('لم يتم العثور على الطالب', 404);
        }

        // Multi-Tenant: Ensure student belongs to authenticated teacher
        if (!belongsToTenant(student, req.teacherId)) {
            throw new ApiError('غير مسموح لك بالوصول إلى هذا الطالب', 403);
        }

        // Get attendance records
        const attendances = await Attendance.find(
            scopeQuery({ student: student._id }, req.teacherId)
        )
            .populate('session', 'title date startTime endTime grade price')
            .sort({ date: -1, createdAt: -1 })
            .lean();

        // Get payment records
        const payments = await Payment.find(
            scopeQuery({ student: student._id }, req.teacherId)
        )
            .sort({ date: -1, createdAt: -1 })
            .lean();

        // Get exam grades
        const exams = await ExamResult.find(
            scopeQuery({ studentId: student._id }, req.teacherId)
        )
            .populate('examId', 'title date subject fullMark')
            .sort({ createdAt: -1 })
            .lean();

        // Get additional services
        const additionalServices = await ServiceRequest.find(
            scopeQuery({ student: student._id }, req.teacherId)
        )
            .populate('service', 'name price')
            .sort({ createdAt: -1 })
            .lean();

        // Calculate statistics
        const totalAttendance = attendances.length;
        const presentCount = attendances.filter(a => a.status === 'present').length;
        const absentCount = attendances.filter(a => a.status === 'absent').length;
        const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

        const totalPaid = payments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        const totalPending = payments
            .filter(p => p.status === 'pending' || p.status === 'unpaid')
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        // Calculate average grade
        const gradesWithScores = exams.filter(e => e.score !== undefined && e.score !== null);
        const averageGrade = gradesWithScores.length > 0
            ? gradesWithScores.reduce((sum, e) => sum + e.score, 0) / gradesWithScores.length
            : null;

        res.status(200).json({
            success: true,
            data: {
                student: {
                    id: student._id,
                    fullName: student.fullName,
                    nationalId: student.nationalId,
                    grade: student.grade,
                    classroom: student.classroom,
                    studentPhone: student.studentPhone,
                    parentPhone: student.parentPhone,
                    monthlyFee: student.monthlyFee || 0,
                    notes: student.notes,
                    status: student.status,
                },
                additionalServices: additionalServices.map(s => ({
                    id: s._id,
                    service: s.service,
                    status: s.status,
                    notes: s.notes,
                    createdAt: s.createdAt,
                })),
                statistics: {
                    totalAttendance,
                    presentCount,
                    absentCount,
                    attendanceRate: Math.round(attendanceRate * 100) / 100,
                    totalPaid,
                    totalPending,
                    totalExams: exams.length,
                    totalAdditionalServices: additionalServices.length,
                    averageGrade: averageGrade ? Math.round(averageGrade * 100) / 100 : null,
                },
                attendances: attendances.map(a => ({
                    id: a._id,
                    date: a.date,
                    checkInTime: a.checkInTime,
                    checkOutTime: a.checkOutTime,
                    status: a.status,
                    session: a.session,
                    amount: a.amount || 0,
                })),
                payments: payments.map(p => ({
                    id: p._id,
                    type: p.type,
                    amount: p.amount || 0,
                    status: p.status,
                    date: p.date,
                    description: p.description,
                })),
                grades: exams.map(e => ({
                    id: e._id,
                    exam: e.examId,
                    score: e.score,
                    maxScore: e.examId?.fullMark || null,
                    status: e.status,
                    createdAt: e.createdAt,
                })),
            },
        });
    } catch (error) {
        next(error);
    }
};


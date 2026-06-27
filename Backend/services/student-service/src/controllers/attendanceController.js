/**
 * ===========================================
 * Attendance Controller (QR Scan)
 * ===========================================
 * Adds attendance by scanning a student's QR token while a session is in-progress.
 *
 * Endpoint: POST /api/attendance/scan
 * Body: { sessionId, qrToken }
 *
 * Responses:
 * - { status: "new", studentName }
 * - { status: "already", studentName }
 */

const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const Session = require('../models/Session');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const config = require('../config');
const { scopeQuery, scopeCreate, belongsToTenant } = require('../utils/tenantHelper');

exports.scanAttendance = async (req, res, next) => {
  try {
    const { sessionId, qrToken } = req.body || {};
    const token = typeof qrToken === 'string' ? qrToken.trim() : '';

    if (!sessionId || !token) {
      throw ApiError.badRequest('من فضلك أدخل sessionId و QR token');
    }

    if (!req.teacherId) {
      throw ApiError.forbidden('غير مسموح - يجب تسجيل الدخول كمعلم');
    }

    // Ensure session exists and belongs to tenant and is in-progress
    const session = await Session.findById(sessionId);
    if (!session) {
      throw ApiError.notFound('لم يتم العثور على الجلسة');
    }
    if (!belongsToTenant(session, req.teacherId)) {
      throw ApiError.forbidden('غير مسموح لك بتسجيل حضور لهذه الجلسة');
    }
    if (session.status !== 'in-progress') {
      throw ApiError.badRequest('لا يمكن تسجيل الحضور إلا أثناء فتح الجلسة');
    }

    // Try to treat token as legacy JWT first; if fail, fallback to plain nationalId
    let student = null;

    try {
      const decoded = jwt.verify(token, config.jwt.secret);

      // Accept both legacy and compact token shapes
      // Legacy: { typ:'student_qr', v:1, studentId, studentCode }
      // Compact: { t:'s', v:1, s:studentId, c:studentCode }
      const isLegacy = decoded?.typ === 'student_qr' && decoded?.v === 1;
      const isCompact = decoded?.t === 's' && decoded?.v === 1;

      if (isLegacy || isCompact) {
        const studentId = isLegacy ? decoded?.studentId : decoded?.s;
        if (studentId) {
          student = await Student.findOne(scopeQuery({ _id: studentId }, req.teacherId));
        }
      }
    } catch (err) {
      // If token looks like JWT but expired, treat as invalid
      if (err?.name === 'TokenExpiredError') {
        throw ApiError.badRequest('انتهت صلاحية QR');
      }
      // Non-JWT → we'll try plain code below
    }

    // Fallback: treat qrToken as plain nationalId (studentCode)
    if (!student) {
      student = await Student.findOne(scopeQuery({ nationalId: token }, req.teacherId));
    }

    // Load student (tenant-scoped) to get display name
    if (!student) {
      throw ApiError.notFound('لم يتم العثور على الطالب');
    }

    // Create attendance (unique index prevents duplicates)
    try {
      const attendanceData = scopeCreate(
        {
          student: student._id,
          session: session._id,
          date: new Date(),
          status: 'present',
          amount: session.price,
          recordedBy: req.user?._id,
        },
        req.teacherId
      );

      await Attendance.create(attendanceData);

      return res.status(201).json({
        success: true,
        data: {
          status: 'new',
          studentName: student.fullName,
        },
      });
    } catch (error) {
      // Duplicate attendance (unique index on teacherId + student + session)
      if (error && error.code === 11000) {
        return res.status(200).json({
          success: true,
          data: {
            status: 'already',
            studentName: student.fullName,
          },
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};



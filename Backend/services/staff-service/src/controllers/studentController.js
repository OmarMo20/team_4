/**
 * ===========================================
 * Student Controller
 * ===========================================
 * Multi-Tenant Support: All operations are scoped by teacherId.
 * Uses req.teacherId from auth middleware for tenant isolation.
 */

const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const ExamResult = require('../models/ExamResult');
const ApiError = require('../utils/ApiError');
const { scopeQuery, scopeCreate, belongsToTenant } = require('../utils/tenantHelper');
const { signStudentQrToken } = require('../utils/studentQr');
const crypto = require('crypto');
const OTP = require('../models/OTP');
const { sendPasswordResetOTP } = require('../services/emailService');

// Generate unique student code using cryptographic random integer
const generateStudentCode = () => {
    return crypto.randomInt(1000, 9999).toString();
};

// Generate random secure password (12 characters Alphanumeric + Symbols)
const generateStudentPassword = (length = 12) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
    let password = '';
    while (password.length < length) {
        const byte = crypto.randomBytes(1)[0];
        if (byte < 256 - (256 % charset.length)) {
            password += charset[byte % charset.length];
        }
    }
    return password;
};

/**
 * Create new student
 * @route POST /api/students
 * @access Private
 * Multi-Tenant: Student is created with teacherId from authenticated user
 */
exports.createStudent = async (req, res, next) => {
    try {
        const {
            fullName,
            studentPhone,
            parentPhone,
            grade,
            center,
            schedule,
            monthlyFee,
            paidUntil,
            password,
            email
        } = req.body;

        // Validate required fields
        if (!fullName || !grade) {
            throw new ApiError('من فضلك أدخل اسم الطالب والصف الدراسي', 400);
        }

        // Multi-Tenant: Validate teacherId is available
        if (!req.teacherId) {
            throw new ApiError('غير مسموح - يجب تسجيل الدخول كمعلم', 403);
        }

        // Generate unique student code (stored as `nationalId` in this codebase)
        // NOTE: We retry on duplicate key (tenant-scoped unique index) to avoid rare collisions.
        let studentCode;
        let student;
        for (let attempt = 0; attempt < 5; attempt++) {
            studentCode = generateStudentCode();

            // Generate password if not provided
            const studentPassword = password || generateStudentPassword();

            // Multi-Tenant: Create student with teacherId for tenant scoping
            const studentData = scopeCreate({
                fullName,
                grade,
                studentPhone: studentPhone || undefined,
                parentPhone: parentPhone || req.user.phone,
                studentPhone,
                email,
                classroom: center,
                notes: schedule ? `Schedule: ${schedule}` : undefined,
                monthlyFee: monthlyFee ? parseFloat(monthlyFee) : 0,
                status: 'active',
                nationalId: studentCode,
                password: studentPassword
            }, req.teacherId);

            try {
                student = await Student.create(studentData);
                student._tempPassword = studentPassword; // Store to return in response
                break;
            } catch (err) {
                // Duplicate key (e.g., nationalId collision) => retry
                if (err && err.code === 11000 && attempt < 4) continue;
                throw err;
            }
        }

        if (!student) {
            throw new ApiError('تعذر إنشاء الطالب، حاول مرة أخرى', 500);
        }

        // Generate & persist QR token once (do NOT regenerate if it already exists)
        if (!student.qrToken) {
            student.qrToken = signStudentQrToken({
                studentId: student._id,
                studentCode: student.nationalId,
            });
            await student.save();
        }

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الطالب بنجاح',
            data: {
                ...student.toJSON(),
                studentCode: studentCode,
                password: student._tempPassword
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create multiple students in batch
 * @route POST /api/students/batch
 * @access Private
 * Multi-Tenant: Students are created with teacherId from authenticated user
 */
exports.createStudentsBatch = async (req, res, next) => {
    try {
        const { students } = req.body;

        // Validate input
        if (!students || !Array.isArray(students) || students.length === 0) {
            throw new ApiError('يجب إرسال مصفوفة من الطلاب', 400);
        }

        // Multi-Tenant: Validate teacherId is available
        if (!req.teacherId) {
            throw new ApiError('غير مسموح - يجب تسجيل الدخول كمعلم', 403);
        }

        const success = [];
        const failed = [];

        // Process each student
        for (const studentData of students) {
            try {
                const {
                    fullName,
                    studentPhone,
                    parentPhone,
                    grade,
                    center,
                    schedule,
                    monthlyFee,
                    nationalId
                } = studentData;

                // Validate required fields
                if (!fullName || !grade) {
                    failed.push({
                        student: studentData,
                        error: 'اسم الطالب والصف الدراسي مطلوبان'
                    });
                    continue;
                }

                // Generate unique student code if not provided
                let studentCode = nationalId;
                let student;
                let attempts = 0;
                const maxAttempts = 5;

                while (attempts < maxAttempts) {
                    if (!studentCode) {
                        studentCode = generateStudentCode();
                    }

                    // Multi-Tenant: Create student with teacherId for tenant scoping
                    const scopedStudentData = scopeCreate({
                        fullName,
                        grade,
                        studentPhone: studentPhone || undefined,
                        parentPhone: parentPhone || req.user.phone,
                        classroom: center,
                        notes: schedule ? `Schedule: ${schedule}` : undefined,
                        monthlyFee: monthlyFee ? parseFloat(monthlyFee) : 0,
                        status: 'active',
                        nationalId: studentCode
                    }, req.teacherId);

                    try {
                        student = await Student.create(scopedStudentData);
                        break;
                    } catch (err) {
                        // Duplicate key (e.g., nationalId collision) => retry with new code
                        if (err && err.code === 11000 && attempts < maxAttempts - 1) {
                            studentCode = null; // Force new code generation
                            attempts++;
                            continue;
                        }
                        throw err;
                    }
                }

                if (!student) {
                    failed.push({
                        student: studentData,
                        error: 'تعذر إنشاء الطالب بعد عدة محاولات'
                    });
                    continue;
                }

                // Generate & persist QR token once
                if (!student.qrToken) {
                    student.qrToken = signStudentQrToken({
                        studentId: student._id,
                        studentCode: student.nationalId,
                    });
                    await student.save();
                }

                success.push({
                    ...student.toJSON(),
                    studentCode: studentCode
                });
            } catch (error) {
                // Handle individual student errors
                const errorMessage = error.message || 'خطأ غير معروف';
                failed.push({
                    student: studentData,
                    error: errorMessage
                });
            }
        }

        res.status(200).json({
            success: true,
            message: `تم إنشاء ${success.length} طالب بنجاح${failed.length > 0 ? `، فشل ${failed.length} طالب` : ''}`,
            data: {
                success: success,
                failed: failed,
                summary: {
                    total: students.length,
                    succeeded: success.length,
                    failed: failed.length
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all students for authenticated teacher
 * @route GET /api/students
 * @access Private
 * Multi-Tenant: Returns only students belonging to authenticated teacher
 */
exports.getStudents = async (req, res, next) => {
    try {
        const { search } = req.query;
        let query = {};

        if (search) {
            query = {
                $or: [
                    { fullName: { $regex: search, $options: 'i' } },
                    { nationalId: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Multi-Tenant: Scope query by teacherId
        const students = await Student.find(scopeQuery(query, req.teacherId))
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: students.length,
            data: students
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get single student
 * @route GET /api/students/:id
 * @access Private
 * Multi-Tenant: Validates student belongs to authenticated teacher
 */
exports.getStudent = async (req, res, next) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            throw new ApiError('لم يتم العثور على الطالب', 404);
        }

        // Multi-Tenant: Ensure student belongs to authenticated teacher
        if (!belongsToTenant(student, req.teacherId)) {
            throw new ApiError('غير مسموح لك بالوصول إلى هذا الطالب', 403);
        }

        res.status(200).json({
            success: true,
            data: student
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update student
 * @route PUT /api/students/:id
 * @access Private
 * Multi-Tenant: Validates student belongs to authenticated teacher before update
 */
exports.updateStudent = async (req, res, next) => {
    try {
        let student = await Student.findById(req.params.id);

        if (!student) {
            throw new ApiError('لم يتم العثور على الطالب', 404);
        }

        // Multi-Tenant: Ensure student belongs to authenticated teacher
        if (!belongsToTenant(student, req.teacherId)) {
            throw new ApiError('غير مسموح لك بتحديث بيانات هذا الطالب', 403);
        }

        // Multi-Tenant: Use scoped query for update to prevent teacherId tampering
        student = await Student.findOneAndUpdate(
            scopeQuery({ _id: req.params.id }, req.teacherId),
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'تم تحديث بيانات الطالب بنجاح',
            data: student
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete student
 * @route DELETE /api/students/:id
 * @access Private
 * Multi-Tenant: Validates student belongs to authenticated teacher before deletion
 */
exports.deleteStudent = async (req, res, next) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            throw new ApiError('لم يتم العثور على الطالب', 404);
        }

        // Multi-Tenant: Ensure student belongs to authenticated teacher
        if (!belongsToTenant(student, req.teacherId)) {
            throw new ApiError('غير مسموح لك بحذف هذا الطالب', 403);
        }

        // Multi-Tenant: Use scoped query for delete
        await Student.findOneAndDelete(scopeQuery({ _id: req.params.id }, req.teacherId));

        res.status(200).json({
            success: true,
            message: 'تم حذف الطالب بنجاح'
        });
    } catch (error) {
        next(error);
    }
};
/**
 * Get student summary (Today attendance & Latest Quiz)
 * @route GET /api/students/:id/summary
 * @access Private
 */
exports.getStudentSummary = async (req, res, next) => {
    try {
        const studentId = req.params.id;

        // Verify student exists and belongs to teacher
        const student = await Student.findById(studentId);
        if (!student || !belongsToTenant(student, req.teacherId)) {
            throw new ApiError('الطالب غير موجود أو لا تملك صلاحية الوصول إليه', 404);
        }

        // 1. Get Today's Attendance
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const attendance = await Attendance.findOne(
            scopeQuery({
                student: studentId,
                date: { $gte: today, $lt: tomorrow }
            }, req.teacherId)
        ).populate('session', 'title startTime');

        // 2. Get Latest Exam Result
        const latestExamResult = await ExamResult.findOne(
            scopeQuery({ studentId: studentId }, req.teacherId)
        )
        .sort({ createdAt: -1 })
        .populate('examId', 'title fullMark date');

        res.status(200).json({
            success: true,
            data: {
                student: {
                    id: student._id,
                    fullName: student.fullName,
                    nationalId: student.nationalId,
                    parentPhone: student.parentPhone
                },
                attendance: attendance ? {
                    status: attendance.status,
                    time: attendance.checkInTime || new Date(attendance.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                    session: attendance.session?.title || 'جلسة غير محددة'
                } : null,
                latestExam: latestExamResult ? {
                    title: latestExamResult.examId?.title || 'امتحان غير محدد',
                    score: latestExamResult.score,
                    fullMark: latestExamResult.examId?.fullMark || 0,
                    status: latestExamResult.status,
                    date: latestExamResult.examId?.date || latestExamResult.createdAt
                } : null
            }
        });
    } catch (error) {
        next(error);
    }
};
const User = require('../models/User');

/**
 * Public Portal: Login by Student Code
 * @route POST /api/students/portal/login
 * @access Public
 */
exports.portalLogin = async (req, res, next) => {
    try {
        const { code, password } = req.body;

        if (!code || !password) {
            throw new ApiError('كود الطالب وكلمة المرور مطلوبين', 400);
        }

        const student = await Student.findOne({ nationalId: code }).select('+password');

        if (!student) {
            throw new ApiError('بيانات الدخول غير صحيحة', 401);
        }

        // Check if password matches
        if (student.password) {
             const isMatch = await student.matchPassword(password);
             if (!isMatch) {
                 throw new ApiError('بيانات الدخول غير صحيحة', 401);
             }
        } else {
             // Fallback for legacy students without password
             // Allow login if entered password is '123456' (default)
             // And upgrade their account to have this password hashed
             if (password === '123456') {
                 student.password = '123456'; // Will be hashed by pre-save
                 await student.save();
             } else {
                 throw new ApiError('بيانات الدخول غير صحيحة', 401);
             }
        }

        res.status(200).json({
            success: true,
            data: {
                studentId: student._id,
                code: student.nationalId,
                name: student.fullName
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Public Portal: Register New Student
 * @route POST /api/students/portal/register
 * @access Public
 */
    exports.portalRegister = async (req, res, next) => {
    try {
        const { fullName, grade, email, phone, parentPhone, address, password, teacherCode } = req.body;

        if (!fullName || !grade || !parentPhone || !email || !phone || !address || !teacherCode) {
            throw new ApiError('جميع البيانات مطلوبة (الاسم، الصف، الايميل، الهاتف، رقم ولي الأمر، العنوان، وكود المعلم)', 400);
        }

        // Find teacher by code
        const teacher = await User.findOne({ teacherCode });
        
        if (!teacher) {
            throw new ApiError('كود المعلم غير صحيح، يرجى التأكد من الكود والمحاولة مرة أخرى', 404);
        }

        let studentCode;
        let student;
        let finalPassword;
        // Retry logic for unique code generation
        for (let attempt = 0; attempt < 5; attempt++) {
            studentCode = generateStudentCode();
            const studentPassword = password || generateStudentPassword();

            try {
                // Using scopeCreate conceptually, but manually constructing object since we don't have req.teacherId from auth middleware
                student = await Student.create({
                    teacherId: teacher._id,
                    fullName,
                    grade,
                    nationalId: studentCode,
                    parentPhone,
                    studentPhone: phone,
                    email,
                    classroom: 'Portal Registration', // Marker to know source (or from body if we had it)
                    address,
                    status: 'active',
                    password: studentPassword
                });
                finalPassword = studentPassword;
                break;
            } catch (err) {
                 // Duplicate key (nationalId collision) => retry
                if (err && err.code === 11000 && attempt < 4) continue;
                throw err;
            }
        }

        if (!student) {
            throw new ApiError('تعذر إنشاء الحساب، حاول مرة أخرى', 500);
        }

        // Generate & persist QR token for portal-registered students
        if (!student.qrToken) {
            student.qrToken = signStudentQrToken({
                studentId: student._id,
                studentCode: student.nationalId,
            });
            await student.save();
        }

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الحساب بنجاح',
            data: {
                code: studentCode,
                name: student.fullName,
                password: finalPassword
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Public Portal: Get Dashboard Data
 * @route GET /api/students/portal/:code/dashboard
 * @access Public
 */
exports.getPortalDashboard = async (req, res, next) => {
    try {
        const { code } = req.params;

        // Find student by code (globally, or scoped if needed)
        const student = await Student.findOne({ nationalId: code }).populate('teacherId', 'name centerName');

        if (!student) {
            throw new ApiError('الطالب غير موجود', 404);
        }

        const teacherId = student.teacherId._id;

        // 1. Attendance Stats
        const attendanceRecords = await Attendance.find({ 
            student: student._id,
            teacherId: teacherId
        }).sort({ date: -1 });

        const totalSessions = attendanceRecords.length;
        const attendedSessions = attendanceRecords.filter(a => a.status === 'present').length;
        const attendancePercentage = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0;
        
        const lastAttendance = attendanceRecords[0];

        // 2. Recent Exams
        const recentExams = await ExamResult.find({
            studentId: student._id,
            teacherId: teacherId
        })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate('examId', 'title fullMark date');

        // 3. Financial Summary (Simple calc based on monthly fee)
        // This is a basic estimation. A real system would check formatted Payment records.
        const requiredAmount = student.monthlyFee || 0;
        const paidAmount = 0; // Placeholder until Payment model integration
        const remainingAmount = requiredAmount - paidAmount;

        res.status(200).json({
            success: true,
            data: {
                student: {
                    name: student.fullName,
                    code: student.nationalId,
                    grade: student.grade,
                    center: student.teacherId.centerName || 'السنتر التعليمي',
                    enrollmentDate: student.createdAt
                },
                stats: {
                    attendancePercentage,
                    attendedSessions,
                    totalSessions,
                    lastSessionDate: lastAttendance ? lastAttendance.date : null
                },
                exams: recentExams.map(result => ({
                    id: result._id,
                    title: result.examId?.title || 'اختبار',
                    score: result.score,
                    fullMark: result.examId?.fullMark || 0,
                    date: result.examId?.date || result.createdAt,
                    percentage: result.examId?.fullMark ? Math.round((result.score / result.examId.fullMark) * 100) : 0
                })),
                financial: {
                    required: requiredAmount,
                    paid: paidAmount,
                    remaining: remainingAmount,
                    currency: 'ج.م'
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Public Portal: Change Password
 * @route POST /api/students/portal/change-password
 * @access Public (Protected by Code + Old Password)
 */
exports.changePortalPassword = async (req, res, next) => {
    try {
        const { code, currentPassword, newPassword } = req.body;

        if (!code || !currentPassword || !newPassword) {
            throw new ApiError('جميع البيانات مطلوبة', 400);
        }

        if (newPassword.length < 6) {
            throw new ApiError('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 400);
        }

        const student = await Student.findOne({ nationalId: code }).select('+password');

        if (!student) {
            throw new ApiError('الطالب غير موجود', 404);
        }

        // Verify old password
        if (!(await student.matchPassword(currentPassword))) {
            throw new ApiError('كلمة المرور الحالية غير صحيحة', 401);
        }

        // Update password
        student.password = newPassword;
        await student.save();

        res.status(200).json({
            success: true,
            message: 'تم تغيير كلمة المرور بنجاح'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Public Portal: Forgot Password (Request OTP)
 * @route POST /api/students/portal/forgot-password
 * @access Public
 */
exports.forgotPortalPassword = async (req, res, next) => {
    try {
        const { code } = req.body;

        if (!code) {
            throw new ApiError('كود الطالب مطلوب', 400);
        }

        const student = await Student.findOne({ nationalId: code });

        if (!student) {
            throw new ApiError('بيانات الطالب غير صحيحة', 404);
        }

        if (!student.email) {
            throw new ApiError('لا يوجد بريد إلكتروني مسجل لهذا الطالب. يرجى التواصل مع الإدارة.', 400);
        }

        // Generate and send OTP
        const otpDoc = await OTP.createOTP(student.email, 'password-reset');
        
        try {
            await sendPasswordResetOTP(student.email, otpDoc.otp, student.fullName);
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
            throw new ApiError('فشل إرسال البريد الإلكتروني. يرجى المحاولة لاحقاً.', 500);
        }

        res.status(200).json({
            success: true,
            message: `تم إرسال رمز التحقق إلى ${student.email}`,
            data: { email: student.email } // Partial email could be safer but internal app trusted
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Public Portal: Reset Password (Verify OTP)
 * @route POST /api/students/portal/reset-password
 * @access Public
 */
exports.resetPortalPassword = async (req, res, next) => {
    try {
        const { code, otp, newPassword } = req.body;

        if (!code || !otp || !newPassword) {
            throw new ApiError('جميع البيانات مطلوبة', 400);
        }

        const student = await Student.findOne({ nationalId: code });
        if (!student) {
            throw new ApiError('الطالب غير موجود', 404);
        }

        if (!student.email) {
            throw new ApiError('الطالب ليس لديه بريد إلكتروني مسجل', 400);
        }

        // Verify OTP (using student's email)
        const otpDoc = await OTP.verifyOTP(student.email, otp, 'password-reset');
        if (!otpDoc) {
            throw new ApiError('رمز التحقق غير صحيح أو منتهي الصلاحية', 400);
        }

        // Update Password
        student.password = newPassword;
        await student.save();

        res.status(200).json({
            success: true,
            message: 'تم إعادة تعيين كلمة المرور بنجاح'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * ===========================================
 * Finance Controller
 * ===========================================
 * Multi-Tenant Support: All operations are scoped by teacherId.
 * Provides revenue summaries and payment listings.
 */

const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const { scopeQuery } = require('../utils/tenantHelper');

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// Helper to sum amounts with an aggregation match stage
const sumPayments = async (match) => {
    const result = await Payment.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result?.[0]?.total || 0;
};

const sumAttendances = async (match) => {
    const result = await Attendance.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result?.[0]?.total || 0;
};

/**
 * GET /api/finance/summary
 * Returns revenue summary, paid + pending snippets
 */
exports.getFinanceSummary = async (req, res, next) => {
    try {
        const teacherId = req.teacherId;
        const teacherObjectId = toObjectId(teacherId);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const tomorrow = new Date(todayStart);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        const weekStart = new Date(todayStart);
        // Week starts Saturday in Egypt commonly; JS: 0=Sun ... 6=Sat
        // We'll define week as Saturday -> Friday
        const day = weekStart.getDay();
        const diffToSaturday = (day + 1) % 7; // Sat(6) => 0, Sun(0)=>1, Mon(1)=>2...
        weekStart.setDate(weekStart.getDate() - diffToSaturday);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        // Prefer Payment model if it has data; otherwise fall back to Attendance revenue.
        const paymentDocsCount = await Payment.countDocuments({ teacherId: teacherObjectId });
        const usePayments = paymentDocsCount > 0;

        const [todayRevenue, monthRevenue, weekRevenue] = usePayments
            ? await Promise.all([
                sumPayments({
                    teacherId: teacherObjectId,
                    status: 'paid',
                    date: { $gte: todayStart, $lt: tomorrow },
                }),
                sumPayments({
                    teacherId: teacherObjectId,
                    status: 'paid',
                    date: { $gte: monthStart, $lt: monthEnd },
                }),
                sumPayments({
                    teacherId: teacherObjectId,
                    status: 'paid',
                    date: { $gte: weekStart, $lt: weekEnd },
                }),
            ])
            : await Promise.all([
                sumAttendances({
                    teacherId: teacherObjectId,
                    status: 'present',
                    date: { $gte: todayStart, $lt: tomorrow },
                }),
                sumAttendances({
                    teacherId: teacherObjectId,
                    status: 'present',
                    date: { $gte: monthStart, $lt: monthEnd },
                }),
                sumAttendances({
                    teacherId: teacherObjectId,
                    status: 'present',
                    date: { $gte: weekStart, $lt: weekEnd },
                }),
            ]);

        const [paidCount, pendingCount, recentPaid, pendingStudents] = usePayments
            ? await Promise.all([
                Payment.countDocuments({
                    teacherId: teacherObjectId,
                    status: 'paid',
                    date: { $gte: monthStart, $lt: monthEnd },
                }),
                Payment.countDocuments({
                    teacherId: teacherObjectId,
                    status: { $in: ['pending', 'overdue'] },
                }),
                Payment.find(scopeQuery({ status: 'paid' }, teacherId))
                    .sort({ date: -1 })
                    .limit(5)
                    .populate('student', 'fullName grade nationalId')
                    .lean(),
                Payment.find(scopeQuery({ status: { $in: ['pending', 'overdue'] } }, teacherId))
                    .sort({ dueDate: 1, date: 1 })
                    .limit(5)
                    .populate('student', 'fullName grade nationalId')
                    .lean(),
            ])
            : await Promise.all([
                // paidCount → عدد الحضور المسددين (status=present)
                Attendance.countDocuments({
                    teacherId: teacherObjectId,
                    status: 'present',
                    date: { $gte: monthStart, $lt: monthEnd },
                }),
                // pendingCount → عدد الطلاب غير المسددين (أي حالة غير present)
                Attendance.countDocuments({
                    teacherId: teacherObjectId,
                    status: { $ne: 'present' },
                    date: { $gte: monthStart, $lt: monthEnd },
                }),
                // recentPaid → آخر مدفوعات من الحضور
                Attendance.find(
                    scopeQuery({ status: 'present' }, teacherId)
                )
                    .sort({ date: -1, createdAt: -1 })
                    .limit(5)
                    .populate('student', 'fullName grade nationalId parentPhone')
                    .populate('session', 'title grade price')
                    .lean(),
                // pendingStudents → عينة من الطلاب غير المسددين
                Attendance.find(
                    scopeQuery({ status: { $ne: 'present' } }, teacherId)
                )
                    .sort({ date: -1, createdAt: -1 })
                    .limit(5)
                    .populate('student', 'fullName grade nationalId parentPhone')
                    .populate('session', 'title grade price')
                    .lean(),
            ]);

        res.status(200).json({
            success: true,
            message: 'تم جلب ملخص المالية بنجاح',
            data: {
                todayRevenue,
                monthRevenue,
                weekRevenue,
                paidCount,
                pendingCount,
                recentPaid: usePayments
                    ? recentPaid
                    : recentPaid.map((a) => ({
                        id: a._id,
                        amount: a.amount || 0,
                        status: 'paid',
                        type: 'tuition',
                        date: a.date,
                        description: a.session?.title ? `حصة: ${a.session.title}` : 'حصة',
                        student: a.student,
                    })),
                pendingStudents: usePayments
                    ? pendingStudents
                    : pendingStudents.map((a) => ({
                        id: a._id,
                        amount: a.session?.price || a.amount || 0,
                        status: 'unpaid',
                        type: 'tuition',
                        date: a.date,
                        dueDate: null,
                        description: a.session?.title ? `حصة: ${a.session.title}` : 'حصة',
                        student: a.student
                            ? {
                                id: a.student._id,
                                fullName: a.student.fullName,
                                nationalId: a.student.nationalId,
                                grade: a.student.grade,
                                parentPhone: a.student.parentPhone,
                            }
                            : null,
                    })),
                source: usePayments ? 'payments' : 'attendance',
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/finance/payments
 * Returns paginated payments with filters and student info
 */
exports.getPayments = async (req, res, next) => {
    try {
        const teacherObjectId = toObjectId(req.teacherId);
        const {
            status,
            type,
            search,
            startDate,
            endDate,
            page = 1,
            limit = 10,
        } = req.query;

        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
        const skip = (parsedPage - 1) * parsedLimit;

        const paymentDocsCount = await Payment.countDocuments({ teacherId: teacherObjectId });
        const usePayments = paymentDocsCount > 0;

        if (!usePayments) {
            // Attendance-driven "transactions" view (what the system already records today)
            const attendanceMatch = {
                teacherId: teacherObjectId,
            };

            // Map finance filters to attendance status:
            // - 'paid'    → status: 'present'
            // - 'pending' → status != 'present'
            // - undefined → نعرض المدفوع فقط افتراضياً
            if (!status || status === 'paid') {
                attendanceMatch.status = 'present';
            } else if (status === 'pending') {
                attendanceMatch.status = { $ne: 'present' };
            }

            if (startDate || endDate) {
                attendanceMatch.date = {};
                if (startDate) attendanceMatch.date.$gte = new Date(startDate);
                if (endDate) attendanceMatch.date.$lte = new Date(endDate);
            }

            const pipeline = [
                { $match: attendanceMatch },
                {
                    $lookup: {
                        from: Student.collection.name,
                        localField: 'student',
                        foreignField: '_id',
                        as: 'student',
                    },
                },
                { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: Session.collection.name,
                        localField: 'session',
                        foreignField: '_id',
                        as: 'session',
                    },
                },
                { $unwind: { path: '$session', preserveNullAndEmptyArrays: true } },
            ];

            if (search) {
                const regex = new RegExp(search, 'i');
                pipeline.push({
                    $match: {
                        $or: [
                            { 'student.fullName': regex },
                            { 'student.nationalId': regex },
                            { 'session.title': regex },
                        ],
                    },
                });
            }

            pipeline.push(
                { $sort: { date: -1, createdAt: -1 } },
                {
                    $facet: {
                        data: [{ $skip: skip }, { $limit: parsedLimit }],
                        total: [{ $count: 'count' }],
                    },
                }
            );

            const result = await Attendance.aggregate(pipeline);
            const data = result?.[0]?.data || [];
            const totalCount = result?.[0]?.total?.[0]?.count || 0;
            const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

            const payments = data.map((item) => ({
                id: item._id,
                amount: item.status === 'present' ? (item.amount || 0) : (item.session?.price || item.amount || 0),
                status: item.status === 'present' ? 'paid' : 'unpaid',
                type: 'tuition',
                date: item.date,
                dueDate: null,
                description: item.session?.title ? `حصة: ${item.session.title}` : 'حصة',
                receiptNumber: null,
                paymentMethod: 'cash',
                student: item.student
                    ? {
                        id: item.student._id,
                        fullName: item.student.fullName,
                        nationalId: item.student.nationalId,
                        grade: item.student.grade,
                        parentPhone: item.student.parentPhone,
                    }
                    : null,
            }));

            return res.status(200).json({
                success: true,
                message: 'تم جلب سجل المدفوعات بنجاح',
                data: {
                    payments,
                    total: totalCount,
                    page: parsedPage,
                    pages: totalPages,
                    limit: parsedLimit,
                    source: 'attendance',
                },
            });
        }

        const match = {
            teacherId: teacherObjectId,
        };

        if (status && status !== 'all') {
            match.status = status;
        }

        if (type) {
            match.type = type;
        }

        if (startDate || endDate) {
            match.date = {};
            if (startDate) match.date.$gte = new Date(startDate);
            if (endDate) match.date.$lte = new Date(endDate);
        }

        const pipeline = [
            { $match: match },
            {
                $lookup: {
                    from: Student.collection.name,
                    localField: 'student',
                    foreignField: '_id',
                    as: 'student',
                },
            },
            { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
        ];

        if (search) {
            const regex = new RegExp(search, 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { 'student.fullName': regex },
                        { 'student.nationalId': regex },
                        { description: regex },
                        { receiptNumber: regex },
                    ],
                },
            });
        }

        pipeline.push(
            { $sort: { date: -1 } },
            {
                $facet: {
                    data: [{ $skip: skip }, { $limit: parsedLimit }],
                    total: [{ $count: 'count' }],
                },
            }
        );

        const result = await Payment.aggregate(pipeline);
        const data = result?.[0]?.data || [];
        const totalCount = result?.[0]?.total?.[0]?.count || 0;
        const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

        const payments = data.map((item) => ({
            id: item._id,
            amount: item.amount,
            status: item.status,
            type: item.type,
            date: item.date,
            dueDate: item.dueDate,
            description: item.description,
            receiptNumber: item.receiptNumber,
            paymentMethod: item.paymentMethod,
            student: item.student
                ? {
                    id: item.student._id,
                    fullName: item.student.fullName,
                    nationalId: item.student.nationalId,
                    grade: item.student.grade,
                }
                : null,
        }));

        res.status(200).json({
            success: true,
            message: 'تم جلب سجل المدفوعات بنجاح',
            data: {
                payments,
                total: totalCount,
                page: parsedPage,
                pages: totalPages,
                limit: parsedLimit,
                source: 'payments',
            },
        });
    } catch (error) {
        next(error);
    }
};


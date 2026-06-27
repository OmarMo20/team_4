const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const ExamResult = require('../models/ExamResult');
// const Payment = require('../models/Payment'); // Pending implementation
const ApiError = require('../utils/ApiError');

/**
 * Get Teacher Dashboard Stats
 * @route GET /api/dashboard/stats
 * @access Private (Teacher)
 */
exports.getDashboardStats = async (req, res, next) => {
    try {
        const teacherId = req.user._id;

        // 1. Student Stats
        const totalStudents = await Student.countDocuments({ teacherId, status: 'active' });
        
        // New students this month
        const startOfMonth = new Date(new Date().setDate(1));
        const newStudents = await Student.countDocuments({ 
            teacherId, 
            createdAt: { $gte: startOfMonth } 
        });

        // 2. Attendance Stats (Last 7 Days)
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const recentAttendance = await Attendance.aggregate([
            {
                $match: {
                    teacherId: teacherId,
                    date: { $gte: last7Days }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    present: { 
                        $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
                    },
                    absent: {
                        $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 3. Financial Stats (Estimated based on Monthly Fees for now)
        // In a real scenario, this would aggregate Payment records.
        // For now, calculating expected income vs 0 paid (or mock paid)
        const students = await Student.find({ teacherId, status: 'active' }).select('monthlyFee');
        const expectedIncome = students.reduce((acc, curr) => acc + (curr.monthlyFee || 0), 0);
        const collectedIncome = 0; // Placeholder until payment system is fully active
        
        // 4. Exam Performance (Recent 5 Exams)
        const examStats = await ExamResult.aggregate([
            { $match: { teacherId: teacherId } },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'examId',
                    foreignField: '_id',
                    as: 'exam'
                }
            },
            { $unwind: '$exam' },
            {
                $group: {
                    _id: '$exam.title',
                    averageScore: { $avg: '$score' },
                    fullMark: { $first: '$exam.fullMark' },
                    date: { $first: '$exam.createdAt' }
                }
            },
            { $sort: { date: -1 } },
            { $limit: 5 }
        ]);

        // Formatted Exam Data for Charts
        const formattedExamStats = examStats.map(stat => ({
            name: stat._id,
            average: Math.round(stat.averageScore),
            fullMark: stat.fullMark,
            percentage: Math.round((stat.averageScore / stat.fullMark) * 100)
        }));

        res.status(200).json({
            success: true,
            data: {
                counts: {
                    totalStudents,
                    newStudents,
                    expectedIncome,
                    collectedIncome
                },
                charts: {
                    attendance: recentAttendance.map(a => ({
                        date: new Date(a._id).toLocaleDateString('ar-EG', { weekday: 'short' }),
                        present: a.present,
                        absent: a.absent
                    })),
                    financial: [
                        { name: 'المدفوع', value: collectedIncome, color: '#10B981' }, // Emerald
                        { name: 'المتبقي', value: expectedIncome - collectedIncome, color: '#F59E0B' } // Amber
                    ],
                    exams: formattedExamStats
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

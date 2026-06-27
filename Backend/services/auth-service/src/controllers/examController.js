const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Student = require('../models/Student');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { scopeQuery, scopeCreate } = require('../utils/tenantHelper');

// @desc    Get all exams for the logged in teacher
// @route   GET /api/exams
// @access  Private
exports.getExams = catchAsync(async (req, res, next) => {
    const exams = await Exam.find({ teacherId: req.teacherId }).sort({ date: -1 });

    res.status(200).json({
        success: true,
        count: exams.length,
        data: exams,
    });
});

// @desc    Create a new exam
// @route   POST /api/exams
// @access  Private
exports.createExam = catchAsync(async (req, res, next) => {
    const { title, date, fullMark, passingMark, subject, notes } = req.body;

    const exam = await Exam.create({
        teacherId: req.teacherId,
        title,
        date,
        fullMark,
        passingMark,
        subject,
        notes,
    });

    res.status(201).json({
        success: true,
        data: exam,
    });
});

// @desc    Get exam by ID
// @route   GET /api/exams/:id
// @access  Private
exports.getExamById = catchAsync(async (req, res, next) => {
    const exam = await Exam.findOne({ _id: req.params.id, teacherId: req.user.id });

    if (!exam) {
        return next(new ApiError('Exam not found', 404));
    }

    res.status(200).json({
        success: true,
        data: exam,
    });
});

// @desc    Add or update results for an exam
// @route   POST /api/exams/:id/results
// @access  Private
exports.addExamResults = catchAsync(async (req, res, next) => {
    const { results } = req.body; // Array of { studentId, score, status, notes }
    const examId = req.params.id;

    // Verify exam exists and belongs to teacher
    const exam = await Exam.findOne({ _id: examId, teacherId: req.user.id });
    if (!exam) {
        return next(new ApiError('Exam not found', 404));
    }

    if (!results || !Array.isArray(results) || results.length === 0) {
        return next(new ApiError('No results provided', 400));
    }

    // Process all results
    const processedResults = [];
    
    for (const result of results) {
        // Upsert result for this student and exam
        const updatedResult = await ExamResult.findOneAndUpdate(
            { 
                teacherId: req.user.id, 
                examId: examId, 
                studentId: result.studentId 
            },
            {
                teacherId: req.user.id,
                examId: examId,
                studentId: result.studentId,
                score: result.score,
                status: result.status || 'present',
                notes: result.notes
            },
            { new: true, upsert: true, runValidators: true }
        );
        processedResults.push(updatedResult);
    }

    res.status(200).json({
        success: true,
        count: processedResults.length,
        data: processedResults,
    });
});

// @desc    Get results for an exam
// @route   GET /api/exams/:id/results
// @access  Private
exports.getExamResults = catchAsync(async (req, res, next) => {
    const examId = req.params.id;

    // Verify exam exists and belongs to teacher
    const exam = await Exam.findOne({ _id: examId, teacherId: req.user.id });
    if (!exam) {
        return next(new ApiError('Exam not found', 404));
    }

    const results = await ExamResult.find({ 
        examId: examId, 
        teacherId: req.user.id 
    })
    .populate('studentId', 'fullName nationalId')
    .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: results.length,
        data: results,
    });
});

// @desc    Get exam statistics
// @route   GET /api/exams/stats/overview
// @access  Private
exports.getExamStats = catchAsync(async (req, res, next) => {
    const totalExams = await Exam.countDocuments({ teacherId: req.teacherId });
    
    const results = await ExamResult.find({ teacherId: req.teacherId })
        .populate('examId', 'fullMark');
    
    const totalResults = results.length;
    let totalScore = 0;
    let totalFullMark = 0;
    let excellentCount = 0;

    results.forEach(r => {
        if (r.examId && r.examId.fullMark) {
            totalScore += r.score || 0;
            totalFullMark += r.examId.fullMark;
            const percentage = (r.score / r.examId.fullMark) * 100;
            if (percentage >= 80) excellentCount++;
        }
    });

    const averagePercentage = totalFullMark > 0 
        ? Math.round((totalScore / totalFullMark) * 100) 
        : 0;

    res.status(200).json({
        success: true,
        data: {
            totalExams,
            totalResults,
            averagePercentage,
            excellentCount
        }
    });
});

// @desc    Get recent exam results
// @route   GET /api/exams/results/recent
// @access  Private
exports.getRecentResults = catchAsync(async (req, res, next) => {
    const results = await ExamResult.find({ teacherId: req.teacherId })
        .populate('studentId', 'fullName nationalId')
        .populate('examId', 'title fullMark date')
        .sort({ updatedAt: -1 })
        .limit(10);

    const formattedResults = results.map(r => {
        const fullMark = r.examId ? r.examId.fullMark : 0;
        const percentage = r.examId && fullMark > 0 ? Math.round((r.score / fullMark) * 100) : 0;
        
        return {
            id: r._id,
            studentName: r.studentId ? r.studentId.fullName : 'Unknown Student',
            studentCode: r.studentId ? r.studentId.nationalId : '',
            examName: r.examId ? r.examId.title : 'Unknown Exam',
            score: r.score,
            fullMark: fullMark,
            percentage: percentage,
            date: r.examId ? r.examId.date : r.updatedAt,
            status: r.status,
            notes: r.notes
        };
    });

    res.status(200).json({
        success: true,
        count: formattedResults.length,
        data: formattedResults,
    });
});

// @desc    Add a single result (grade) for a student
// @route   POST /api/exams/results/single
// @access  Private
exports.addSingleResult = catchAsync(async (req, res, next) => {
    let { studentName, studentCode, examId, examTitle, fullMark, score, status, notes } = req.body;

    // Trim inputs
    if (studentCode) studentCode = studentCode.trim();
    if (studentName) studentName = studentName.trim();
    if (examTitle) examTitle = examTitle.trim();

    // 1. Find the student
    let student;
    if (studentCode) {
        student = await Student.findOne(scopeQuery({ nationalId: studentCode }, req.teacherId));
    } else if (studentName) {
        student = await Student.findOne(scopeQuery({ fullName: studentName }, req.teacherId));
    }

    if (!student) {
        return next(new ApiError(`الطالب غير موجود. (كود: ${studentCode || 'غير متوفر'}, اسم: ${studentName || 'غير متوفر'}). يرجى التأكد من البيانات أو إضافة الطالب أولاً.`, 404));
    }

    // 2. Find or Create Exam
    let exam;
    if (examId) {
        exam = await Exam.findOne(scopeQuery({ _id: examId }, req.teacherId));
    } else if (examTitle) {
        exam = await Exam.findOne(scopeQuery({ title: examTitle }, req.teacherId));
        
        // Create exam if it doesn't exist
        if (!exam) {
            exam = await Exam.create({
                teacherId: req.teacherId,
                title: examTitle,
                fullMark: fullMark || 100,
                passingMark: (fullMark || 100) * 0.5, // 50% default passing
                date: new Date()
            });
        } else if (fullMark && exam.fullMark !== Number(fullMark)) {
            // Update fullMark if provided and different
            exam.fullMark = Number(fullMark);
            await exam.save();
        }
    }

    if (!exam) {
        return next(new ApiError('يجب إدخال معرف الامتحان أو عنوان الامتحان', 400));
    }

    // 3. Create or Update Result
    const result = await ExamResult.findOneAndUpdate(
        {
            teacherId: req.teacherId,
            examId: exam._id,
            studentId: student._id
        },
        {
            teacherId: req.teacherId,
            examId: exam._id,
            studentId: student._id,
            score: score,
            status: status || 'present',
            notes: notes
        },
        { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        message: 'تم حفظ الدرجة بنجاح',
        data: result
    });
});

// @desc    Get all results with optional filtering and pagination
// @route   GET /api/exams/results/all
// @access  Private
exports.getAllResults = catchAsync(async (req, res, next) => {
    const { studentCode, search, page = 1, limit = 10 } = req.query;
    
    // Parse pagination parameters
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;
    
    let query = { teacherId: req.teacherId };
    
    if (studentCode || search) {
        const studentQuery = { teacherId: req.teacherId };
        if (studentCode) studentQuery.nationalId = studentCode;
        if (search) studentQuery.fullName = { $regex: search, $options: 'i' };
        
        const students = await Student.find(studentQuery).select('_id');
        const studentIds = students.map(s => s._id);
        query.studentId = { $in: studentIds };
    }

    // Get total count for pagination
    const total = await ExamResult.countDocuments(query);

    // Get paginated results
    const results = await ExamResult.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('studentId', 'fullName nationalId')
        .populate('examId', 'title fullMark date');

    const formattedResults = results.map(r => {
        const fullMark = r.examId ? r.examId.fullMark : 0;
        const percentage = r.examId && fullMark > 0 ? Math.round((r.score / fullMark) * 100) : 0;
        
        return {
            id: r._id,
            studentName: r.studentId ? r.studentId.fullName : 'Unknown Student',
            studentCode: r.studentId ? r.studentId.nationalId : '',
            examName: r.examId ? r.examId.title : 'Unknown Exam',
            score: r.score,
            fullMark: fullMark,
            percentage: percentage,
            date: r.examId ? r.examId.date : r.updatedAt,
            status: r.status,
            notes: r.notes
        };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
        success: true,
        count: formattedResults.length,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage,
        hasPrevPage,
        data: formattedResults,
    });
});

// @desc    Update a single exam result (grade)
// @route   PUT /api/exams/results/:id
// @access  Private
exports.updateResult = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { score, status, notes } = req.body;

    // Find result and verify it belongs to teacher
    const result = await ExamResult.findOne({
        _id: id,
        teacherId: req.teacherId
    }).populate('examId', 'fullMark');

    if (!result) {
        return next(new ApiError('النتيجة غير موجودة', 404));
    }

    // Validate score doesn't exceed fullMark
    if (score !== undefined && result.examId && score > result.examId.fullMark) {
        return next(new ApiError(`الدرجة لا يمكن أن تكون أكبر من ${result.examId.fullMark}`, 400));
    }

    // Update result
    if (score !== undefined) result.score = score;
    if (status !== undefined) result.status = status;
    if (notes !== undefined) result.notes = notes;

    await result.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث الدرجة بنجاح',
        data: result
    });
});

// @desc    Delete an exam result (grade)
// @route   DELETE /api/exams/results/:id
// @access  Private
exports.deleteResult = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    // Find and delete result
    const result = await ExamResult.findOneAndDelete({
        _id: id,
        teacherId: req.teacherId
    });

    if (!result) {
        return next(new ApiError('النتيجة غير موجودة', 404));
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف الدرجة بنجاح'
    });
});
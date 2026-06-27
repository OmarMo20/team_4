const express = require('express');
const sessionController = require('../controllers/sessionController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all routes
router.use(protect);

// Session statistics
router.get('/stats', sessionController.getSessionStats);

// Recent sessions
router.get('/recent', sessionController.getRecentSessions);

// Recent attendance records
router.get('/attendance/recent', sessionController.getRecentAttendance);

// Get all sessions and create new session
router
    .route('/')
    .get(sessionController.getSessions)
    .post(sessionController.createSession);

// Individual session operations
router.get('/:id', sessionController.getSessionById);
router.get('/:id/attendance', sessionController.getSessionAttendance);
router.post('/:id/attendance', sessionController.addAttendanceByCode);
router.delete('/:id/attendance/:attendanceId', sessionController.removeAttendance);
router.patch('/:id/attendance/:attendanceId/status', sessionController.updateAttendanceStatus);
router.patch('/:id/status', sessionController.updateSessionStatus);
router.post('/:id/end', sessionController.endSession);
router.delete('/:id', sessionController.deleteSession);

module.exports = router;

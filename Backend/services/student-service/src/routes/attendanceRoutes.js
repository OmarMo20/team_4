const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const attendanceController = require('../controllers/attendanceController');

const router = express.Router();

// Protect all routes
router.use(protect);

// QR scan attendance
router.post('/scan', attendanceController.scanAttendance);

module.exports = router;



















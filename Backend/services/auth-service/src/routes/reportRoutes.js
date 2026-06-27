const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middlewares/authMiddleware');

// Protect all routes
router.use(protect);

// Report routes
router.get('/student/:code', reportController.getStudentReport);
router.get('/student-id/:id', reportController.getStudentReportById);

module.exports = router;
















const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect } = require('../middlewares/authMiddleware');

// Public Portal Routes
router.post('/portal/login', studentController.portalLogin);
router.post('/portal/register', studentController.portalRegister);
router.post('/add', studentController.portalRegister); // Added /add as public registration
router.get('/portal/:code/dashboard', studentController.getPortalDashboard);

// Student Password Management
router.post('/portal/change-password', studentController.changePortalPassword);
router.post('/portal/forgot-password', studentController.forgotPortalPassword);
router.post('/portal/reset-password', studentController.resetPortalPassword);

// Protect all routes
router.use(protect);

// Student CRUD routes
router.route('/')
    .get(studentController.getStudents)
    .post(studentController.createStudent);

// Batch operations
router.post('/batch', studentController.createStudentsBatch);

router.route('/:id')
    .get(studentController.getStudent)
    .put(studentController.updateStudent)
    .delete(studentController.deleteStudent);

router.get('/:id/summary', studentController.getStudentSummary);

module.exports = router;

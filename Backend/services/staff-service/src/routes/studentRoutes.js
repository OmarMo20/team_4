const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect } = require('../middlewares/authMiddleware');

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

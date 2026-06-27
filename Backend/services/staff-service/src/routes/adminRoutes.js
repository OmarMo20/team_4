const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Get all teachers with statistics
router.get('/teachers', adminController.getTeachers);

// Get teacher details
router.get('/teachers/:id', adminController.getTeacherDetails);

// Activate teacher
router.patch('/teachers/:id/activate', adminController.activateTeacher);

// Deactivate teacher
router.patch('/teachers/:id/deactivate', adminController.deactivateTeacher);

// Delete teacher
router.delete('/teachers/:id', adminController.deleteTeacher);

module.exports = router;





















const express = require('express');
const examController = require('../controllers/examController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all routes
router.use(protect);

// Stats routes
router.get('/stats/overview', examController.getExamStats);
router.get('/results/recent', examController.getRecentResults);
router.get('/results/all', examController.getAllResults);
router.post('/results/single', examController.addSingleResult);

// Exam CRUD
router
    .route('/')
    .get(examController.getExams)
    .post(examController.createExam);

router.get('/:id', examController.getExamById);

// Results management
router.get('/:id/results', examController.getExamResults);
router.post('/:id/results', examController.addExamResults);

// Single result management
router.put('/results/:id', examController.updateResult);
router.delete('/results/:id', examController.deleteResult);

module.exports = router;

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, allowedTo } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;

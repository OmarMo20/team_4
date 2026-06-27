const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const financeController = require('../controllers/financeController');

const router = express.Router();

// Protect all finance routes
router.use(protect);

router.get('/summary', financeController.getFinanceSummary);
router.get('/payments', financeController.getPayments);

module.exports = router;

















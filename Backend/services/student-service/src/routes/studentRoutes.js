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

module.exports = router;

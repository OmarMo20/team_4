const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const assistantRoutes = require('./assistantRoutes');
const adminRoutes = require('./adminRoutes');

router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Auth API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

router.use('/auth', authRoutes);
router.use('/assistants', assistantRoutes);
router.use('/admin', adminRoutes);

module.exports = router;

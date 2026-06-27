const express = require('express');
const router = express.Router();

const studentRoutes = require('./studentRoutes');

router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Student Portal API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

router.use('/students', studentRoutes);

module.exports = router;

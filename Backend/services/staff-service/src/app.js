/**
 * ===========================================
 * Express Application Configuration
 * ===========================================
 * Sets up Express app with all middlewares,
 * routes, and error handling.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const routes = require('./routes');
const Student = require('./models/Student');
const { errorHandler, notFoundHandler } = require('./middlewares/errorMiddleware');

// ===========================================
// Database Cleanup (E11000 Fix)
// ===========================================
const performCleanup = async () => {
    try {
        const result = await Student.deleteMany({ nationalId: { $in: [null, ''] } });
        if (result.deletedCount > 0) {
            console.log(`🧹 Database Cleanup: Removed ${result.deletedCount} students with null/empty nationalId`);
        }
    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
    }
};

// Initialize Express app
const app = express();

// Attach cleanup to app for use in server.js
app.performCleanup = performCleanup;

// ===========================================
// Security Middlewares
// ===========================================

// Helmet - Sets security HTTP headers
app.use(helmet());

// CORS - Enable Cross-Origin Resource Sharing
app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            
            // Check if origin is in allowed list
            if (config.cors.origins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                // Log for debugging
                console.log('CORS blocked origin:', origin);
                console.log('Allowed origins:', config.cors.origins);
                callback(null, true); // Allow all for now, can be restricted later
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// ===========================================
// Body Parsing Middlewares
// ===========================================

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===========================================
// Logging Middleware
// ===========================================

// Morgan - HTTP request logger
if (config.isDevelopment) {
    // Detailed logs in development
    app.use(morgan('dev'));
} else {
    // Combined format in production
    app.use(morgan('combined'));
}

// ===========================================
// API Routes
// ===========================================

// Mount all routes under /api prefix
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to Class Track API',
        version: '1.0.0',
        documentation: '/api/docs',
    });
});


app.use(notFoundHandler);


app.use(errorHandler);

module.exports = app;

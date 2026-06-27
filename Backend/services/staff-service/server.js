/**
 * ===========================================
 * Server Entry Point
 * ===========================================
 * Main entry point for the application.
 * Handles server startup and graceful shutdown.
 */

const app = require('./src/app');
const config = require('./src/config');
const connectDatabase = require('./src/config/database');

// ===========================================
// Uncaught Exception Handler
// ===========================================
// Must be at the top to catch synchronous errors

process.on('uncaughtException', (err) => {
    console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
    process.exit(1);
});

// ===========================================
// Server Startup
// ===========================================

let server;

const startServer = async () => {
    try {
        // Connect to database
        await connectDatabase();

        // Perform one-time DB cleanup for invalid students (E11000 Fix)
        if (app.performCleanup) {
            await app.performCleanup();
        }

        // Start the server
        server = app.listen(config.port, () => {
            console.log('===========================================');
            console.log(`🚀 Server running in ${config.env} mode`);
            console.log(`📡 Listening on http://${config.host}:${config.port}`);
            console.log('===========================================');
        });

        // Handle server errors
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${config.port} is already in use`);
                process.exit(1);
            }
            throw err;
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Start the server
startServer();

// ===========================================
// Unhandled Promise Rejection Handler
// ===========================================

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 UNHANDLED REJECTION! Shutting down...');
    console.error('Reason:', reason);

    // Close server gracefully, then exit
    if (server) {
        server.close(() => {
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});

// ===========================================
// Graceful Shutdown
// ===========================================

const gracefulShutdown = (signal) => {
    console.log(`\n📪 ${signal} received. Shutting down gracefully...`);

    if (server) {
        server.close(() => {
            console.log('✅ HTTP server closed');
            process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
            console.error('⚠️ Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
};

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

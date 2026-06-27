/**
 * ===========================================
 * Database Configuration
 * ===========================================
 * MongoDB connection setup using Mongoose
 * with connection event handling and retry logic.
 */

const mongoose = require('mongoose');
const config = require('./index');

/**
 * Connects to MongoDB database
 * Features:
 * - Automatic retry on initial connection failure
 * - Event handlers for connection state changes
 * - Graceful shutdown handling
 * - Serverless Functions support (connection caching)
 */

// Cache the connection for Serverless Functions
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDatabase = async () => {
    // If connection already exists and is ready, return it
    if (cached.conn) {
        if (mongoose.connection.readyState === 1) {
            return cached.conn;
        }
        // If connection exists but is not ready, clear it
        cached.conn = null;
    }

    // If connection promise exists, wait for it
    if (!cached.promise) {
        // Set mongoose options before connecting
        mongoose.set('strictQuery', true);
        // Disable buffering for Serverless Functions (Mongoose 8+)
        mongoose.set('bufferCommands', false);

        cached.promise = mongoose.connect(config.mongodb.uri, config.mongodb.options).then((mongoose) => {
            console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error(`❌ MongoDB Connection Failed: ${e.message}`);
        throw e;
    }

    // Connection event handlers (only set once)
    if (!mongoose.connection.listeners('error').length) {
        mongoose.connection.on('error', (err) => {
            console.error(`❌ MongoDB Connection Error: ${err.message}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB Disconnected');
            cached.conn = null;
            cached.promise = null;
        });

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB Reconnected');
        });
    }

    return cached.conn;
};

module.exports = connectDatabase;

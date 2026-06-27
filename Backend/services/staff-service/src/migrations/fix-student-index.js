/**
 * Migration Script: Fix Student nationalId Index
 * 
 * This script drops the old sparse index and recreates it without the sparse option.
 * This prevents the E11000 duplicate key error when nationalId is null.
 */

const mongoose = require('mongoose');
const config = require('../config');

async function migrateStudentIndex() {
    try {
        // Connect to MongoDB
        await mongoose.connect(config.mongoURI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const studentsCollection = db.collection('students');

        // Get existing indexes
        const indexes = await studentsCollection.indexes();
        console.log('\n📋 Current indexes:');
        indexes.forEach(index => {
            console.log(`  - ${index.name}`);
        });

        // Drop the old index if it exists
        try {
            await studentsCollection.dropIndex('teacherId_1_nationalId_1');
            console.log('\n✅ Dropped old index: teacherId_1_nationalId_1');
        } catch (error) {
            if (error.code === 27) {
                console.log('\n⚠️  Index teacherId_1_nationalId_1 does not exist, skipping drop');
            } else {
                throw error;
            }
        }

        // Create new index without sparse option
        await studentsCollection.createIndex(
            { teacherId: 1, nationalId: 1 },
            { unique: true }
        );
        console.log('✅ Created new index: teacherId_1_nationalId_1 (without sparse)');

        // Verify the new index
        const newIndexes = await studentsCollection.indexes();
        console.log('\n📋 Updated indexes:');
        newIndexes.forEach(index => {
            console.log(`  - ${index.name}`);
        });

        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateStudentIndex();

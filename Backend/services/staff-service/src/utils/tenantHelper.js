/**
 * ===========================================
 * Tenant Helper Utilities
 * ===========================================
 * Multi-Tenant Support: Helper functions for tenant-scoped database operations.
 * These utilities ensure data isolation between teachers.
 */

const mongoose = require('mongoose');

/**
 * Add teacherId to a query object for tenant scoping
 * @param {Object} query - The original query object
 * @param {ObjectId|string} teacherId - The teacher's ID from req.teacherId
 * @returns {Object} Query object with teacherId added
 * 
 * @example
 * // Instead of: Student.find({ grade: '10' })
 * // Use: Student.find(scopeQuery({ grade: '10' }, req.teacherId))
 */
const scopeQuery = (query, teacherId) => {
    if (!teacherId) {
        throw new Error('Multi-Tenant: teacherId is required for scoped queries');
    }
    return {
        ...query,
        teacherId: new mongoose.Types.ObjectId(teacherId),
    };
};

/**
 * Add teacherId to create data for tenant scoping
 * @param {Object} data - The data to be created
 * @param {ObjectId|string} teacherId - The teacher's ID from req.teacherId
 * @returns {Object} Data object with teacherId added
 * 
 * @example
 * // Instead of: Student.create({ fullName: 'Ahmed' })
 * // Use: Student.create(scopeCreate({ fullName: 'Ahmed' }, req.teacherId))
 */
const scopeCreate = (data, teacherId) => {
    if (!teacherId) {
        throw new Error('Multi-Tenant: teacherId is required for creating records');
    }
    return {
        ...data,
        teacherId: new mongoose.Types.ObjectId(teacherId),
    };
};

/**
 * Verify that a document belongs to the current tenant
 * @param {Object} document - The mongoose document to check
 * @param {ObjectId|string} teacherId - The teacher's ID from req.teacherId
 * @returns {boolean} True if document belongs to tenant
 */
const belongsToTenant = (document, teacherId) => {
    if (!document || !document.teacherId) {
        return false;
    }
    return document.teacherId.toString() === teacherId.toString();
};

/**
 * Delete all data for a teacher when they leave/delete account
 * Multi-Tenant: Cascade delete all tenant-scoped data
 * 
 * @param {ObjectId|string} teacherId - The teacher's ID
 * @param {Object} models - Object containing all model references
 * @returns {Object} Summary of deleted records per collection
 * 
 * @example
 * const { Student, Session, Attendance, Payment, Report, Message, AdditionalService, ServiceRequest } = require('../models');
 * const result = await deleteTeacherData(teacherId, { Student, Session, Attendance, Payment, Report, Message, AdditionalService, ServiceRequest });
 */
const deleteTeacherData = async (teacherId, models) => {
    if (!teacherId) {
        throw new Error('Multi-Tenant: teacherId is required for data deletion');
    }

    const deletionResults = {};
    const teacherIdObj = new mongoose.Types.ObjectId(teacherId);

    // Order matters: delete dependent documents first (attendance, payments, etc.)
    // then delete parent documents (sessions, students)

    const modelsToDelete = [
        'Attendance',
        'Payment',
        'Report',
        'Message',
        'ServiceRequest',
        'AdditionalService',
        'Session',
        'Student',
    ];

    for (const modelName of modelsToDelete) {
        if (models[modelName]) {
            try {
                const result = await models[modelName].deleteMany({ teacherId: teacherIdObj });
                deletionResults[modelName] = result.deletedCount;
            } catch (error) {
                console.error(`Multi-Tenant: Error deleting ${modelName} for teacher ${teacherId}:`, error);
                deletionResults[modelName] = { error: error.message };
            }
        }
    }

    return deletionResults;
};

/**
 * Get statistics about a teacher's data
 * @param {ObjectId|string} teacherId - The teacher's ID
 * @param {Object} models - Object containing all model references
 * @returns {Object} Count of records per collection
 */
const getTeacherDataStats = async (teacherId, models) => {
    if (!teacherId) {
        throw new Error('Multi-Tenant: teacherId is required');
    }

    const stats = {};
    const teacherIdObj = new mongoose.Types.ObjectId(teacherId);

    const modelsToCount = [
        'Student',
        'Session',
        'Attendance',
        'Payment',
        'Report',
        'Message',
        'AdditionalService',
        'ServiceRequest',
    ];

    for (const modelName of modelsToCount) {
        if (models[modelName]) {
            try {
                stats[modelName] = await models[modelName].countDocuments({ teacherId: teacherIdObj });
            } catch (error) {
                stats[modelName] = 0;
            }
        }
    }

    return stats;
};

module.exports = {
    scopeQuery,
    scopeCreate,
    belongsToTenant,
    deleteTeacherData,
    getTeacherDataStats,
};

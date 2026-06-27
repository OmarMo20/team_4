const { AdditionalService, ServiceRequest } = require('../models/AdditionalService');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { scopeQuery, scopeCreate, belongsToTenant } = require('../utils/tenantHelper');

/**
 * Create a new service request for a student
 * @route POST /api/additional-services/request
 * @access Private
 */
exports.createServiceRequest = async (req, res, next) => {
    try {
        const { studentId, serviceName, price, notes } = req.body;

        if (!studentId || !serviceName || price === undefined) {
            throw new ApiError('من فضلك أدخل بيانات الخدمة كاملة', 400);
        }

        // 1. Find or create the service type for this teacher
        let service = await AdditionalService.findOne(scopeQuery({ name: serviceName }, req.teacherId));
        
        if (!service) {
            service = await AdditionalService.create(scopeCreate({
                name: serviceName,
                price: price
            }, req.teacherId));
        } else {
            // Update price if it changed? For now just use provided price
            service.price = price;
            await service.save();
        }

        // 2. Verify student exists and belongs to teacher
        const student = await Student.findById(studentId);
        if (!student || !belongsToTenant(student, req.teacherId)) {
            throw new ApiError('الطالب غير موجود أو غير تابع لك', 404);
        }

        // 3. Create the service request
        const serviceRequest = await ServiceRequest.create(scopeCreate({
            service: service._id,
            student: studentId,
            requestedBy: req.user._id,
            notes: notes,
            status: 'completed' // Default to completed as per UI flow
        }, req.teacherId));

        res.status(201).json({
            success: true,
            message: 'تم إضافة الخدمة بنجاح',
            data: serviceRequest
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all service requests for the teacher
 * @route GET /api/additional-services/requests
 * @access Private
 */
exports.getServiceRequests = async (req, res, next) => {
    try {
        const requests = await ServiceRequest.find(scopeQuery({}, req.teacherId))
            .populate('service')
            .populate('student', 'fullName grade nationalId')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a service request
 * @route DELETE /api/additional-services/requests/:id
 * @access Private
 */
exports.deleteServiceRequest = async (req, res, next) => {
    try {
        const { id } = req.params;

        const serviceRequest = await ServiceRequest.findOne(scopeQuery({ _id: id }, req.teacherId));

        if (!serviceRequest) {
            throw new ApiError('الخدمة غير موجودة أو غير تابع لك', 404);
        }

        await ServiceRequest.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'تم حذف الخدمة بنجاح'
        });
    } catch (error) {
        next(error);
    }
};
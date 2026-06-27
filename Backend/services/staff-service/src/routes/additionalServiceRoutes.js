const express = require('express');
const additionalServiceController = require('../controllers/additionalServiceController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router
    .route('/requests')
    .get(additionalServiceController.getServiceRequests)
    .post(additionalServiceController.createServiceRequest);

router
    .route('/requests/:id')
    .delete(additionalServiceController.deleteServiceRequest);

module.exports = router;

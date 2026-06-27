const express = require('express');
const messageController = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(messageController.getMessages)
    .post(messageController.sendMessage);

module.exports = router;

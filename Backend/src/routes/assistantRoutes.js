const express = require('express');
const assistantController = require('../controllers/assistantController');
const { protect } = require('../middlewares/authMiddleware');
const { restrictTo } = require('../middlewares/authMiddleware');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validationMiddleware');

const router = express.Router();

// All routes require authentication and teacher/admin role
router.use(protect);
router.use(restrictTo('teacher', 'admin'));

// Create assistant validation
const createAssistantValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/)
        .withMessage('Name can only contain letters and spaces'),

    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please enter a valid email address')
        .normalizeEmail(),

    body('password')
        .trim()
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/\d/)
        .withMessage('Password must contain at least one number')
        .matches(/[a-zA-Z]/)
        .withMessage('Password must contain at least one letter'),

    body('phone')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .custom((value) => {
            // If phone is provided, validate it
            if (value && value.length > 0) {
                if (!/^[0-9]{10,15}$/.test(value)) {
                    throw new Error('Phone number must be between 10 and 15 digits');
                }
            }
            return true;
        }),

    validate,
];

// Routes
router.post('/', createAssistantValidation, assistantController.createAssistant);
router.get('/', assistantController.getAssistants);
router.patch('/:id', assistantController.updateAssistant);
router.delete('/:id', assistantController.deleteAssistant);

module.exports = router;

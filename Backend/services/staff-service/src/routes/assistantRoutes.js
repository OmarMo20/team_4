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
        .withMessage('الاسم مطلوب')
        .isLength({ min: 2, max: 50 })
        .withMessage('يجب أن يكون الاسم بين 2 و 50 حرفاً')
        .matches(/^[a-zA-Z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/)
        .withMessage('يمكن أن يحتوي الاسم على الحروف والمسافات فقط'),

    body('email')
        .trim()
        .notEmpty()
        .withMessage('البريد الإلكتروني مطلوب')
        .isEmail()
        .withMessage('من فضلك أدخل بريدًا إلكترونيًا صالحًا')
        .normalizeEmail(),

    body('password')
        .trim()
        .notEmpty()
        .withMessage('كلمة المرور مطلوبة')
        .isLength({ min: 8 })
        .withMessage('يجب أن تكون كلمة المرور 8 أحرف على الأقل')
        .matches(/\d/)
        .withMessage('يجب أن تحتوي كلمة المرور على رقم واحد على الأقل')
        .matches(/[a-zA-Z]/)
        .withMessage('يجب أن تحتوي كلمة المرور على حرف واحد على الأقل'),

    body('phone')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .custom((value) => {
            // If phone is provided, validate it
            if (value && value.length > 0) {
                if (!/^[0-9]{10,15}$/.test(value)) {
                    throw new Error('رقم الهاتف يجب أن يكون بين 10 و 15 رقم');
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


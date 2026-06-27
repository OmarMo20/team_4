
const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // Format errors into a readable message
        const errorMessages = errors.array().map((error) => ({
            field: error.path,
            message: error.msg,
        }));

        // Create error response
        const error = ApiError.badRequest('فشل التحقق من البيانات');
        error.errors = errorMessages;

        return res.status(400).json({
            success: false,
            status: 'fail',
            message: 'فشل التحقق من البيانات',
            errors: errorMessages,
        });
    }

    next();
};


const registerValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('الاسم مطلوب')
        .isLength({ min: 2, max: 50 })
        .withMessage('يجب أن يكون الاسم بين 2 و 50 حرفاً')
        // Allow any language letters (including Arabic) + spaces only
        .matches(/^[\p{L}\s]+$/u)
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

    body('confirmPassword')
        .optional()
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('كلمتا المرور غير متطابقتين');
            }
            return true;
        }),

    validate,
];


const loginValidation = [
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
        .withMessage('كلمة المرور مطلوبة'),

    validate,
];


const updateProfileValidation = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('يجب أن يكون الاسم بين 2 و 50 حرفاً')
        // Allow any language letters (including Arabic) + spaces only
        .matches(/^[\p{L}\s]+$/u)
        .withMessage('يمكن أن يحتوي الاسم على الحروف والمسافات فقط'),

    validate,
];


const changePasswordValidation = [
    body('currentPassword')
        .trim()
        .notEmpty()
        .withMessage('كلمة المرور الحالية مطلوبة'),

    body('newPassword')
        .trim()
        .notEmpty()
        .withMessage('كلمة المرور الجديدة مطلوبة')
        .isLength({ min: 8 })
        .withMessage('يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل')
        .matches(/\d/)
        .withMessage('يجب أن تحتوي كلمة المرور الجديدة على رقم واحد على الأقل')
        .matches(/[a-zA-Z]/)
        .withMessage('يجب أن تحتوي كلمة المرور الجديدة على حرف واحد على الأقل')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('يجب أن تختلف كلمة المرور الجديدة عن الحالية');
            }
            return true;
        }),

    body('confirmNewPassword')
        .optional()
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('كلمتا المرور غير متطابقتين');
            }
            return true;
        }),

    validate,
];

module.exports = {
    validate,
    registerValidation,
    loginValidation,
    updateProfileValidation,
    changePasswordValidation,
};

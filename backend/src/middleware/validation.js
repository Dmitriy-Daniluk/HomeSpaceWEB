const { body, param, query } = require('express-validator');

const validate = (req, res, next) => {
  const errors = req.validationErrors ? req.validationErrors() : [];
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
  body('fullName').trim().notEmpty().withMessage('Full name required'),
  validate,
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  validate,
];

const taskValidation = [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('status').optional().isIn(['new', 'in_progress', 'done']).withMessage('Invalid status'),
  body('executorId').optional().isInt().withMessage('Invalid executor ID'),
  body('deadline').optional().isISO8601().withMessage('Invalid deadline'),
  validate,
];

const transactionValidation = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be positive'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').optional().trim(),
  body('description').optional().trim(),
  validate,
];

const geofenceValidation = [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('radiusMeters').optional().isInt({ gt: 0 }).withMessage('Invalid radius'),
  validate,
];

const passwordValidation = [
  body('serviceName').trim().notEmpty().withMessage('Service name required'),
  body('encryptedPassword').trim().notEmpty().withMessage('Password required'),
  body('login').optional().trim(),
  body('url').optional().trim(),
  body('notes').optional().trim(),
  body('visibilityLevel').optional().isIn(['private', 'parents', 'family']).withMessage('Invalid visibility'),
  validate,
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  taskValidation,
  transactionValidation,
  geofenceValidation,
  passwordValidation,
};

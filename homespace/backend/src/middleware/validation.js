const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req).array();
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Validation failed',
      details: errors.map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').optional().custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
  body().custom((_, { req }) => {
    const fullName = req.body.fullName || req.body.full_name;
    if (!fullName || !String(fullName).trim()) throw new Error('Full name required');
    return true;
  }),
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
  body('executorId').optional({ nullable: true, checkFalsy: true }).isInt().withMessage('Invalid executor ID'),
  body('executor_id').optional({ nullable: true, checkFalsy: true }).isInt().withMessage('Invalid executor ID'),
  body('deadline').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Invalid deadline'),
  validate,
];

const transactionValidation = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be positive'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').optional().trim(),
  body('description').optional().trim(),
  body('transactionDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Invalid transaction date'),
  body('transaction_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Invalid transaction date'),
  validate,
];

const geofenceValidation = [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('radiusMeters').optional({ nullable: true, checkFalsy: true }).isInt({ gt: 0 }).withMessage('Invalid radius'),
  body('radius').optional({ nullable: true, checkFalsy: true }).isInt({ gt: 0 }).withMessage('Invalid radius'),
  body('radius_meters').optional({ nullable: true, checkFalsy: true }).isInt({ gt: 0 }).withMessage('Invalid radius'),
  validate,
];

const passwordValidation = [
  body().custom((_, { req }) => {
    const serviceName = req.body.serviceName || req.body.service_name || req.body.service;
    const password = req.body.encryptedPassword || req.body.encrypted_password || req.body.password;
    if (!serviceName || !String(serviceName).trim()) throw new Error('Service name required');
    if (!password || !String(password).trim()) throw new Error('Password required');
    return true;
  }),
  body('login').optional().trim(),
  body('url').optional().trim(),
  body('notes').optional().trim(),
  body('visibilityLevel').optional().isIn(['private', 'parents', 'family']).withMessage('Invalid visibility'),
  body('visibility_level').optional().isIn(['private', 'parents', 'family']).withMessage('Invalid visibility'),
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

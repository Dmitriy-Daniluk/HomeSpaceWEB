const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const logger = require('../utils/logger');
const { sendPasswordResetEmail } = require('../utils/mailer');
const { serializeAuthUser } = require('../utils/authUser');
const { getFamilyRoleSummary } = require('../utils/familyRoles');
const { getUserPermissionSummary } = require('../utils/rolePermissions');

const signToken = (userId) => jwt.sign(
  { id: userId },
  process.env.JWT_SECRET || 'homespace-secret',
  { expiresIn: process.env.JWT_EXPIRE || '7d' }
);

const buildSessionUser = async (user) => {
  const roleSummary = await getFamilyRoleSummary(user.id);
  const permissionSummary = await getUserPermissionSummary(user.id);

  return {
    ...serializeAuthUser(user),
    familyRoles: roleSummary.roles,
    isChildOnly: roleSummary.isChildOnly,
    is_child_only: roleSummary.isChildOnly,
    permissions: permissionSummary.permissions,
    pagePermissions: permissionSummary.permissions,
    page_permissions: permissionSummary.permissions,
    familyPermissions: permissionSummary.familyPermissions,
    family_permissions: permissionSummary.family_permissions,
  };
};

exports.register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const fullName = req.body.fullName || req.body.full_name;

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)',
      [email, passwordHash, fullName]
    );

    const token = signToken(result.insertId);

    res.status(201).json({
      message: 'User registered successfully',
      data: {
        token,
        user: await buildSessionUser({
          id: result.insertId,
          email,
          full_name: fullName,
          role: 'user',
          has_subscription: false,
          subscription_until: null,
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.query(
      `SELECT id, email, password_hash, full_name, birth_date, phone, avatar_url, role,
              has_subscription, subscription_until, created_at
       FROM users WHERE email = ?`,
      [email]
    );
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user.id);

    res.json({
      message: 'Login successful',
      data: {
        token,
        user: await buildSessionUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000);

    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, resetTokenExpires, users[0].id]
    );

    const mailResult = await sendPasswordResetEmail({ to: email, token: resetToken });

    res.json({
      message: 'If the email exists, a reset link has been sent',
      data: process.env.NODE_ENV !== 'production' && !mailResult.sent ? { resetToken } : undefined,
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.body;
    const password = req.body.password || req.body.newPassword;

    const [users] = await pool.query(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [passwordHash, users[0].id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const currentPassword = req.body.currentPassword || req.body.current_password;
    const newPassword = req.body.newPassword || req.body.new_password || req.body.password;
    const confirmPassword = req.body.confirmPassword || req.body.confirm_password || newPassword;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const [users] = await pool.query('SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    logger.info('User logout', {
      userId: req.user.id,
      email: req.user.email,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ message: 'Logout logged' });
  } catch (error) {
    next(error);
  }
};

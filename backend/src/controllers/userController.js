const pool = require('../config/db');
const path = require('path');

exports.getProfile = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, full_name, birth_date, phone, avatar_url, has_subscription, subscription_until, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    const [families] = await pool.query(
      `SELECT f.id, f.name, fm.role FROM families f
       JOIN family_members fm ON f.id = fm.family_id
       WHERE fm.user_id = ?`,
      [req.user.id]
    );

    const [familyTaskStats] = await pool.query(
      `SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed_tasks
       FROM tasks t
       JOIN family_members fm ON t.family_id = fm.family_id
       WHERE fm.user_id = ?`,
      [req.user.id]
    );

    const [personalTaskStats] = await pool.query(
      `SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed_tasks
       FROM tasks WHERE user_id = ? AND family_id IS NULL`,
      [req.user.id]
    );

    const [familyTransactionStats] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
       FROM transactions t
       JOIN family_members fm ON t.family_id = fm.family_id
       WHERE fm.user_id = ?`,
      [req.user.id]
    );

    const [personalBudgetStats] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
       FROM transactions WHERE user_id = ? AND family_id IS NULL`,
      [req.user.id]
    );

    res.json({
      message: 'Profile retrieved',
      data: {
        ...user,
        families,
        stats: {
          tasks: familyTaskStats[0],
          personalTasks: personalTaskStats[0],
          transactions: familyTransactionStats[0],
          personalBudget: personalBudgetStats[0],
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, birthDate, phone } = req.body;

    await pool.query(
      'UPDATE users SET full_name = COALESCE(?, full_name), birth_date = COALESCE(?, birth_date), phone = COALESCE(?, phone) WHERE id = ?',
      [fullName, birthDate, phone, req.user.id]
    );

    const [users] = await pool.query(
      'SELECT id, email, full_name, birth_date, phone, avatar_url FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ message: 'Profile updated', data: users[0] });
  } catch (error) {
    next(error);
  }
};

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.id]);

    res.json({ message: 'Avatar uploaded', data: { avatarUrl } });
  } catch (error) {
    next(error);
  }
};

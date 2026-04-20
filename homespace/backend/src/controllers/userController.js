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
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
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
    const fullName = req.body.fullName || req.body.full_name;
    const birthDate = req.body.birthDate || req.body.birth_date;
    const { phone, email } = req.body;

    if (email) {
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, req.user.id]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    await pool.query(
      'UPDATE users SET full_name = COALESCE(?, full_name), birth_date = COALESCE(?, birth_date), phone = COALESCE(?, phone), email = COALESCE(?, email) WHERE id = ?',
      [fullName, birthDate, phone, email, req.user.id]
    );

    const [users] = await pool.query(
      'SELECT id, email, full_name, birth_date, phone, avatar_url FROM users WHERE id = ?',
      [req.user.id]
    );

    const user = {
      ...users[0],
      fullName: users[0].full_name,
      avatarUrl: users[0].avatar_url,
    };

    res.json({ message: 'Profile updated', data: user });
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

    res.json({ message: 'Avatar uploaded', data: { avatarUrl, avatar_url: avatarUrl } });
  } catch (error) {
    next(error);
  }
};

exports.purchaseSubscription = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const plan = req.body.plan === 'year' ? 'year' : 'month';
    const months = plan === 'year' ? 12 : 1;
    const amount = plan === 'year' ? 2490 : 299;
    const providerPaymentId = `SBP-${Date.now()}-${req.user.id}-${Math.round(Math.random() * 1e6)}`;

    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO subscription_payments
        (user_id, plan, amount, currency, payment_method, status, provider_payment_id, paid_at, metadata)
       VALUES (?, ?, ?, 'RUB', 'mock_sbp', 'paid', ?, NOW(), ?)`,
      [
        req.user.id,
        plan,
        amount,
        providerPaymentId,
        JSON.stringify({
          sbp_stub: true,
          bank: req.body.bank || 'demo-bank',
          comment: 'Dev SBP stub: no real money movement',
        }),
      ]
    );

    await connection.query(
      `UPDATE users
       SET has_subscription = TRUE,
           subscription_until = CASE
             WHEN subscription_until IS NOT NULL AND subscription_until > NOW()
               THEN DATE_ADD(subscription_until, INTERVAL ? MONTH)
             ELSE DATE_ADD(NOW(), INTERVAL ? MONTH)
           END
       WHERE id = ?`,
      [months, months, req.user.id]
    );

    const [users] = await connection.query(
      'SELECT id, email, full_name, birth_date, phone, avatar_url, has_subscription, subscription_until, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    await connection.commit();

    res.json({
      message: 'Subscription activated',
      data: {
        ...users[0],
        fullName: users[0].full_name,
        avatarUrl: users[0].avatar_url,
      },
      payment: {
        providerPaymentId,
        amount,
        currency: 'RUB',
        method: 'mock_sbp',
        status: 'paid',
      },
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

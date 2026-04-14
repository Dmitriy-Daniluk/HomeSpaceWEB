const pool = require('../config/db');

exports.getStats = async (req, res, next) => {
  try {
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [families] = await pool.query('SELECT COUNT(*) as count FROM families');
    const [tasks] = await pool.query('SELECT COUNT(*) as count FROM tasks');
    const [transactions] = await pool.query('SELECT COUNT(*) as count FROM transactions');

    res.json({
      message: 'Admin stats retrieved',
      data: {
        users: users[0].count,
        families: families[0].count,
        tasks: tasks[0].count,
        transactions: transactions[0].count,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getRecentUsers = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, full_name, created_at FROM users ORDER BY created_at DESC LIMIT 20'
    );

    res.json({ message: 'Recent users retrieved', data: users });
  } catch (error) {
    next(error);
  }
};

exports.getRecentFamilies = async (req, res, next) => {
  try {
    const [families] = await pool.query(
      `SELECT f.id, f.name, f.description, f.created_at,
        COUNT(fm.user_id) as member_count
       FROM families f
       LEFT JOIN family_members fm ON f.id = fm.family_id
       GROUP BY f.id, f.name, f.description, f.created_at
       ORDER BY f.created_at DESC
       LIMIT 20`
    );

    res.json({ message: 'Recent families retrieved', data: families });
  } catch (error) {
    next(error);
  }
};

exports.getSubscriptionStats = async (req, res, next) => {
  try {
    const [total] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [subscribed] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE has_subscription = TRUE'
    );
    const [active] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE has_subscription = TRUE AND subscription_until > NOW()'
    );

    const [expiring] = await pool.query(
      `SELECT id, email, full_name, subscription_until
       FROM users
       WHERE has_subscription = TRUE AND subscription_until BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
       ORDER BY subscription_until ASC`
    );

    res.json({
      message: 'Subscription stats retrieved',
      data: {
        totalUsers: total[0].count,
        subscribedUsers: subscribed[0].count,
        activeSubscriptions: active[0].count,
        expiringSoon: expiring,
      },
    });
  } catch (error) {
    next(error);
  }
};

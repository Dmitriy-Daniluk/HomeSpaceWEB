const pool = require('../config/db');

exports.getProductivity = async (req, res, next) => {
  try {
    const { familyId } = req.query;

    if (!familyId) {
      return res.status(400).json({ error: 'familyId query param required' });
    }

    const [membership] = await pool.query(
      'SELECT role FROM family_members WHERE user_id = ? AND family_id = ?',
      [req.user.id, familyId]
    );

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Not a member of this family' });
    }

    const [topPerformers] = await pool.query(
      `SELECT u.id, u.full_name, u.avatar_url,
        COUNT(t.id) as total_tasks,
        COALESCE(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END), 0) as completed_tasks,
        CASE
          WHEN COUNT(t.id) = 0 THEN 0
          ELSE ROUND(COALESCE(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END), 0) * 100.0 / COUNT(t.id), 2)
        END as completion_rate
       FROM family_members fm
       JOIN users u ON fm.user_id = u.id
       LEFT JOIN tasks t ON t.executor_id = u.id AND t.family_id = fm.family_id
       WHERE fm.family_id = ?
       GROUP BY u.id, u.full_name, u.avatar_url
       ORDER BY completed_tasks DESC, total_tasks DESC, u.full_name ASC`,
      [familyId]
    );

    const [monthlyRates] = await pool.query(
      `SELECT 
        DATE_FORMAT(t.created_at, '%Y-%m') as month,
        COUNT(t.id) as total,
        COALESCE(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END), 0) as completed,
        CASE
          WHEN COUNT(t.id) = 0 THEN 0
          ELSE ROUND(COALESCE(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END), 0) * 100.0 / COUNT(t.id), 2)
        END as completion_rate
       FROM tasks t
       WHERE t.family_id = ?
       GROUP BY DATE_FORMAT(t.created_at, '%Y-%m')
       ORDER BY month ASC`,
      [familyId]
    );

    const productivity = topPerformers.map((item) => ({
      ...item,
      total_tasks: Number(item.total_tasks || 0),
      completed_tasks: Number(item.completed_tasks || 0),
      completion_rate: Number(item.completion_rate || 0),
      executor_name: item.full_name,
    }));

    const monthlyTrend = monthlyRates.map((item) => ({
      ...item,
      total: Number(item.total || 0),
      completed: Number(item.completed || 0),
      completion_rate: Number(item.completion_rate || 0),
      report_month: item.month,
      executor_name: 'Семья',
    }));

    res.json({
      message: 'Productivity data retrieved',
      data: {
        topPerformers,
        monthlyRates,
        productivity,
        completion_rates: productivity,
        monthly_trend: monthlyTrend,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.exportData = async (req, res, next) => {
  try {
    const { familyId } = req.query;

    if (!familyId) {
      return res.status(400).json({ error: 'familyId query param required' });
    }

    const [family] = await pool.query('SELECT * FROM families WHERE id = ?', [familyId]);
    if (family.length === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }

    const [requester] = await pool.query(
      'SELECT has_subscription, subscription_until FROM users WHERE id = ?',
      [req.user.id]
    );
    const hasActiveSubscription = Boolean(
      requester[0]?.has_subscription &&
      (!requester[0].subscription_until || new Date(requester[0].subscription_until) > new Date())
    );
    if (!hasActiveSubscription) {
      return res.status(403).json({
        error: 'Subscription required for analytics export',
        message: 'Экспорт аналитики доступен в HomeSpace Plus',
        meta: { feature: 'analytics_export' },
      });
    }

    const [members] = await pool.query(
      `SELECT u.id, u.email, u.full_name, fm.role
       FROM family_members fm
       JOIN users u ON fm.user_id = u.id
       WHERE fm.family_id = ?`,
      [familyId]
    );

    const [tasks] = await pool.query(
      `SELECT t.id, t.title, t.description, t.priority, t.status, t.deadline,
              u.full_name as executor_name, t.created_at
       FROM tasks t
       LEFT JOIN users u ON t.executor_id = u.id
       WHERE t.family_id = ?
       ORDER BY t.created_at DESC`,
      [familyId]
    );

    const [transactions] = await pool.query(
      `SELECT t.id, t.amount, t.type, t.category, t.description, t.transaction_date,
              u.full_name as user_name
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       WHERE t.family_id = ?
       ORDER BY t.transaction_date DESC`,
      [familyId]
    );

    res.json({
      message: 'Data exported',
      data: {
        family: family[0],
        members,
        tasks,
        transactions,
        exportedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

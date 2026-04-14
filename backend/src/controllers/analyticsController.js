const pool = require('../config/db');

exports.getProductivity = async (req, res, next) => {
  try {
    const { familyId } = req.query;

    if (!familyId) {
      return res.status(400).json({ error: 'familyId query param required' });
    }

    const [topPerformers] = await pool.query(
      `SELECT u.id, u.full_name, u.avatar_url,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completed_tasks,
        ROUND(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_rate
       FROM tasks t
       JOIN users u ON t.executor_id = u.id
       WHERE t.family_id = ? AND t.executor_id IS NOT NULL
       GROUP BY u.id, u.full_name, u.avatar_url
       ORDER BY completed_tasks DESC`,
      [familyId]
    );

    const [monthlyRates] = await pool.query(
      `SELECT 
        DATE_FORMAT(t.created_at, '%Y-%m') as month,
        u.id as user_id,
        u.full_name,
        COUNT(*) as total,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completed,
        ROUND(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_rate
       FROM tasks t
       JOIN users u ON t.executor_id = u.id
       WHERE t.family_id = ? AND t.executor_id IS NOT NULL
       GROUP BY DATE_FORMAT(t.created_at, '%Y-%m'), u.id, u.full_name
       ORDER BY month DESC, completed DESC`,
      [familyId]
    );

    res.json({
      message: 'Productivity data retrieved',
      data: { topPerformers, monthlyRates },
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

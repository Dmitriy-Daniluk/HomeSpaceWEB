const pool = require('../config/db');

const toNumber = (value) => Number(value || 0);

exports.getOverview = async (req, res, next) => {
  try {
    const [
      [users],
      [families],
      [tasks],
      [transactions],
      [files],
      [feedbackStats],
      [recentFeedback],
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users'),
      pool.query('SELECT COUNT(*) as total FROM families'),
      pool.query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status != 'done' THEN 1 ELSE 0 END) as active
        FROM tasks
      `),
      pool.query('SELECT COUNT(*) as total FROM transactions'),
      pool.query('SELECT COUNT(*) as total FROM attachments'),
      pool.query(`
        SELECT COUNT(*) as total, COALESCE(AVG(rating), 0) as average_rating
        FROM feedback
        WHERE message IS NOT NULL AND TRIM(message) != ''
      `),
      pool.query(`
        SELECT
          f.id,
          f.message,
          f.rating,
          f.created_at,
          COALESCE(NULLIF(f.contact_name, ''), u.full_name, 'Пользователь HomeSpace') as author_name
        FROM feedback f
        LEFT JOIN users u ON f.user_id = u.id
        WHERE f.message IS NOT NULL AND TRIM(f.message) != ''
        ORDER BY f.created_at DESC
        LIMIT 6
      `),
    ]);

    const taskStats = tasks[0] || {};
    const totalTasks = toNumber(taskStats.total);
    const completedTasks = toNumber(taskStats.completed);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      message: 'Public overview retrieved',
      data: {
        stats: {
          users: toNumber(users[0]?.total),
          families: toNumber(families[0]?.total),
          tasks: totalTasks,
          completedTasks,
          activeTasks: toNumber(taskStats.active),
          completionRate,
          transactions: toNumber(transactions[0]?.total),
          files: toNumber(files[0]?.total),
          feedback: toNumber(feedbackStats[0]?.total),
          averageRating: Number(feedbackStats[0]?.average_rating || 0),
        },
        feedback: recentFeedback.map((item) => ({
          id: item.id,
          authorName: item.author_name,
          message: item.message,
          rating: item.rating ? toNumber(item.rating) : null,
          createdAt: item.created_at,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

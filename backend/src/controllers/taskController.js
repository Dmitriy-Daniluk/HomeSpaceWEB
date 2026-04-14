const pool = require('../config/db');

exports.getTasks = async (req, res, next) => {
  try {
    const { familyId, status, executor, priority } = req.query;

    let query = `
      SELECT t.id, t.title, t.description, t.deadline, t.priority, t.status,
             t.creator_id, t.executor_id, t.user_id, t.created_at, t.updated_at,
             u.full_name as creator_name, e.full_name as executor_name
      FROM tasks t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN users e ON t.executor_id = e.id
    `;
    const params = [];

    if (familyId) {
      query += ' WHERE t.family_id = ?';
      params.push(familyId);
    } else {
      query += ' WHERE t.user_id = ? AND t.family_id IS NULL';
      params.push(req.user.id);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    if (executor) {
      query += ' AND t.executor_id = ?';
      params.push(executor);
    }
    if (priority) {
      query += ' AND t.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY t.deadline ASC, t.created_at DESC';

    const [tasks] = await pool.query(query, params);

    res.json({ message: 'Tasks retrieved', data: tasks });
  } catch (error) {
    next(error);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const { familyId } = req.query;
    const { title, description, deadline, priority, executorId } = req.body;

    const [result] = await pool.query(
      'INSERT INTO tasks (family_id, creator_id, executor_id, user_id, title, description, deadline, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [familyId || null, req.user.id, executorId || null, familyId ? null : req.user.id, title, description || null, deadline || null, priority || 'medium']
    );

    if (executorId) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [executorId, 'Новая задача', `Вам назначена задача: ${title}`, 'task']
      );
    }

    const [tasks] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);

    res.status(201).json({ message: 'Task created', data: tasks[0] });
  } catch (error) {
    next(error);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, deadline, priority, status, executorId } = req.body;

    const [existing] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = existing[0];

    if (task.family_id) {
      const [membership] = await pool.query(
        'SELECT * FROM family_members WHERE user_id = ? AND family_id = ?',
        [req.user.id, task.family_id]
      );
      if (membership.length === 0 && task.creator_id !== req.user.id) {
        return res.status(403).json({ error: 'Недостаточно прав' });
      }
    } else {
      if (task.creator_id !== req.user.id && task.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Недостаточно прав' });
      }
    }

    await pool.query(
      `UPDATE tasks SET 
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        deadline = COALESCE(?, deadline),
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        executor_id = COALESCE(?, executor_id)
       WHERE id = ?`,
      [title, description, deadline, priority, status, executorId, id]
    );

    const [tasks] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);

    res.json({ message: 'Task updated', data: tasks[0] });
  } catch (error) {
    next(error);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = existing[0];

    if (task.family_id) {
      const [membership] = await pool.query(
        'SELECT * FROM family_members WHERE user_id = ? AND family_id = ?',
        [req.user.id, task.family_id]
      );
      if (membership.length === 0 && task.creator_id !== req.user.id) {
        return res.status(403).json({ error: 'Недостаточно прав' });
      }
    } else {
      if (task.creator_id !== req.user.id && task.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Недостаточно прав' });
      }
    }

    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [id]);

    res.json({ message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getTaskStats = async (req, res, next) => {
  try {
    const { familyId } = req.query;

    if (familyId) {
      const [stats] = await pool.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_count,
          SUM(CASE WHEN priority = 'high' AND status != 'done' THEN 1 ELSE 0 END) as urgent_pending
         FROM tasks WHERE family_id = ?`,
        [familyId]
      );

      const [byExecutor] = await pool.query(
        `SELECT u.id, u.full_name, COUNT(*) as total,
          SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completed
         FROM tasks t
         LEFT JOIN users u ON t.executor_id = u.id
         WHERE t.family_id = ? AND t.executor_id IS NOT NULL
         GROUP BY u.id, u.full_name`,
        [familyId]
      );

      return res.json({ message: 'Task stats retrieved', data: { overall: stats[0], byExecutor } });
    }

    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_count,
        SUM(CASE WHEN priority = 'high' AND status != 'done' THEN 1 ELSE 0 END) as urgent_pending
       FROM tasks WHERE user_id = ? AND family_id IS NULL`,
      [req.user.id]
    );

    res.json({ message: 'Task stats retrieved', data: { overall: stats[0], byExecutor: [] } });
  } catch (error) {
    next(error);
  }
};

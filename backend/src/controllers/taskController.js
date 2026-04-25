const pool = require('../config/db');
const { normalizeMySqlDateTime } = require('../utils/dateTime');
const { normalizeUploadFileName } = require('../utils/fileName');

const ensureTaskAccess = async (userId, task) => {
  if (task.family_id) {
    const [membership] = await pool.query(
      'SELECT user_id FROM family_members WHERE user_id = ? AND family_id = ?',
      [userId, task.family_id]
    );
    return membership.length > 0;
  }

  return [task.creator_id, task.executor_id, task.user_id]
    .some((id) => Number(id) === Number(userId));
};

exports.getTasks = async (req, res, next) => {
  try {
    const { familyId, status, executor, priority } = req.query;

    let query = `
      SELECT t.id, t.family_id, t.title, t.description, t.deadline, t.priority, t.status,
             t.creator_id, t.executor_id, t.user_id, t.created_at, t.updated_at,
             u.full_name as creator_name, e.full_name as executor_name,
             COUNT(a.id) as attachment_count
      FROM tasks t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN users e ON t.executor_id = e.id
      LEFT JOIN attachments a ON a.related_task_id = t.id
    `;
    const params = [];

    if (familyId) {
      const [membership] = await pool.query(
        'SELECT user_id FROM family_members WHERE user_id = ? AND family_id = ?',
        [req.user.id, familyId]
      );
      if (membership.length === 0) {
        return res.status(403).json({ error: 'Not a member of this family' });
      }

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

    query += ` GROUP BY t.id, t.family_id, t.title, t.description, t.deadline, t.priority, t.status,
               t.creator_id, t.executor_id, t.user_id, t.created_at, t.updated_at,
               u.full_name, e.full_name
               ORDER BY t.deadline ASC, t.created_at DESC`;

    const [tasks] = await pool.query(query, params);

    res.json({ message: 'Tasks retrieved', data: tasks });
  } catch (error) {
    next(error);
  }
};

exports.getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [tasks] = await pool.query(
      `SELECT t.id, t.family_id, t.title, t.description, t.deadline, t.priority, t.status,
              t.creator_id, t.executor_id, t.user_id, t.created_at, t.updated_at,
              u.full_name as creator_name, e.full_name as executor_name
       FROM tasks t
       LEFT JOIN users u ON t.creator_id = u.id
       LEFT JOIN users e ON t.executor_id = e.id
       WHERE t.id = ?`,
      [id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[0];
    const canAccess = await ensureTaskAccess(req.user.id, task);
    if (!canAccess) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const [attachments] = await pool.query(
      `SELECT id, file_path, file_name, file_type, file_size, created_at
       FROM attachments
       WHERE related_task_id = ?
       ORDER BY created_at DESC`,
      [id]
    );

    const normalizedAttachments = attachments.map((attachment) => ({
      ...attachment,
      file_name: normalizeUploadFileName(attachment.file_name),
      fileName: normalizeUploadFileName(attachment.file_name),
    }));

    res.json({
      message: 'Task retrieved',
      data: { ...task, attachments: normalizedAttachments },
      attachments: normalizedAttachments,
    });
  } catch (error) {
    next(error);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const familyId = req.query.familyId || req.body.familyId || req.body.family_id;
    const { title, description, deadline, priority } = req.body;
    const executorId = req.body.executorId ?? req.body.executor_id;
    let normalizedDeadline;

    try {
      normalizedDeadline = normalizeMySqlDateTime(deadline);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid deadline' });
    }

    if (familyId) {
      const [membership] = await pool.query(
        'SELECT user_id FROM family_members WHERE user_id = ? AND family_id = ?',
        [req.user.id, familyId]
      );
      if (membership.length === 0) {
        return res.status(403).json({ error: 'Not a member of this family' });
      }
    }

    const [result] = await pool.query(
      'INSERT INTO tasks (family_id, creator_id, executor_id, user_id, title, description, deadline, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [familyId || null, req.user.id, executorId || null, familyId ? null : req.user.id, title, description || null, normalizedDeadline, priority || 'medium']
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
    const { title, description, deadline, priority, status } = req.body;
    const executorId = req.body.executorId ?? req.body.executor_id;

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

    const updates = [];
    const params = [];
    const hasOwn = (field) => Object.prototype.hasOwnProperty.call(req.body, field);

    if (hasOwn('title')) {
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Task title cannot be empty' });
      }
      updates.push('title = ?');
      params.push(title.trim());
    }
    if (hasOwn('description')) {
      updates.push('description = ?');
      params.push(description || null);
    }
    if (hasOwn('deadline')) {
      let normalizedDeadline;
      try {
        normalizedDeadline = normalizeMySqlDateTime(deadline);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid deadline' });
      }
      updates.push('deadline = ?');
      params.push(normalizedDeadline);
    }
    if (hasOwn('priority')) {
      if (!['low', 'medium', 'high'].includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority' });
      }
      updates.push('priority = ?');
      params.push(priority);
    }
    if (hasOwn('status')) {
      if (!['new', 'in_progress', 'done'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.push('status = ?');
      params.push(status);
    }
    if (hasOwn('executorId') || hasOwn('executor_id')) {
      updates.push('executor_id = ?');
      params.push(executorId || null);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
    }

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
      const [membership] = await pool.query(
        'SELECT user_id FROM family_members WHERE user_id = ? AND family_id = ?',
        [req.user.id, familyId]
      );
      if (membership.length === 0) {
        return res.status(403).json({ error: 'Not a member of this family' });
      }

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

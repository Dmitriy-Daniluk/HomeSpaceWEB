const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { encryptSecret } = require('../utils/vaultCrypto');
const { normalizeMySqlDateTime } = require('../utils/dateTime');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));

const taskSelect = `
  SELECT t.id, t.family_id, t.title, t.description, t.deadline, t.priority, t.status,
         t.creator_id, t.executor_id, t.user_id, t.created_at, t.updated_at,
         f.name as family_name,
         c.full_name as creator_name,
         e.full_name as executor_name,
         COUNT(a.id) as attachment_count
  FROM tasks t
  LEFT JOIN families f ON f.id = t.family_id
  LEFT JOIN users c ON c.id = t.creator_id
  LEFT JOIN users e ON e.id = t.executor_id
  LEFT JOIN attachments a ON a.related_task_id = t.id
`;

const taskGroupBy = `
  GROUP BY t.id, t.family_id, t.title, t.description, t.deadline, t.priority, t.status,
           t.creator_id, t.executor_id, t.user_id, t.created_at, t.updated_at,
           f.name, c.full_name, e.full_name
`;

const logAdminAction = async (req, action, entityType, entityId = null, details = {}) => {
  try {
    await pool.query(
      `INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user?.id || null, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Failed to write admin audit log:', error.message);
  }
};

const mapAdminPassword = (entry) => ({
  ...entry,
  service: entry.service_name,
  password: null,
  secret_value: null,
  has_secret: Boolean(entry.encrypted_password),
  owner_name: entry.owner_name || entry.full_name,
});

exports.getStats = async (req, res, next) => {
  try {
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [families] = await pool.query('SELECT COUNT(*) as count FROM families');
    const [tasks] = await pool.query('SELECT COUNT(*) as count FROM tasks');
    const [transactions] = await pool.query('SELECT COUNT(*) as count FROM transactions');
    const [files] = await pool.query('SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_size FROM attachments');
    const [support] = await pool.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count
       FROM support_tickets`
    );
    const [feedback] = await pool.query('SELECT COUNT(*) as count FROM feedback');
    const [activeSubscriptions] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE has_subscription = TRUE AND subscription_until > NOW()'
    );
    const [expiredSubscriptions] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE has_subscription = TRUE AND (subscription_until IS NULL OR subscription_until <= NOW())'
    );
    const [paymentTotals] = await pool.query(
      `SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'paid' AND created_at >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') THEN amount ELSE 0 END), 0) as month_revenue,
        COALESCE(SUM(CASE WHEN status = 'paid' AND YEAR(created_at) = YEAR(CURRENT_DATE()) THEN amount ELSE 0 END), 0) as year_revenue,
        COUNT(DISTINCT CASE WHEN status = 'paid' THEN user_id END) as paying_users
       FROM subscription_payments`
    );
    const [salesByMonth] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
              COUNT(*) as orders,
              COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as revenue
       FROM subscription_payments
       WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month ASC`
    );
    const [salesByPlan] = await pool.query(
      `SELECT plan, COUNT(*) as orders, COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as revenue
       FROM subscription_payments
       GROUP BY plan
       ORDER BY revenue DESC`
    );
    const [paidGrowth] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(DISTINCT user_id) as paid_users
       FROM subscription_payments
       WHERE status = 'paid' AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month ASC`
    );
    const [familyActivity] = await pool.query(
      `SELECT DATE_FORMAT(activity_at, '%Y-%m') as month, COUNT(DISTINCT family_id) as active_families
       FROM (
         SELECT family_id, created_at as activity_at FROM tasks WHERE family_id IS NOT NULL
         UNION ALL
         SELECT family_id, created_at as activity_at FROM transactions WHERE family_id IS NOT NULL
         UNION ALL
         SELECT family_id, created_at as activity_at FROM attachments WHERE family_id IS NOT NULL
         UNION ALL
         SELECT family_id, created_at as activity_at FROM chat_messages WHERE family_id IS NOT NULL
       ) activity
       WHERE activity_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(activity_at, '%Y-%m')
       ORDER BY month ASC`
    );
    const [problemFamilies] = await pool.query(
      `SELECT f.id, f.name,
              COALESCE(m.member_count, 0) as member_count,
              COALESCE(ot.overdue_tasks, 0) as overdue_tasks,
              COALESCE(st.open_tickets, 0) as open_tickets,
              la.last_activity_at
       FROM families f
       LEFT JOIN (
         SELECT family_id, COUNT(*) as member_count
         FROM family_members
         GROUP BY family_id
       ) m ON m.family_id = f.id
       LEFT JOIN (
         SELECT family_id, COUNT(*) as overdue_tasks
         FROM tasks
         WHERE deadline IS NOT NULL AND deadline < NOW() AND status != 'done'
         GROUP BY family_id
       ) ot ON ot.family_id = f.id
       LEFT JOIN (
         SELECT fm.family_id, COUNT(DISTINCT st.id) as open_tickets
         FROM support_tickets st
         JOIN family_members fm ON fm.user_id = st.user_id
         WHERE st.status IN ('open', 'in_progress')
         GROUP BY fm.family_id
       ) st ON st.family_id = f.id
       LEFT JOIN (
         SELECT family_id, MAX(activity_at) as last_activity_at
         FROM (
           SELECT family_id, created_at as activity_at FROM tasks WHERE family_id IS NOT NULL
           UNION ALL
           SELECT family_id, created_at as activity_at FROM transactions WHERE family_id IS NOT NULL
           UNION ALL
           SELECT family_id, created_at as activity_at FROM attachments WHERE family_id IS NOT NULL
           UNION ALL
           SELECT family_id, created_at as activity_at FROM chat_messages WHERE family_id IS NOT NULL
         ) activity
         GROUP BY family_id
       ) la ON la.family_id = f.id
       WHERE COALESCE(ot.overdue_tasks, 0) > 0
          OR COALESCE(st.open_tickets, 0) > 0
          OR la.last_activity_at IS NULL
          OR la.last_activity_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY overdue_tasks DESC, open_tickets DESC, la.last_activity_at ASC
       LIMIT 10`
    );
    const [vaultEntries] = await pool.query('SELECT COUNT(*) as count FROM password_vault');
    const [budgetTotals] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
       FROM transactions`
    );
    const [userGrowth] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as users
       FROM users
       WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month ASC`
    );
    const [familyGrowth] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as families
       FROM families
       WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month ASC`
    );

    const growthByMonth = new Map();
    userGrowth.forEach((row) => growthByMonth.set(row.month, { month: row.month, users: Number(row.users || 0), families: 0 }));
    familyGrowth.forEach((row) => {
      const current = growthByMonth.get(row.month) || { month: row.month, users: 0, families: 0 };
      current.families = Number(row.families || 0);
      growthByMonth.set(row.month, current);
    });

    const conversionByMonth = new Map();
    userGrowth.forEach((row) => conversionByMonth.set(row.month, {
      month: row.month,
      new_users: Number(row.users || 0),
      paid_users: 0,
      conversion_rate: 0,
    }));
    paidGrowth.forEach((row) => {
      const current = conversionByMonth.get(row.month) || {
        month: row.month,
        new_users: 0,
        paid_users: 0,
        conversion_rate: 0,
      };
      current.paid_users = Number(row.paid_users || 0);
      current.conversion_rate = current.new_users > 0 ? Math.round((current.paid_users / current.new_users) * 100) : 0;
      conversionByMonth.set(row.month, current);
    });

    const totalFamilyCount = Number(families[0].count || 0);

    const data = {
      users: users[0].count,
      families: families[0].count,
      tasks: tasks[0].count,
      transactions: transactions[0].count,
      totalUsers: users[0].count,
      totalFamilies: families[0].count,
      totalTasks: tasks[0].count,
      totalTransactions: transactions[0].count,
      totalFiles: files[0].count,
      totalStorageBytes: Number(files[0].total_size || 0),
      totalVaultEntries: Number(vaultEntries[0].count || 0),
      openTickets: Number(support[0].open_count || 0),
      resolvedTickets: Number(support[0].resolved_count || 0),
      totalTickets: Number(support[0].total || 0),
      totalFeedback: feedback[0].count,
      activeSubscriptions: activeSubscriptions[0].count,
      expiredSubscriptions: expiredSubscriptions[0].count,
      salesTotalRevenue: Number(paymentTotals[0].total_revenue || 0),
      salesMonthRevenue: Number(paymentTotals[0].month_revenue || 0),
      salesYearRevenue: Number(paymentTotals[0].year_revenue || 0),
      salesOrders: Number(paymentTotals[0].total_orders || 0),
      salesPayingUsers: Number(paymentTotals[0].paying_users || 0),
      salesArpu: Number(paymentTotals[0].paying_users || 0) > 0
        ? Math.round(Number(paymentTotals[0].total_revenue || 0) / Number(paymentTotals[0].paying_users || 0))
        : 0,
      budgetIncome: Number(budgetTotals[0].income || 0),
      budgetExpense: Number(budgetTotals[0].expense || 0),
      subscriptions: [
        { name: 'Активные', value: activeSubscriptions[0].count },
        { name: 'Истекшие', value: expiredSubscriptions[0].count },
        { name: 'Free', value: Math.max(Number(users[0].count) - Number(activeSubscriptions[0].count), 0) },
      ],
      growth: Array.from(growthByMonth.values()),
      salesByMonth: salesByMonth.map((row) => ({
        month: row.month,
        orders: Number(row.orders || 0),
        revenue: Number(row.revenue || 0),
      })),
      salesByPlan: salesByPlan.map((row) => ({
        name: row.plan === 'year' ? 'Год' : 'Месяц',
        plan: row.plan,
        orders: Number(row.orders || 0),
        revenue: Number(row.revenue || 0),
      })),
      conversionByMonth: Array.from(conversionByMonth.values()),
      familyRetention: familyActivity.map((row) => ({
        month: row.month,
        active_families: Number(row.active_families || 0),
        active_rate: totalFamilyCount > 0 ? Math.round((Number(row.active_families || 0) / totalFamilyCount) * 100) : 0,
      })),
      problemFamilies: problemFamilies.map((family) => ({
        ...family,
        member_count: Number(family.member_count || 0),
        overdue_tasks: Number(family.overdue_tasks || 0),
        open_tickets: Number(family.open_tickets || 0),
      })),
    };

    res.json({
      message: 'Admin stats retrieved',
      data,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};

exports.getRecentUsers = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.birth_date, u.avatar_url,
              u.has_subscription, u.subscription_until, u.created_at,
              COUNT(DISTINCT fm.family_id) as family_count,
              COUNT(DISTINCT t.id) as task_count,
              COUNT(DISTINCT tr.id) as transaction_count
       FROM users u
       LEFT JOIN family_members fm ON fm.user_id = u.id
       LEFT JOIN tasks t ON t.creator_id = u.id OR t.executor_id = u.id OR t.user_id = u.id
       LEFT JOIN transactions tr ON tr.user_id = u.id
       GROUP BY u.id, u.email, u.full_name, u.phone, u.birth_date, u.avatar_url,
                u.has_subscription, u.subscription_until, u.created_at
       ORDER BY u.created_at DESC`
    );

    res.json({
      message: 'Recent users retrieved',
      data: users.map((user) => ({ ...user, fullName: user.full_name })),
    });
  } catch (error) {
    next(error);
  }
};

exports.getRecentFamilies = async (req, res, next) => {
  try {
    const [families] = await pool.query(
      `SELECT f.id, f.name, f.description, f.savings_goal, f.invite_code, f.created_at,
        COALESCE(m.member_count, 0) as member_count,
        COALESCE(t.task_count, 0) as task_count,
        COALESCE(tr.transaction_count, 0) as transaction_count,
        COALESCE(a.file_count, 0) as file_count,
        COALESCE(tr.income, 0) as income,
        COALESCE(tr.expense, 0) as expense
       FROM families f
       LEFT JOIN (
         SELECT family_id, COUNT(*) as member_count
         FROM family_members
         GROUP BY family_id
       ) m ON m.family_id = f.id
       LEFT JOIN (
         SELECT family_id, COUNT(*) as task_count
         FROM tasks
         GROUP BY family_id
       ) t ON t.family_id = f.id
       LEFT JOIN (
         SELECT family_id,
                COUNT(*) as transaction_count,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
         FROM transactions
         GROUP BY family_id
       ) tr ON tr.family_id = f.id
       LEFT JOIN (
         SELECT family_id, COUNT(*) as file_count
         FROM attachments
         GROUP BY family_id
       ) a ON a.family_id = f.id
       ORDER BY f.created_at DESC`
    );

    res.json({ message: 'Recent families retrieved', data: families });
  } catch (error) {
    next(error);
  }
};

exports.getSubscriptionPayments = async (req, res, next) => {
  try {
    const [payments] = await pool.query(
      `SELECT sp.id, sp.user_id, sp.plan, sp.amount, sp.currency, sp.payment_method,
              sp.status, sp.provider_payment_id, sp.paid_at, sp.created_at,
              u.email, u.full_name
       FROM subscription_payments sp
       LEFT JOIN users u ON u.id = sp.user_id
       ORDER BY sp.created_at DESC
       LIMIT 300`
    );

    res.json({ message: 'Subscription payments retrieved', data: payments });
  } catch (error) {
    next(error);
  }
};

exports.getAdminPasswords = async (req, res, next) => {
  try {
    const [passwords] = await pool.query(
      `SELECT p.id, p.family_id, p.user_id, p.service_name, p.login, p.encrypted_password,
              p.url, p.notes, p.visibility_level, p.created_at, p.updated_at,
              u.email as owner_email, u.full_name as owner_name,
              f.name as family_name
       FROM password_vault p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN families f ON f.id = p.family_id
       ORDER BY p.updated_at DESC, p.created_at DESC
       LIMIT 500`
    );

    await logAdminAction(req, 'view_passwords', 'password_vault', null, { count: passwords.length });
    res.json({ message: 'Admin passwords retrieved', data: passwords.map(mapAdminPassword) });
  } catch (error) {
    next(error);
  }
};

exports.updateAdminPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const serviceName = req.body.serviceName ?? req.body.service_name;
    const password = req.body.password ?? req.body.encryptedPassword ?? req.body.encrypted_password;
    const { login, url, notes } = req.body;
    const visibilityLevel = req.body.visibilityLevel ?? req.body.visibility_level;

    const [existing] = await pool.query('SELECT * FROM password_vault WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Password entry not found' });
    }

    const updates = [];
    const params = [];
    const hasOwn = (field) => Object.prototype.hasOwnProperty.call(req.body, field);

    if (serviceName !== undefined) {
      if (!String(serviceName).trim()) return res.status(400).json({ error: 'Service name required' });
      updates.push('service_name = ?');
      params.push(String(serviceName).trim());
    }
    if (hasOwn('login')) {
      updates.push('login = ?');
      params.push(login || null);
    }
    if (password !== undefined) {
      if (!String(password)) {
        return res.status(400).json({ error: 'Password secret cannot be empty' });
      }
      updates.push('encrypted_password = ?');
      params.push(encryptSecret(password));
    }
    if (hasOwn('url')) {
      updates.push('url = ?');
      params.push(url || null);
    }
    if (hasOwn('notes')) {
      updates.push('notes = ?');
      params.push(notes || null);
    }
    if (visibilityLevel !== undefined) {
      if (!['private', 'parents', 'family'].includes(visibilityLevel)) {
        return res.status(400).json({ error: 'Invalid visibility level' });
      }
      updates.push('visibility_level = ?');
      params.push(visibilityLevel);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    await pool.query(`UPDATE password_vault SET ${updates.join(', ')} WHERE id = ?`, params);

    const [passwords] = await pool.query(
      `SELECT p.*, u.email as owner_email, u.full_name as owner_name, f.name as family_name
       FROM password_vault p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN families f ON f.id = p.family_id
       WHERE p.id = ?`,
      [id]
    );

    await logAdminAction(req, 'update_password', 'password_vault', Number(id), {
      service_name: passwords[0]?.service_name,
      changed_fields: updates.map((item) => item.split(' = ')[0]),
    });

    res.json({ message: 'Password entry updated', data: mapAdminPassword(passwords[0]) });
  } catch (error) {
    next(error);
  }
};

exports.deleteAdminPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT service_name FROM password_vault WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Password entry not found' });
    }

    await pool.query('DELETE FROM password_vault WHERE id = ?', [id]);
    await logAdminAction(req, 'delete_password', 'password_vault', Number(id), { service_name: existing[0].service_name });

    res.json({ message: 'Password entry deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getAdminFiles = async (req, res, next) => {
  try {
    const [files] = await pool.query(
      `SELECT a.id, a.family_id, a.uploader_id, a.file_path, a.file_name, a.file_type,
              a.file_size, a.related_task_id, a.related_transaction_id, a.created_at,
              f.name as family_name,
              u.email as uploader_email, u.full_name as uploader_name,
              t.title as task_title,
              tr.description as transaction_description
       FROM attachments a
       LEFT JOIN families f ON f.id = a.family_id
       LEFT JOIN users u ON u.id = a.uploader_id
       LEFT JOIN tasks t ON t.id = a.related_task_id
       LEFT JOIN transactions tr ON tr.id = a.related_transaction_id
       ORDER BY a.created_at DESC
       LIMIT 500`
    );

    res.json({ message: 'Admin files retrieved', data: files });
  } catch (error) {
    next(error);
  }
};

exports.updateAdminFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fileName = req.body.fileName ?? req.body.file_name;
    const fileType = req.body.fileType ?? req.body.file_type;
    const relatedTaskId = req.body.relatedTaskId ?? req.body.related_task_id;
    const relatedTransactionId = req.body.relatedTransactionId ?? req.body.related_transaction_id;

    const [existing] = await pool.query('SELECT * FROM attachments WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const updates = [];
    const params = [];
    const hasOwn = (field) => Object.prototype.hasOwnProperty.call(req.body, field);

    if (fileName !== undefined) {
      if (!String(fileName).trim()) return res.status(400).json({ error: 'File name required' });
      updates.push('file_name = ?');
      params.push(String(fileName).trim());
    }
    if (fileType !== undefined) {
      if (!['receipt', 'document', 'image', 'other'].includes(fileType)) {
        return res.status(400).json({ error: 'Invalid file type' });
      }
      updates.push('file_type = ?');
      params.push(fileType);
    }
    if (hasOwn('relatedTaskId') || hasOwn('related_task_id')) {
      updates.push('related_task_id = ?');
      params.push(relatedTaskId || null);
    }
    if (hasOwn('relatedTransactionId') || hasOwn('related_transaction_id')) {
      updates.push('related_transaction_id = ?');
      params.push(relatedTransactionId || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    await pool.query(`UPDATE attachments SET ${updates.join(', ')} WHERE id = ?`, params);

    const [files] = await pool.query(
      `SELECT a.*, f.name as family_name, u.email as uploader_email, u.full_name as uploader_name,
              t.title as task_title, tr.description as transaction_description
       FROM attachments a
       LEFT JOIN families f ON f.id = a.family_id
       LEFT JOIN users u ON u.id = a.uploader_id
       LEFT JOIN tasks t ON t.id = a.related_task_id
       LEFT JOIN transactions tr ON tr.id = a.related_transaction_id
       WHERE a.id = ?`,
      [id]
    );

    await logAdminAction(req, 'update_file', 'attachment', Number(id), {
      file_name: files[0]?.file_name,
      changed_fields: updates.map((item) => item.split(' = ')[0]),
    });

    res.json({ message: 'File updated', data: files[0] });
  } catch (error) {
    next(error);
  }
};

exports.deleteAdminFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [attachments] = await pool.query('SELECT * FROM attachments WHERE id = ?', [id]);
    if (attachments.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const attachment = attachments[0];
    const fullPath = path.join(uploadDir, path.basename(attachment.file_path));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await pool.query('DELETE FROM attachments WHERE id = ?', [id]);
    await logAdminAction(req, 'delete_file', 'attachment', Number(id), { file_name: attachment.file_name });

    res.json({ message: 'File deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getAdminTasks = async (req, res, next) => {
  try {
    const [tasks] = await pool.query(`${taskSelect} ${taskGroupBy} ORDER BY t.created_at DESC LIMIT 500`);
    res.json({ message: 'Admin tasks retrieved', data: tasks });
  } catch (error) {
    next(error);
  }
};

exports.updateAdminTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, deadline, priority, status } = req.body;
    const executorId = req.body.executorId ?? req.body.executor_id;

    const [existing] = await pool.query('SELECT id FROM tasks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updates = [];
    const params = [];
    const hasOwn = (field) => Object.prototype.hasOwnProperty.call(req.body, field);

    if (hasOwn('title')) {
      if (!title || !String(title).trim()) {
        return res.status(400).json({ error: 'Task title cannot be empty' });
      }
      updates.push('title = ?');
      params.push(String(title).trim());
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
      if (executorId) {
        const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [executorId]);
        if (users.length === 0) {
          return res.status(400).json({ error: 'Executor not found' });
        }
      }
      updates.push('executor_id = ?');
      params.push(executorId || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    await pool.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);

    const [tasks] = await pool.query(`${taskSelect} WHERE t.id = ? ${taskGroupBy}`, [id]);
    await logAdminAction(req, 'update_task', 'task', Number(id), {
      title: tasks[0]?.title,
      changed_fields: updates.map((item) => item.split(' = ')[0]),
    });
    res.json({ message: 'Task updated', data: tasks[0] });
  } catch (error) {
    next(error);
  }
};

exports.deleteAdminTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await logAdminAction(req, 'delete_task', 'task', Number(id));
    res.json({ message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const [logs] = await pool.query(
      `SELECT l.id, l.admin_user_id, l.action, l.entity_type, l.entity_id, l.details, l.created_at,
              u.email as admin_email, u.full_name as admin_name
       FROM admin_audit_logs l
       LEFT JOIN users u ON u.id = l.admin_user_id
       ORDER BY l.created_at DESC
       LIMIT 500`
    );

    res.json({ message: 'Admin audit logs retrieved', data: logs });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fullName = req.body.fullName ?? req.body.full_name;
    const { email, phone } = req.body;
    const hasSubscription = req.body.hasSubscription ?? req.body.has_subscription;
    const subscriptionUntil = req.body.subscriptionUntil ?? req.body.subscription_until;
    const newPassword = req.body.newPassword ?? req.body.new_password;

    const updates = [];
    const params = [];

    if (fullName !== undefined) {
      updates.push('full_name = ?');
      params.push(fullName || null);
    }
    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [normalizedEmail, id]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      updates.push('email = ?');
      params.push(normalizedEmail);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone || null);
    }
    if (hasSubscription !== undefined) {
      updates.push('has_subscription = ?');
      params.push(Boolean(hasSubscription));
    }
    if (subscriptionUntil !== undefined) {
      updates.push('subscription_until = ?');
      params.push(subscriptionUntil || null);
    }
    if (newPassword !== undefined) {
      if (String(newPassword).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      updates.push('password_hash = ?');
      params.push(await bcrypt.hash(newPassword, 10));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const [result] = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [users] = await pool.query(
      'SELECT id, email, full_name, phone, has_subscription, subscription_until, created_at FROM users WHERE id = ?',
      [id]
    );

    await logAdminAction(req, 'update_user', 'user', Number(id), {
      email: users[0]?.email,
      changed_fields: updates.map((item) => item.split(' = ')[0]),
    });

    res.json({ message: 'User updated', data: { ...users[0], fullName: users[0].full_name } });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    if (Number(id) === Number(req.user.id)) {
      return res.status(400).json({ error: 'Admin cannot delete current account' });
    }

    const [users] = await connection.query('SELECT email, full_name FROM users WHERE id = ?', [id]);

    await connection.beginTransaction();

    await connection.query('DELETE FROM attachments WHERE uploader_id = ?', [id]);
    await connection.query('DELETE FROM transactions WHERE user_id = ?', [id]);
    await connection.query('DELETE FROM tasks WHERE creator_id = ?', [id]);

    const [result] = await connection.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    await connection.commit();
    await logAdminAction(req, 'delete_user', 'user', Number(id), users[0] || {});
    res.json({ message: 'User deleted' });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

exports.updateFamily = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const savingsGoal = req.body.savingsGoal ?? req.body.savings_goal;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(String(name).trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description || null);
    }
    if (savingsGoal !== undefined) {
      updates.push('savings_goal = ?');
      params.push(Number(savingsGoal || 0));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const [result] = await pool.query(`UPDATE families SET ${updates.join(', ')} WHERE id = ?`, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }

    const [families] = await pool.query('SELECT * FROM families WHERE id = ?', [id]);
    await logAdminAction(req, 'update_family', 'family', Number(id), {
      name: families[0]?.name,
      changed_fields: updates.map((item) => item.split(' = ')[0]),
    });
    res.json({ message: 'Family updated', data: families[0] });
  } catch (error) {
    next(error);
  }
};

exports.deleteFamily = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [families] = await pool.query('SELECT name FROM families WHERE id = ?', [id]);
    const [result] = await pool.query('DELETE FROM families WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }

    await logAdminAction(req, 'delete_family', 'family', Number(id), families[0] || {});
    res.json({ message: 'Family deleted' });
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

exports.getSupportTickets = async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [];
    let where = '';

    if (status) {
      where = 'WHERE st.status = ?';
      params.push(status);
    }

    const [tickets] = await pool.query(
      `SELECT st.*, u.email, u.full_name
       FROM support_tickets st
       LEFT JOIN users u ON st.user_id = u.id
       ${where}
       ORDER BY st.created_at DESC
       LIMIT 100`,
      params
    );

    res.json({ message: 'Support tickets retrieved', data: tickets });
  } catch (error) {
    next(error);
  }
};

exports.updateSupportTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminResponse = req.body.adminResponse ?? req.body.admin_response;

    if (status && !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid ticket status' });
    }

    const [existing] = await pool.query('SELECT * FROM support_tickets WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    await pool.query(
      'UPDATE support_tickets SET status = COALESCE(?, status), admin_response = COALESCE(?, admin_response) WHERE id = ?',
      [status, adminResponse, id]
    );

    const [tickets] = await pool.query('SELECT * FROM support_tickets WHERE id = ?', [id]);
    await logAdminAction(req, 'update_support_ticket', 'support_ticket', Number(id), {
      status: status || existing[0].status,
      has_admin_response: Boolean(adminResponse),
    });
    res.json({ message: 'Ticket updated', data: tickets[0] });
  } catch (error) {
    next(error);
  }
};

exports.deleteSupportTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM support_tickets WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    await logAdminAction(req, 'delete_support_ticket', 'support_ticket', Number(id));
    res.json({ message: 'Ticket deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getFeedback = async (req, res, next) => {
  try {
    const [items] = await pool.query(
      `SELECT
         f.id,
         f.message,
         f.rating,
         f.created_at,
         COALESCE(NULLIF(f.contact_email, ''), u.email) as email,
         COALESCE(NULLIF(f.contact_name, ''), u.full_name) as full_name
       FROM feedback f
       LEFT JOIN users u ON f.user_id = u.id
       ORDER BY f.created_at DESC
       LIMIT 100`
    );

    res.json({ message: 'Feedback retrieved', data: items });
  } catch (error) {
    next(error);
  }
};

exports.deleteFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM feedback WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    await logAdminAction(req, 'delete_feedback', 'feedback', Number(id));
    res.json({ message: 'Feedback deleted' });
  } catch (error) {
    next(error);
  }
};

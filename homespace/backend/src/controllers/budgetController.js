const pool = require('../config/db');
const { PAGE_PERMISSIONS, getMembershipAccess } = require('../utils/rolePermissions');

const FREE_BUDGET_DAYS = 60;
const getFamilyId = (req) => req.query.familyId || req.body.familyId || req.body.family_id || null;
const getTransactionDate = (body) => body.transactionDate || body.transaction_date || new Date();

const toDateOnly = (date) => date.toISOString().slice(0, 10);

const getFreeBudgetStartDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - FREE_BUDGET_DAYS);
  return toDateOnly(date);
};

const resolveBudgetAccess = async ({ userId, period, startDate, endDate }) => {
  const [users] = await pool.query(
    'SELECT has_subscription, subscription_until FROM users WHERE id = ?',
    [userId]
  );
  const user = users[0] || {};
  const hasActiveSubscription = Boolean(
    user.has_subscription && (!user.subscription_until || new Date(user.subscription_until) > new Date())
  );
  const freeStartDate = getFreeBudgetStartDate();
  const requestedPeriod = period || 'all';
  const meta = {
    hasSubscription: hasActiveSubscription,
    retentionDays: hasActiveSubscription ? null : FREE_BUDGET_DAYS,
    requestedPeriod,
    effectivePeriod: requestedPeriod,
    limitedBySubscription: false,
    availableFrom: hasActiveSubscription ? null : freeStartDate,
  };

  if (hasActiveSubscription || requestedPeriod === 'month') {
    return { startDate, endDate, meta };
  }

  if (!startDate) {
    return {
      startDate: freeStartDate,
      endDate,
      meta: { ...meta, limitedBySubscription: true, effectivePeriod: `${FREE_BUDGET_DAYS}_days` },
    };
  }

  if (new Date(startDate) < new Date(freeStartDate)) {
    return {
      startDate: freeStartDate,
      endDate,
      meta: { ...meta, limitedBySubscription: true, effectivePeriod: `${FREE_BUDGET_DAYS}_days` },
    };
  }

  return { startDate, endDate, meta };
};

const buildBudgetWhere = ({ familyId, userId, period, startDate, endDate, type }) => {
  const conditions = [];
  const params = [];

  if (familyId) {
    conditions.push('t.family_id = ?');
    params.push(familyId);
  } else {
    conditions.push('t.user_id = ?');
    conditions.push('t.family_id IS NULL');
    params.push(userId);
  }

  if (period === 'month') {
    conditions.push('MONTH(t.transaction_date) = MONTH(CURRENT_DATE())');
    conditions.push('YEAR(t.transaction_date) = YEAR(CURRENT_DATE())');
  } else if (startDate && endDate) {
    conditions.push('t.transaction_date BETWEEN ? AND ?');
    params.push(startDate, endDate);
  } else if (startDate) {
    conditions.push('t.transaction_date >= ?');
    params.push(startDate);
  }

  if (type) {
    conditions.push('t.type = ?');
    params.push(type);
  }

  return { where: conditions.join(' AND '), params };
};

const ensureFamilyMember = async (userId, familyId) => {
  if (!familyId) return true;
  return getMembershipAccess(userId, familyId);
};

const ensureBudgetAccess = async (userId, familyId) => {
  const membership = await ensureFamilyMember(userId, familyId);
  if (!membership) return { error: { status: 403, message: 'Not a member of this family' } };
  if (membership !== true && !membership.permissions.includes(PAGE_PERMISSIONS.budget)) {
    return { error: { status: 403, message: 'Бюджет доступен родителю или участнику с разрешением роли.' } };
  }
  return { membership };
};

exports.getBudget = async (req, res, next) => {
  try {
    const { familyId, period, startDate, endDate, type } = req.query;

    if (familyId) {
      const access = await ensureBudgetAccess(req.user.id, familyId);
      if (access.error) return res.status(access.error.status).json({ error: access.error.message });
    }

    const access = await resolveBudgetAccess({ userId: req.user.id, period, startDate, endDate });

    const { where, params } = buildBudgetWhere({
      familyId,
      userId: req.user.id,
      period,
      startDate: access.startDate,
      endDate: access.endDate,
      type,
    });

    const [transactions] = await pool.query(
      `SELECT t.id, t.family_id, t.amount, t.type, t.category, t.description, t.transaction_date,
              u.full_name as user_name,
              COUNT(a.id) as attachment_count
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN attachments a ON a.related_transaction_id = t.id
       WHERE ${where}
       GROUP BY t.id, t.family_id, t.amount, t.type, t.category, t.description, t.transaction_date, u.full_name
       ORDER BY t.transaction_date DESC`,
      params
    );

    res.json({ message: 'Budget retrieved', data: transactions, meta: access.meta });
  } catch (error) {
    next(error);
  }
};

exports.addTransaction = async (req, res, next) => {
  try {
    const familyId = getFamilyId(req);
    const { amount, type, category, description } = req.body;
    const transactionDate = getTransactionDate(req.body);

    if (familyId) {
      const access = await ensureBudgetAccess(req.user.id, familyId);
      if (access.error) return res.status(access.error.status).json({ error: access.error.message });
    }

    const [result] = await pool.query(
      'INSERT INTO transactions (family_id, user_id, amount, type, category, description, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [familyId || null, req.user.id, amount, type, category || null, description || null, transactionDate]
    );

    const [transactions] = await pool.query('SELECT * FROM transactions WHERE id = ?', [result.insertId]);

    res.status(201).json({ message: 'Transaction added', data: transactions[0] });
  } catch (error) {
    next(error);
  }
};

exports.deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT user_id, family_id FROM transactions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = existing[0];
    if (tx.family_id) {
      const access = await ensureBudgetAccess(req.user.id, tx.family_id);
      if (access.error) return res.status(access.error.status).json({ error: access.error.message });
    }
    if (tx.user_id !== req.user.id) {
      const membership = await ensureFamilyMember(req.user.id, tx.family_id);
      if (!membership || membership.role !== 'parent') {
        return res.status(403).json({ error: 'Not authorized to delete this transaction' });
      }
    }

    const [result] = await pool.query('DELETE FROM transactions WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    next(error);
  }
};

exports.updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, type, category, description } = req.body;
    const transactionDate = getTransactionDate(req.body);

    const [existing] = await pool.query('SELECT user_id, family_id FROM transactions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = existing[0];
    if (tx.family_id) {
      const access = await ensureBudgetAccess(req.user.id, tx.family_id);
      if (access.error) return res.status(access.error.status).json({ error: access.error.message });
    }
    if (tx.user_id !== req.user.id) {
      const membership = await ensureFamilyMember(req.user.id, tx.family_id);
      if (!membership || membership.role !== 'parent') {
        return res.status(403).json({ error: 'Not authorized to edit this transaction' });
      }
    }

    await pool.query(
      'UPDATE transactions SET amount = ?, type = ?, category = ?, description = ?, transaction_date = ? WHERE id = ?',
      [amount, type, category || null, description || null, transactionDate, id]
    );

    const [transactions] = await pool.query('SELECT * FROM transactions WHERE id = ?', [id]);

    res.json({ message: 'Transaction updated', data: transactions[0] });
  } catch (error) {
    next(error);
  }
};

exports.getBudgetStats = async (req, res, next) => {
  try {
    const { familyId, period, startDate, endDate, type } = req.query;

    if (familyId) {
      const access = await ensureBudgetAccess(req.user.id, familyId);
      if (access.error) return res.status(access.error.status).json({ error: access.error.message });
    }

    const access = await resolveBudgetAccess({ userId: req.user.id, period, startDate, endDate });

    const { where, params } = buildBudgetWhere({
      familyId,
      userId: req.user.id,
      period,
      startDate: access.startDate,
      endDate: access.endDate,
      type,
    });

    const [totals] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as balance
       FROM transactions t WHERE ${where}`,
      params
    );

    const [byCategory] = await pool.query(
      `SELECT t.category, t.type, COUNT(*) as count, SUM(t.amount) as total
       FROM transactions t
       WHERE ${where} AND t.category IS NOT NULL
       GROUP BY t.category, t.type
       ORDER BY total DESC`,
      params
    );

    res.json({ message: 'Budget stats retrieved', data: { totals: totals[0], byCategory }, meta: access.meta });
  } catch (error) {
    next(error);
  }
};

exports.getSubscriptionData = async (req, res, next) => {
  try {
    const { familyId } = req.query;
    const access = await resolveBudgetAccess({ userId: req.user.id, period: 'all' });

    if (!access.meta.hasSubscription) {
      return res.status(403).json({
        error: 'Subscription required for all-time budget data',
        message: 'Subscription required for all-time budget data',
        meta: access.meta,
      });
    }

    if (familyId) {
      const access = await ensureBudgetAccess(req.user.id, familyId);
      if (access.error) return res.status(access.error.status).json({ error: access.error.message });

      const [data] = await pool.query(
        `SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) - 
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as balance,
          MIN(transaction_date) as first_transaction,
          MAX(transaction_date) as last_transaction
         FROM transactions WHERE family_id = ?`,
        [familyId]
      );

      const [monthly] = await pool.query(
        `SELECT 
          DATE_FORMAT(transaction_date, '%Y-%m') as month,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
         FROM transactions WHERE family_id = ?
         GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
         ORDER BY month DESC`,
        [familyId]
      );

      return res.json({ message: 'Subscription data retrieved', data: { overall: data[0], monthly }, meta: access.meta });
    }

    const [data] = await pool.query(
      `SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as balance,
        MIN(transaction_date) as first_transaction,
        MAX(transaction_date) as last_transaction
       FROM transactions WHERE user_id = ? AND family_id IS NULL`,
      [req.user.id]
    );

    const [monthly] = await pool.query(
      `SELECT 
        DATE_FORMAT(transaction_date, '%Y-%m') as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
       FROM transactions WHERE user_id = ? AND family_id IS NULL
       GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
       ORDER BY month DESC`,
      [req.user.id]
    );

    res.json({ message: 'Subscription data retrieved', data: { overall: data[0], monthly }, meta: access.meta });
  } catch (error) {
    next(error);
  }
};

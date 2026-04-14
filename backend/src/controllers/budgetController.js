const pool = require('../config/db');

exports.getBudget = async (req, res, next) => {
  try {
    const { familyId, period, startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];

    if (familyId) {
      params.push(familyId);
      if (period === 'month') {
        dateFilter = ' AND MONTH(transaction_date) = MONTH(CURRENT_DATE()) AND YEAR(transaction_date) = YEAR(CURRENT_DATE())';
      } else if (period === 'custom' && startDate && endDate) {
        dateFilter = ' AND transaction_date BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      const [transactions] = await pool.query(
        `SELECT t.id, t.amount, t.type, t.category, t.description, t.transaction_date,
                u.full_name as user_name
         FROM transactions t
         JOIN users u ON t.user_id = u.id
         WHERE t.family_id = ?${dateFilter}
         ORDER BY t.transaction_date DESC`,
        params
      );

      return res.json({ message: 'Budget retrieved', data: transactions });
    }

    if (period === 'month') {
      dateFilter = ' AND MONTH(transaction_date) = MONTH(CURRENT_DATE()) AND YEAR(transaction_date) = YEAR(CURRENT_DATE())';
    } else if (period === 'custom' && startDate && endDate) {
      dateFilter = ' AND transaction_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    params.push(req.user.id);

    const [transactions] = await pool.query(
      `SELECT t.id, t.amount, t.type, t.category, t.description, t.transaction_date,
              u.full_name as user_name
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       WHERE t.user_id = ? AND t.family_id IS NULL${dateFilter}
       ORDER BY t.transaction_date DESC`,
      params
    );

    res.json({ message: 'Budget retrieved', data: transactions });
  } catch (error) {
    next(error);
  }
};

exports.addTransaction = async (req, res, next) => {
  try {
    const { familyId } = req.query;
    const { amount, type, category, description, transactionDate } = req.body;

    const [result] = await pool.query(
      'INSERT INTO transactions (family_id, user_id, amount, type, category, description, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [familyId || null, req.user.id, amount, type, category || null, description || null, transactionDate || new Date()]
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
    const { amount, type, category, description, transactionDate } = req.body;

    const [existing] = await pool.query('SELECT user_id, family_id FROM transactions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = existing[0];
    if (tx.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this transaction' });
    }

    await pool.query(
      'UPDATE transactions SET amount = ?, type = ?, category = ?, description = ?, transaction_date = ? WHERE id = ?',
      [amount, type, category || null, description || null, transactionDate || new Date(), id]
    );

    const [transactions] = await pool.query('SELECT * FROM transactions WHERE id = ?', [id]);

    res.json({ message: 'Transaction updated', data: transactions[0] });
  } catch (error) {
    next(error);
  }
};

exports.getBudgetStats = async (req, res, next) => {
  try {
    const { familyId, period, startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];

    if (familyId) {
      params.push(familyId);
      if (period === 'month') {
        dateFilter = ' AND MONTH(transaction_date) = MONTH(CURRENT_DATE()) AND YEAR(transaction_date) = YEAR(CURRENT_DATE())';
      } else if (period === 'custom' && startDate && endDate) {
        dateFilter = ' AND transaction_date BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      const [totals] = await pool.query(
        `SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) - 
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as balance
         FROM transactions WHERE family_id = ?${dateFilter}`,
        params
      );

      const [byCategory] = await pool.query(
        `SELECT category, type, COUNT(*) as count, SUM(amount) as total
         FROM transactions WHERE family_id = ? AND category IS NOT NULL${dateFilter}
         GROUP BY category, type
         ORDER BY total DESC`,
        params
      );

      return res.json({ message: 'Budget stats retrieved', data: { totals: totals[0], byCategory } });
    }

    if (period === 'month') {
      dateFilter = ' AND MONTH(transaction_date) = MONTH(CURRENT_DATE()) AND YEAR(transaction_date) = YEAR(CURRENT_DATE())';
    } else if (period === 'custom' && startDate && endDate) {
      dateFilter = ' AND transaction_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    params.push(req.user.id);

    const [totals] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as balance
       FROM transactions WHERE user_id = ? AND family_id IS NULL${dateFilter}`,
      params
    );

    const [byCategory] = await pool.query(
      `SELECT category, type, COUNT(*) as count, SUM(amount) as total
       FROM transactions WHERE user_id = ? AND family_id IS NULL AND category IS NOT NULL${dateFilter}
       GROUP BY category, type
       ORDER BY total DESC`,
      params
    );

    res.json({ message: 'Budget stats retrieved', data: { totals: totals[0], byCategory } });
  } catch (error) {
    next(error);
  }
};

exports.getSubscriptionData = async (req, res, next) => {
  try {
    const { familyId } = req.query;

    if (familyId) {
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

      return res.json({ message: 'Subscription data retrieved', data: { overall: data[0], monthly } });
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

    res.json({ message: 'Subscription data retrieved', data: { overall: data[0], monthly } });
  } catch (error) {
    next(error);
  }
};

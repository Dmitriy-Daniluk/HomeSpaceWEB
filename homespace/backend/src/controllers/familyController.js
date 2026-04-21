const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

exports.createFamily = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const savingsGoal = req.body.savingsGoal ?? req.body.savings_goal;
    const inviteCode = crypto.randomBytes(6).toString('hex').toUpperCase();

    const [result] = await pool.query(
      'INSERT INTO families (name, description, savings_goal, invite_code) VALUES (?, ?, ?, ?)',
      [name, description || null, savingsGoal || 0, inviteCode]
    );

    await pool.query(
      'INSERT INTO family_members (user_id, family_id, role) VALUES (?, ?, ?)',
      [req.user.id, result.insertId, 'parent']
    );

    res.status(201).json({
      message: 'Family created',
      data: { id: result.insertId, name, inviteCode },
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyFamilies = async (req, res, next) => {
  try {
    const [families] = await pool.query(
      `SELECT f.id, f.name, f.description, f.savings_goal, f.invite_code, fm.role, f.created_at,
              u.has_subscription, u.subscription_until
       FROM families f
       JOIN family_members fm ON f.id = fm.family_id
       JOIN users u ON u.id = fm.user_id
       WHERE fm.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );

    const withMembers = await Promise.all(families.map(async (family) => {
      const [members] = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.full_name as fullName, u.avatar_url, u.avatar_url as avatarUrl,
                fm.role, fm.joined_at
         FROM family_members fm
         JOIN users u ON fm.user_id = u.id
         WHERE fm.family_id = ?
         ORDER BY fm.joined_at ASC`,
        [family.id]
      );

      return {
        ...family,
        members,
        member_count: members.length,
      };
    }));

    res.json({ message: 'Families retrieved', data: withMembers });
  } catch (error) {
    next(error);
  }
};

exports.getFamilyDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [families] = await pool.query('SELECT * FROM families WHERE id = ?', [id]);
    if (families.length === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }

    const [membership] = await pool.query(
      'SELECT role FROM family_members WHERE user_id = ? AND family_id = ?',
      [req.user.id, id]
    );

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Not a member of this family' });
    }

    const [members] = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.full_name as fullName, u.avatar_url, u.avatar_url as avatarUrl,
              fm.role, fm.joined_at
       FROM family_members fm
       JOIN users u ON fm.user_id = u.id
       WHERE fm.family_id = ?`,
      [id]
    );

    const membersWithStats = await Promise.all(
      members.map(async (member) => {
        const [personalBudget] = await pool.query(
          `SELECT 
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
           FROM transactions WHERE user_id = ? AND family_id IS NULL`,
          [member.id]
        );

        const [personalTasks] = await pool.query(
          `SELECT 
            COUNT(*) as total_tasks,
            SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed_tasks
           FROM tasks WHERE user_id = ? AND family_id IS NULL`,
          [member.id]
        );

        return {
          ...member,
          personal_stats: {
            budget: personalBudget[0],
            tasks: personalTasks[0],
          },
        };
      })
    );

    const [pendingTasks] = await pool.query(
      `SELECT t.id, t.title, t.status, t.priority, t.deadline, u.full_name as executor_name
       FROM tasks t
       LEFT JOIN users u ON t.executor_id = u.id
       WHERE t.family_id = ? AND t.status != 'done'
       ORDER BY t.deadline ASC`,
      [id]
    );

    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        COUNT(DISTINCT executor_id) as active_members
       FROM tasks WHERE family_id = ?`,
      [id]
    );

    const [budget] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_saved
       FROM transactions WHERE family_id = ?`,
      [id]
    );

    const family = {
      ...families[0],
      role: membership[0].role,
      current_user_id: req.user.id,
      members: membersWithStats,
      member_count: membersWithStats.length,
      pendingTasks,
      pending_tasks: pendingTasks,
      pending_tasks_today: pendingTasks.length,
      stats: stats[0],
      total_saved: Number(budget[0]?.total_saved || 0),
    };

    res.json({
      message: 'Family details retrieved',
      data: { ...family, family: families[0] },
    });
  } catch (error) {
    next(error);
  }
};

exports.getFamilyOverview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [families] = await pool.query('SELECT * FROM families WHERE id = ?', [id]);
    if (families.length === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }

    const [membership] = await pool.query(
      'SELECT role FROM family_members WHERE user_id = ? AND family_id = ?',
      [req.user.id, id]
    );
    if (membership.length === 0) {
      return res.status(403).json({ error: 'Not a member of this family' });
    }

    const [members] = await pool.query(
      `SELECT u.id, u.full_name, u.full_name as fullName, u.avatar_url, fm.role
       FROM family_members fm
       JOIN users u ON u.id = fm.user_id
       WHERE fm.family_id = ?
       ORDER BY fm.joined_at ASC`,
      [id]
    );

    const [taskStats] = await pool.query(
      `SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status != 'done' THEN 1 ELSE 0 END) as open_tasks,
        SUM(CASE
          WHEN status != 'done'
            AND deadline >= CURRENT_DATE()
            AND deadline < DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)
          THEN 1 ELSE 0 END) as due_today
       FROM tasks
       WHERE family_id = ?`,
      [id]
    );

    const [budgetMonth] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as balance
       FROM transactions
       WHERE family_id = ?
         AND MONTH(transaction_date) = MONTH(CURRENT_DATE())
         AND YEAR(transaction_date) = YEAR(CURRENT_DATE())`,
      [id]
    );

    const [budgetAllTime] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as balance
       FROM transactions
       WHERE family_id = ?`,
      [id]
    );

    const [fileStats] = await pool.query(
      `SELECT file_type, COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_size
       FROM attachments
       WHERE family_id = ?
       GROUP BY file_type`,
      [id]
    );

    const [topPerformers] = await pool.query(
      `SELECT u.id, u.full_name, u.full_name as fullName,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completed_tasks
       FROM tasks t
       JOIN users u ON u.id = t.executor_id
       WHERE t.family_id = ?
         AND t.created_at >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
       GROUP BY u.id, u.full_name
       ORDER BY completed_tasks DESC, total_tasks DESC
       LIMIT 5`,
      [id]
    );

    const family = families[0];
    const saved = Number(budgetAllTime[0]?.balance || 0);
    const savingsGoal = Number(family.savings_goal || 0);

    res.json({
      message: 'Family overview retrieved',
      data: {
        family: {
          ...family,
          role: membership[0].role,
          current_user_id: req.user.id,
        },
        members,
        metrics: {
          tasks: taskStats[0],
          budget_month: budgetMonth[0],
          budget_all_time: budgetAllTime[0],
          storage: fileStats,
          productivity: topPerformers,
          savings: {
            goal: savingsGoal,
            saved,
            progress: savingsGoal > 0 ? Math.min(Math.round((saved / savingsGoal) * 100), 100) : 0,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.inviteMember = async (req, res, next) => {
  try {
    const familyId = req.params.familyId || req.params.id;
    const { email } = req.body;
    const role = req.body.role === 'parent' ? 'parent' : 'child';

    const [members] = await pool.query(
      'SELECT role FROM family_members WHERE user_id = ? AND family_id = ?',
      [req.user.id, familyId]
    );

    if (members.length === 0 || members[0].role !== 'parent') {
      return res.status(403).json({ error: 'Only parents can invite members' });
    }

    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [existing] = await pool.query(
      'SELECT * FROM family_members WHERE user_id = ? AND family_id = ?',
      [users[0].id, familyId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'User is already a member' });
    }

    await pool.query(
      'INSERT INTO family_members (user_id, family_id, role) VALUES (?, ?, ?)',
      [users[0].id, familyId, role]
    );

    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [users[0].id, 'Family Invitation', `You have been added to a family`, 'system']
    );

    res.json({ message: 'Member invited', data: { userId: users[0].id } });
  } catch (error) {
    next(error);
  }
};

exports.createChildAccount = async (req, res, next) => {
  try {
    const familyId = req.params.familyId || req.params.id;
    const fullName = req.body.fullName || req.body.full_name;
    const { email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'fullName, email and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const [requester] = await pool.query(
      'SELECT role FROM family_members WHERE user_id = ? AND family_id = ?',
      [req.user.id, familyId]
    );

    if (requester.length === 0 || requester[0].role !== 'parent') {
      return res.status(403).json({ error: 'Only parents can create child accounts' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)',
        [normalizedEmail, passwordHash, fullName]
      );
      await connection.query(
        'INSERT INTO family_members (user_id, family_id, role) VALUES (?, ?, ?)',
        [result.insertId, familyId, 'child']
      );
      await connection.commit();

      res.status(201).json({
        message: 'Child account created',
        data: {
          id: result.insertId,
          email: normalizedEmail,
          full_name: fullName,
          fullName,
          role: 'child',
        },
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

exports.joinByCode = async (req, res, next) => {
  try {
    const { inviteCode, role } = req.body;
    const normalizedCode = String(inviteCode || '').trim().toUpperCase();

    const [families] = await pool.query('SELECT id FROM families WHERE invite_code = ?', [normalizedCode]);
    if (families.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const familyId = families[0].id;

    const [existing] = await pool.query(
      'SELECT * FROM family_members WHERE user_id = ? AND family_id = ?',
      [req.user.id, familyId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Already a member of this family' });
    }

    await pool.query(
      'INSERT INTO family_members (user_id, family_id, role) VALUES (?, ?, ?)',
      [req.user.id, familyId, role === 'parent' ? 'parent' : 'child']
    );

    res.json({ message: 'Joined family', data: { familyId } });
  } catch (error) {
    next(error);
  }
};

exports.updateFamily = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const savingsGoal = req.body.savingsGoal ?? req.body.savings_goal;

    const [members] = await pool.query(
      'SELECT role FROM family_members WHERE user_id = ? AND family_id = ?',
      [req.user.id, id]
    );

    if (members.length === 0 || members[0].role !== 'parent') {
      return res.status(403).json({ error: 'Only parents can update family' });
    }

    await pool.query(
      'UPDATE families SET name = COALESCE(?, name), description = COALESCE(?, description), savings_goal = COALESCE(?, savings_goal) WHERE id = ?',
      [name, description, savingsGoal, id]
    );

    const [families] = await pool.query('SELECT * FROM families WHERE id = ?', [id]);

    res.json({ message: 'Family updated', data: families[0] });
  } catch (error) {
    next(error);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const familyId = req.params.familyId || req.params.id;
    const { userId } = req.params;

    const [members] = await pool.query(
      'SELECT role FROM family_members WHERE user_id = ? AND family_id = ?',
      [req.user.id, familyId]
    );

    if (members.length === 0 || members[0].role !== 'parent') {
      return res.status(403).json({ error: 'Only parents can remove members' });
    }

    await pool.query(
      'DELETE FROM family_members WHERE user_id = ? AND family_id = ?',
      [userId, familyId]
    );

    res.json({ message: 'Member removed' });
  } catch (error) {
    next(error);
  }
};

exports.updateMemberRole = async (req, res, next) => {
  try {
    const familyId = req.params.familyId || req.params.id;
    const { userId } = req.params;
    const role = req.body.role === 'parent' ? 'parent' : req.body.role === 'child' ? 'child' : null;

    if (!role) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const [requester] = await pool.query(
      'SELECT role FROM family_members WHERE user_id = ? AND family_id = ?',
      [req.user.id, familyId]
    );

    if (requester.length === 0 || requester[0].role !== 'parent') {
      return res.status(403).json({ error: 'Only parents can update roles' });
    }

    const [target] = await pool.query(
      'SELECT role FROM family_members WHERE user_id = ? AND family_id = ?',
      [userId, familyId]
    );

    if (target.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (String(userId) === String(req.user.id) && role !== 'parent') {
      const [parents] = await pool.query(
        'SELECT COUNT(*) as count FROM family_members WHERE family_id = ? AND role = ?',
        [familyId, 'parent']
      );

      if (Number(parents[0].count) <= 1) {
        return res.status(400).json({ error: 'At least one parent must remain in the family' });
      }
    }

    await pool.query(
      'UPDATE family_members SET role = ? WHERE user_id = ? AND family_id = ?',
      [role, userId, familyId]
    );

    res.json({ message: 'Member role updated', data: { userId: Number(userId), role } });
  } catch (error) {
    next(error);
  }
};

const crypto = require('crypto');
const pool = require('../config/db');

exports.createFamily = async (req, res, next) => {
  try {
    const { name, description, savingsGoal } = req.body;
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
      `SELECT f.id, f.name, f.description, f.savings_goal, f.invite_code, fm.role, f.created_at
       FROM families f
       JOIN family_members fm ON f.id = fm.family_id
       WHERE fm.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );

    res.json({ message: 'Families retrieved', data: families });
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

    const [members] = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.avatar_url, fm.role, fm.joined_at
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

    res.json({
      message: 'Family details retrieved',
      data: { family: families[0], members: membersWithStats, pendingTasks, stats: stats[0] },
    });
  } catch (error) {
    next(error);
  }
};

exports.inviteMember = async (req, res, next) => {
  try {
    const { familyId } = req.params;
    const { email, role } = req.body;

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
      [users[0].id, familyId, role || 'child']
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

exports.joinByCode = async (req, res, next) => {
  try {
    const { inviteCode, role } = req.body;

    const [families] = await pool.query('SELECT id FROM families WHERE invite_code = ?', [inviteCode]);
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
      [req.user.id, familyId, role || 'child']
    );

    res.json({ message: 'Joined family', data: { familyId } });
  } catch (error) {
    next(error);
  }
};

exports.updateFamily = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, savingsGoal } = req.body;

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
    const { familyId, userId } = req.params;

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

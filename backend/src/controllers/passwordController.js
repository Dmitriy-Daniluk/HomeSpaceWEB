const pool = require('../config/db');

exports.getPasswords = async (req, res, next) => {
  try {
    const { familyId } = req.query;

    if (!familyId) {
      return res.status(400).json({ error: 'familyId query param required' });
    }

    const [memberInfo] = await pool.query(
      'SELECT role FROM family_members WHERE user_id = ? AND family_id = ?',
      [req.user.id, familyId]
    );

    if (memberInfo.length === 0) {
      return res.status(403).json({ error: 'Not a member of this family' });
    }

    const role = memberInfo[0].role;
    let visibilityFilter = '';
    const params = [familyId];

    if (role === 'child') {
      visibilityFilter = ' AND (p.visibility_level = ? OR p.user_id = ?)';
      params.push('family', req.user.id);
    } else {
      visibilityFilter = ' AND (p.visibility_level != ? OR p.user_id = ?)';
      params.push('private', req.user.id);
    }

    const [passwords] = await pool.query(
      `SELECT p.id, p.service_name, p.login, p.encrypted_password, p.url, p.notes, 
              p.visibility_level, p.created_at, p.updated_at,
              u.full_name as owner_name
       FROM password_vault p
       JOIN users u ON p.user_id = u.id
       WHERE p.family_id = ?${visibilityFilter}
       ORDER BY p.service_name ASC`,
      params
    );

    res.json({ message: 'Passwords retrieved', data: passwords });
  } catch (error) {
    next(error);
  }
};

exports.savePassword = async (req, res, next) => {
  try {
    const { familyId } = req.query;
    const { serviceName, login, encryptedPassword, url, notes, visibilityLevel } = req.body;

    if (!familyId) {
      return res.status(400).json({ error: 'familyId query param required' });
    }

    const [result] = await pool.query(
      'INSERT INTO password_vault (family_id, user_id, service_name, login, encrypted_password, url, notes, visibility_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [familyId, req.user.id, serviceName, login || null, encryptedPassword, url || null, notes || null, visibilityLevel || 'private']
    );

    const [passwords] = await pool.query('SELECT * FROM password_vault WHERE id = ?', [result.insertId]);

    res.status(201).json({ message: 'Password saved', data: passwords[0] });
  } catch (error) {
    next(error);
  }
};

exports.getPassword = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [passwords] = await pool.query(
      `SELECT p.*, u.full_name as owner_name
       FROM password_vault p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (passwords.length === 0) {
      return res.status(404).json({ error: 'Password entry not found' });
    }

    const entry = passwords[0];

    if (entry.visibility_level === 'private' && entry.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ message: 'Password retrieved', data: entry });
  } catch (error) {
    next(error);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { serviceName, login, encryptedPassword, url, notes, visibilityLevel } = req.body;

    const [existing] = await pool.query('SELECT * FROM password_vault WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Password entry not found' });
    }

    if (existing[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can update' });
    }

    await pool.query(
      `UPDATE password_vault SET 
        service_name = COALESCE(?, service_name),
        login = COALESCE(?, login),
        encrypted_password = COALESCE(?, encrypted_password),
        url = COALESCE(?, url),
        notes = COALESCE(?, notes),
        visibility_level = COALESCE(?, visibility_level)
       WHERE id = ?`,
      [serviceName, login, encryptedPassword, url, notes, visibilityLevel, id]
    );

    const [passwords] = await pool.query('SELECT * FROM password_vault WHERE id = ?', [id]);

    res.json({ message: 'Password updated', data: passwords[0] });
  } catch (error) {
    next(error);
  }
};

exports.deletePassword = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM password_vault WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Password entry not found' });
    }

    if (existing[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can delete' });
    }

    await pool.query('DELETE FROM password_vault WHERE id = ?', [id]);

    res.json({ message: 'Password deleted' });
  } catch (error) {
    next(error);
  }
};

const pool = require('../config/db');
const { encryptSecret, decryptSecret } = require('../utils/vaultCrypto');

const FREE_PASSWORD_LIMIT = 5;

const hasActiveSubscription = (user) => Boolean(
  user?.has_subscription && (!user.subscription_until || new Date(user.subscription_until) > new Date())
);

const normalizePasswordPayload = (body = {}) => ({
  serviceName: body.serviceName || body.service_name || body.service,
  login: body.login,
  encryptedPassword: body.encryptedPassword || body.encrypted_password || body.password,
  url: body.url,
  notes: body.notes,
  visibilityLevel: body.visibilityLevel || body.visibility_level,
});

const mapPassword = (entry) => ({
  ...entry,
  service: entry.service_name,
  password: decryptSecret(entry.encrypted_password),
  encrypted_password: decryptSecret(entry.encrypted_password),
  fullName: entry.owner_name,
});

const ensureFamilyMember = async (userId, familyId) => {
  const [membership] = await pool.query(
    'SELECT role FROM family_members WHERE user_id = ? AND family_id = ?',
    [userId, familyId]
  );
  return membership.length > 0 ? membership[0] : null;
};

exports.getPasswords = async (req, res, next) => {
  try {
    const familyId = req.query.familyId || req.body.familyId || req.body.family_id;

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

    res.json({ message: 'Passwords retrieved', data: passwords.map(mapPassword) });
  } catch (error) {
    next(error);
  }
};

exports.savePassword = async (req, res, next) => {
  try {
    const familyId = req.query.familyId || req.body.familyId || req.body.family_id;
    const { serviceName, login, encryptedPassword, url, notes, visibilityLevel } = normalizePasswordPayload(req.body);

    if (!familyId) {
      return res.status(400).json({ error: 'familyId query param required' });
    }

    const membership = await ensureFamilyMember(req.user.id, familyId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this family' });
    }

    const [users] = await pool.query(
      'SELECT has_subscription, subscription_until FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!hasActiveSubscription(users[0])) {
      const [passwordCount] = await pool.query(
        'SELECT COUNT(*) as count FROM password_vault WHERE user_id = ?',
        [req.user.id]
      );
      if (Number(passwordCount[0].count || 0) >= FREE_PASSWORD_LIMIT) {
        return res.status(403).json({
          error: 'Subscription required for more password vault entries',
          message: `Free plan allows up to ${FREE_PASSWORD_LIMIT} password entries`,
          meta: { limit: FREE_PASSWORD_LIMIT, feature: 'password_vault' },
        });
      }
    }

    const [result] = await pool.query(
      'INSERT INTO password_vault (family_id, user_id, service_name, login, encrypted_password, url, notes, visibility_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [familyId, req.user.id, serviceName, login || null, encryptSecret(encryptedPassword), url || null, notes || null, visibilityLevel || 'private']
    );

    const [passwords] = await pool.query('SELECT * FROM password_vault WHERE id = ?', [result.insertId]);

    res.status(201).json({ message: 'Password saved', data: mapPassword(passwords[0]) });
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
    const membership = await ensureFamilyMember(req.user.id, entry.family_id);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this family' });
    }

    if (entry.visibility_level === 'private' && entry.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (entry.visibility_level === 'parents' && membership.role !== 'parent' && entry.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Parent access required' });
    }

    res.json({ message: 'Password retrieved', data: mapPassword(entry) });
  } catch (error) {
    next(error);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { serviceName, login, encryptedPassword, url, notes, visibilityLevel } = normalizePasswordPayload(req.body);

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
      [serviceName, login, encryptedPassword ? encryptSecret(encryptedPassword) : encryptedPassword, url, notes, visibilityLevel, id]
    );

    const [passwords] = await pool.query('SELECT * FROM password_vault WHERE id = ?', [id]);

    res.json({ message: 'Password updated', data: mapPassword(passwords[0]) });
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

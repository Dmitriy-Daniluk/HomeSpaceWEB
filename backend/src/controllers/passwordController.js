const pool = require('../config/db');
const { encryptSecret, tryDecryptSecret } = require('../utils/vaultCrypto');
const { PAGE_PERMISSIONS, getMembershipAccess } = require('../utils/rolePermissions');

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

const mapPassword = (entry) => {
  const secret = tryDecryptSecret(entry.encrypted_password);

  return {
    ...entry,
    service: entry.service_name,
    password: secret.ok ? secret.value : null,
    encrypted_password: secret.ok ? secret.value : null,
    secret_status: secret.ok ? 'ok' : 'unreadable',
    can_decrypt: secret.ok,
    decrypt_error: secret.ok ? null : 'Секрет нельзя расшифровать текущим ключом. Замените пароль в записи.',
    fullName: entry.owner_name,
  };
};

const ensureFamilyMember = async (userId, familyId) => {
  return getMembershipAccess(userId, familyId);
};

const ensurePasswordAccess = async (userId, familyId) => {
  const membership = await ensureFamilyMember(userId, familyId);
  if (!membership) return { error: { status: 403, message: 'Not a member of this family' } };
  if (!membership.permissions.includes(PAGE_PERMISSIONS.passwords)) {
    return { error: { status: 403, message: 'Пароли доступны родителю или участнику с разрешением роли.' } };
  }
  return { membership };
};

exports.getPasswords = async (req, res, next) => {
  try {
    const familyId = req.query.familyId || req.body.familyId || req.body.family_id;

    if (!familyId) {
      return res.status(400).json({ error: 'familyId query param required' });
    }

    const access = await ensurePasswordAccess(req.user.id, familyId);
    if (access.error) return res.status(access.error.status).json({ error: access.error.message });

    const role = access.membership.role;
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
    if (!membership.permissions.includes(PAGE_PERMISSIONS.passwords)) {
      return res.status(403).json({ error: 'Пароли доступны родителю или участнику с разрешением роли.' });
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
    if (!membership.permissions.includes(PAGE_PERMISSIONS.passwords)) {
      return res.status(403).json({ error: 'Пароли доступны родителю или участнику с разрешением роли.' });
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
    const updateAccess = await ensurePasswordAccess(req.user.id, existing[0].family_id);
    if (updateAccess.error) {
      return res.status(updateAccess.error.status).json({ error: updateAccess.error.message });
    }

    const updates = [];
    const params = [];
    const hasOwn = (field) => Object.prototype.hasOwnProperty.call(req.body, field);

    if (hasOwn('service') || hasOwn('serviceName') || hasOwn('service_name')) {
      if (!serviceName || !String(serviceName).trim()) {
        return res.status(400).json({ error: 'Service name required' });
      }
      updates.push('service_name = ?');
      params.push(String(serviceName).trim());
    }
    if (hasOwn('login')) {
      updates.push('login = ?');
      params.push(login || null);
    }
    if (hasOwn('password') || hasOwn('encryptedPassword') || hasOwn('encrypted_password')) {
      if (encryptedPassword && String(encryptedPassword).trim()) {
        updates.push('encrypted_password = ?');
        params.push(encryptSecret(encryptedPassword));
      }
    }
    if (hasOwn('url')) {
      updates.push('url = ?');
      params.push(url || null);
    }
    if (hasOwn('notes')) {
      updates.push('notes = ?');
      params.push(notes || null);
    }
    if (hasOwn('visibilityLevel') || hasOwn('visibility_level')) {
      if (!['private', 'parents', 'family'].includes(visibilityLevel)) {
        return res.status(400).json({ error: 'Invalid visibility' });
      }
      updates.push('visibility_level = ?');
      params.push(visibilityLevel);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE password_vault SET ${updates.join(', ')} WHERE id = ?`, params);
    }

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
    const deleteAccess = await ensurePasswordAccess(req.user.id, existing[0].family_id);
    if (deleteAccess.error) {
      return res.status(deleteAccess.error.status).json({ error: deleteAccess.error.message });
    }

    await pool.query('DELETE FROM password_vault WHERE id = ?', [id]);

    res.json({ message: 'Password deleted' });
  } catch (error) {
    next(error);
  }
};

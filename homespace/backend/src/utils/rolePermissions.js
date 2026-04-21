const pool = require('../config/db');

const PAGE_PERMISSIONS = Object.freeze({
  budget: 'budget.view',
  analytics: 'analytics.view',
  files: 'files.view',
  passwords: 'passwords.view',
  location: 'location.view',
});

const CUSTOM_ROLE_PERMISSIONS = Object.freeze(Object.values(PAGE_PERMISSIONS));

const hasActiveSubscription = (user) => Boolean(
  user?.has_subscription && (!user.subscription_until || new Date(user.subscription_until) > new Date())
);

const normalizePermissions = (permissions = []) => {
  const allowed = new Set(CUSTOM_ROLE_PERMISSIONS);
  return [...new Set(
    (Array.isArray(permissions) ? permissions : [])
      .map((permission) => String(permission || '').trim())
      .filter((permission) => allowed.has(permission))
  )];
};

const getRolePermissions = async (customRoleId) => {
  if (!customRoleId) return [];

  const [rows] = await pool.query(
    'SELECT permission FROM family_role_permissions WHERE family_role_id = ? ORDER BY permission ASC',
    [customRoleId]
  );

  return rows.map((row) => row.permission);
};

const setRolePermissions = async (customRoleId, permissions = []) => {
  const normalized = normalizePermissions(permissions);

  await pool.query('DELETE FROM family_role_permissions WHERE family_role_id = ?', [customRoleId]);

  if (normalized.length > 0) {
    await pool.query(
      'INSERT INTO family_role_permissions (family_role_id, permission) VALUES ?',
      [normalized.map((permission) => [customRoleId, permission])]
    );
  }

  return normalized;
};

const getMembershipAccess = async (userId, familyId) => {
  if (!familyId) return null;

  const [rows] = await pool.query(
    `SELECT fm.role, fm.custom_role_id, u.has_subscription, u.subscription_until
     FROM family_members fm
     JOIN users u ON u.id = fm.user_id
     WHERE fm.user_id = ? AND fm.family_id = ?`,
    [userId, familyId]
  );

  if (rows.length === 0) return null;

  const membership = rows[0];
  const permissions = membership.role === 'parent'
    ? CUSTOM_ROLE_PERMISSIONS
    : await getRolePermissions(membership.custom_role_id);

  return {
    ...membership,
    permissions,
    isParent: membership.role === 'parent',
    hasSubscription: hasActiveSubscription(membership),
  };
};

const hasFamilyPermission = async (userId, familyId, permission) => {
  const membership = await getMembershipAccess(userId, familyId);
  if (!membership) return false;
  if (membership.isParent) return true;
  return membership.permissions.includes(permission);
};

const getUserPermissionSummary = async (userId) => {
  const [memberships] = await pool.query(
    `SELECT fm.family_id, fm.role, fm.custom_role_id
     FROM family_members fm
     WHERE fm.user_id = ?`,
    [userId]
  );

  const permissionSet = new Set();
  const familyPermissions = [];

  for (const membership of memberships) {
    const permissions = membership.role === 'parent'
      ? CUSTOM_ROLE_PERMISSIONS
      : await getRolePermissions(membership.custom_role_id);

    permissions.forEach((permission) => permissionSet.add(permission));
    familyPermissions.push({
      familyId: membership.family_id,
      family_id: membership.family_id,
      role: membership.role,
      customRoleId: membership.custom_role_id,
      custom_role_id: membership.custom_role_id,
      permissions,
    });
  }

  return {
    permissions: [...permissionSet],
    familyPermissions,
    family_permissions: familyPermissions,
  };
};

module.exports = {
  PAGE_PERMISSIONS,
  CUSTOM_ROLE_PERMISSIONS,
  hasActiveSubscription,
  normalizePermissions,
  getRolePermissions,
  setRolePermissions,
  getMembershipAccess,
  hasFamilyPermission,
  getUserPermissionSummary,
};

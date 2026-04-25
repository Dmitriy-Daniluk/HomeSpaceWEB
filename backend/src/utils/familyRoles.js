const pool = require('../config/db');

const getFamilyRoleSummary = async (userId) => {
  const [memberships] = await pool.query(
    'SELECT role FROM family_members WHERE user_id = ?',
    [userId]
  );
  const roles = memberships.map((item) => item.role);

  return {
    roles,
    isChildOnly: roles.length > 0 && roles.every((role) => role === 'child'),
    hasParentRole: roles.includes('parent'),
  };
};

module.exports = { getFamilyRoleSummary };

const normalizeRole = (role) => (role === 'admin' ? 'admin' : 'user');

const serializeAuthUser = (user = {}) => {
  const role = normalizeRole(user.role);
  const isAdmin = role === 'admin';

  return {
    id: user.id,
    email: user.email,
    role,
    isAdmin,
    is_admin: isAdmin,
    fullName: user.full_name || user.fullName || null,
    full_name: user.full_name || user.fullName || null,
    avatarUrl: user.avatar_url || user.avatarUrl || null,
    avatar_url: user.avatar_url || user.avatarUrl || null,
    birthDate: user.birth_date || user.birthDate || null,
    birth_date: user.birth_date || user.birthDate || null,
    phone: user.phone || null,
    has_subscription: Boolean(user.has_subscription),
    hasSubscription: Boolean(user.has_subscription),
    subscription_until: user.subscription_until || null,
    subscriptionUntil: user.subscription_until || null,
    created_at: user.created_at || null,
  };
};

module.exports = { normalizeRole, serializeAuthUser };

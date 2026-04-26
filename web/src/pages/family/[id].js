import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Users, Mail, Copy, UserPlus, Settings, Trash2, Edit2, CheckSquare, Wallet, ArrowLeft, Target, Share2, FileText, Trophy, Crown, Palette, Plus } from 'lucide-react';
import api from '../../utils/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Loading from '../../components/ui/Loading';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const permissionOptions = [
  { value: 'budget.view', label: 'Бюджет' },
  { value: 'analytics.view', label: 'Аналитика' },
  { value: 'files.view', label: 'Файлы' },
  { value: 'passwords.view', label: 'Пароли' },
  { value: 'location.view', label: 'Геолокация' },
];

export default function FamilyPage() {
  const router = useRouter();
  const { id } = router.query;
  const [family, setFamily] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('child');
  const [inviteCode, setInviteCode] = useState('');
  const [childForm, setChildForm] = useState({ fullName: '', email: '', password: '' });
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [saving, setSaving] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState({});
  const [customRoleForm, setCustomRoleForm] = useState({ name: '', color: '#6366f1', permissions: [] });
  const [customRoleSaving, setCustomRoleSaving] = useState(false);
  const [deletingFamily, setDeletingFamily] = useState(false);

  const fetchFamily = useCallback(async ({ background = false } = {}) => {
    if (!id) return;

    if (!background) setLoading(true);
    try {
      const [res, overviewRes] = await Promise.all([
        api.get(`/families/${id}`),
        api.get(`/families/${id}/overview`).catch(() => null),
      ]);
      const payload = res.data.data || {};
      const nextFamily = payload.family ? { ...payload.family, ...payload } : payload;
      setFamily(nextFamily);
      setOverview(overviewRes?.data?.data || null);
      if (!showEditModal) {
        setEditName(nextFamily.name);
        setEditGoal(nextFamily.savings_goal || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!background) setLoading(false);
    }
  }, [id, showEditModal]);

  useEffect(() => {
    if (id) fetchFamily();
  }, [id, fetchFamily]);

  useAutoRefresh(() => fetchFamily({ background: true }), { enabled: Boolean(id) });

  const inviteMember = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/families/${id}/invite`, { email: inviteEmail, role: inviteRole });
      setInviteEmail('');
      setShowInviteModal(false);
      fetchFamily();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const createChildAccount = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/families/${id}/children`, childForm);
      setChildForm({ fullName: '', email: '', password: '' });
      setShowInviteModal(false);
      fetchFamily();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось создать аккаунт ребенка.');
    } finally {
      setSaving(false);
    }
  };

  const joinByCode = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/families/join', { inviteCode });
      setInviteCode('');
      setShowInviteModal(false);
      fetchFamily();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (userId) => {
    if (!window.confirm('Удалить участника?')) return;
    try {
      await api.delete(`/families/${id}/member/${userId}`);
      fetchFamily();
    } catch (err) {
      console.error(err);
    }
  };

  const updateMemberRole = async (userId, role, customRoleId) => {
    setRoleUpdating((prev) => ({ ...prev, [userId]: true }));
    try {
      const payload = { role };
      if (customRoleId !== undefined) {
        payload.customRoleId = customRoleId || null;
      }

      await api.put(`/families/${id}/member/${userId}/role`, {
        ...payload,
      });
      fetchFamily();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось изменить роль участника.');
    } finally {
      setRoleUpdating((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const createCustomRole = async (e) => {
    e.preventDefault();
    setCustomRoleSaving(true);
    try {
      await api.post(`/families/${id}/roles`, customRoleForm);
      setCustomRoleForm({ name: '', color: '#6366f1', permissions: [] });
      fetchFamily();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось создать роль.');
    } finally {
      setCustomRoleSaving(false);
    }
  };

  const deleteCustomRole = async (roleId) => {
    if (!window.confirm('Удалить кастомную роль? У участников она будет очищена.')) return;
    try {
      await api.delete(`/families/${id}/roles/${roleId}`);
      fetchFamily();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось удалить роль.');
    }
  };

  const toggleNewRolePermission = (permission) => {
    setCustomRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const toggleRolePermission = async (role, permission) => {
    if (!canManageCustomRoles) return;
    const current = role.permissions || [];
    const permissions = current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission];

    try {
      await api.put(`/families/${id}/roles/${role.id}`, { permissions });
      fetchFamily();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось обновить доступы роли.');
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put(`/families/${id}`, { name: editName, savings_goal: editGoal ? Number(editGoal) : undefined });
      setShowEditModal(false);
      fetchFamily();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const copyInviteCode = () => {
    if (family?.invite_code) {
      navigator.clipboard.writeText(family.invite_code);
    }
  };

  const deleteFamily = async () => {
    if (!window.confirm('Расформировать семью? Все связанные данные будут удалены без возможности восстановления.')) {
      return;
    }

    setDeletingFamily(true);
    try {
      await api.delete(`/families/${id}`);
      await router.push('/family');
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось расформировать семью.');
    } finally {
      setDeletingFamily(false);
    }
  };

  if (loading) return <Loading text="Загрузка семьи..." />;
  if (!family) return <EmptyState icon={Users} title="Семья не найдена" />;

  const savingsProgress = family.savings_goal > 0
    ? Math.min(((family.total_saved || 0) / family.savings_goal) * 100, 100)
    : 0;

  const pendingTasks = family.pending_tasks_today || 0;
  const metrics = overview?.metrics || {};
  const storageCount = (metrics.storage || []).reduce((sum, item) => sum + Number(item.count || 0), 0);
  const topPerformer = metrics.productivity?.[0];
  const isParent = family.role === 'parent';
  const customRoles = family.customRoles || family.custom_roles || [];
  const canManageCustomRoles = isParent && Boolean(family.currentUserHasSubscription || family.current_user_has_subscription);
  const currentCustomRole = customRoles.find((role) => Number(role.id) === Number(family.custom_role_id));
  const currentPermissions = new Set(isParent ? permissionOptions.map((item) => item.value) : (currentCustomRole?.permissions || []));
  const canOpenBudget = currentPermissions.has('budget.view');
  const canOpenFiles = currentPermissions.has('files.view');

  return (
    <>
      <Head><title>{family.name} — HomeSpace</title></Head>
      <div className="space-y-6 animate-fade-in">
        {/* Back */}
        <Link href="/family" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Все семьи
        </Link>

        {/* Header */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{family.name}</h1>
                  {family.description && <p className="text-gray-500 dark:text-gray-400 text-sm">{family.description}</p>}
                </div>
              </div>
            </div>
            {isParent && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)} icon={<Settings className="w-4 h-4" />}>
                  Настройки
                </Button>
                <Button variant="primary" size="sm" onClick={() => setShowInviteModal(true)} icon={<UserPlus className="w-4 h-4" />}>
                  Пригласить
                </Button>
              </div>
            )}
          </div>

          {/* Savings goal */}
          {family.savings_goal > 0 && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Target className="w-4 h-4" /> Цель накоплений
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {family.total_saved || 0} / {family.savings_goal.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${savingsProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{savingsProgress.toFixed(0)}% достигнуто</p>
            </div>
          )}
        </Card>

        {/* Quick Links */}
        <div className={`grid gap-4 ${isParent ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          <Link href={`/dashboard?familyId=${id}`} className="card hover:shadow-lg transition-all p-4 flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Задачи</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{pendingTasks} ожидающих</p>
            </div>
          </Link>
          {canOpenBudget && (
            <Link href={`/budget?familyId=${id}`} className="card hover:shadow-lg transition-all p-4 flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Бюджет</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Финансы семьи</p>
              </div>
            </Link>
          )}
          {isParent && (
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Код приглашения</p>
                <button
                  onClick={copyInviteCode}
                  className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                >
                  <Copy className="w-3 h-3" /> {family.invite_code || 'Нет кода'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Overview Metrics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.tasks?.due_today || pendingTasks}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Задач на сегодня</p>
            </div>
          </Card>
          {canOpenBudget && (
            <Card className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Number(metrics.budget_month?.balance || 0).toLocaleString('ru-RU')} ₽
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Баланс месяца</p>
              </div>
            </Card>
          )}
          {canOpenFiles && (
            <Card className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{storageCount}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Файлов в семье</p>
              </div>
            </Card>
          )}
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-gray-900 dark:text-white truncate">
                {topPerformer?.fullName || topPerformer?.full_name || 'Нет данных'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Активность месяца</p>
            </div>
          </Card>
        </div>

        {/* Custom Roles */}
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Palette className="w-5 h-5" /> Кастомные роли
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Базовые права остаются `Родитель` и `Ребенок`, а кастомная роль помогает понятно подписать участника семьи.
              </p>
              {!canManageCustomRoles && isParent && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  <Crown className="w-4 h-4" />
                  Управление кастомными ролями доступно с активной подпиской.
                </div>
              )}
            </div>
            {canManageCustomRoles && (
              <form onSubmit={createCustomRole} className="w-full lg:max-w-xl space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="color"
                    value={customRoleForm.color}
                    onChange={(e) => setCustomRoleForm({ ...customRoleForm, color: e.target.value })}
                    className="h-11 w-full sm:w-14 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-1"
                    aria-label="Цвет роли"
                  />
                  <Input
                    value={customRoleForm.name}
                    onChange={(e) => setCustomRoleForm({ ...customRoleForm, name: e.target.value })}
                    placeholder="Например: Няня"
                    required
                  />
                  <Button type="submit" variant="primary" loading={customRoleSaving} icon={<Plus className="w-4 h-4" />}>
                    Добавить
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {permissionOptions.map((permission) => (
                    <label key={permission.value} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      <input
                        type="checkbox"
                        checked={customRoleForm.permissions.includes(permission.value)}
                        onChange={() => toggleNewRolePermission(permission.value)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {permission.label}
                    </label>
                  ))}
                </div>
              </form>
            )}
          </div>
          <div className="mt-4 grid gap-3">
            {customRoles.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Кастомных ролей пока нет.</p>
            ) : (
              customRoles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: role.color || '#6366f1' }} />
                      {role.name}
                    </div>
                    {canManageCustomRoles && (
                      <button type="button" onClick={() => deleteCustomRole(role.id)} className="text-red-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {permissionOptions.map((permission) => (
                      <label key={permission.value} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={(role.permissions || []).includes(permission.value)}
                          onChange={() => toggleRolePermission(role, permission.value)}
                          disabled={!canManageCustomRoles}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                        />
                        {permission.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Members */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> Участники ({family.members?.length || 0})
          </h3>
          {family.members?.length === 0 ? (
            <EmptyState icon={Users} title="Нет участников" description="Пригласите членов семьи" />
          ) : (
            <div className="space-y-3">
              {family.members?.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                      {(member.full_name || 'U').charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{member.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isParent ? (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => updateMemberRole(member.id, e.target.value)}
                          disabled={roleUpdating[member.id]}
                          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="parent">Родитель</option>
                          <option value="child">Ребёнок</option>
                        </select>
                        <select
                          value={member.custom_role_id || ''}
                          onChange={(e) => updateMemberRole(member.id, member.role, e.target.value || null)}
                          disabled={!canManageCustomRoles || roleUpdating[member.id]}
                          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                          title={canManageCustomRoles ? 'Кастомная роль' : 'Доступно с подпиской'}
                        >
                          <option value="">Без роли</option>
                          {customRoles.map((role) => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <Badge variant={member.role === 'parent' ? 'warning' : 'default'} size="sm">
                          {member.role === 'parent' ? 'Родитель' : 'Участник'}
                        </Badge>
                        {member.custom_role_name && (
                          <Badge variant="info" size="sm">{member.custom_role_name}</Badge>
                        )}
                      </>
                    )}
                    {isParent && member.id !== family.current_user_id && (
                      <button
                        onClick={() => removeMember(member.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Invite Modal */}
        <Modal isOpen={isParent && showInviteModal} onClose={() => setShowInviteModal(false)} title="Пригласить участника">
          <div className="space-y-6">
            <form onSubmit={inviteMember} className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Пригласить по email</h4>
              <Input
                label="Email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                icon={<Mail className="w-4 h-4" />}
                required
              />
              <Badge variant="info" className="text-xs">Роль</Badge>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="child">Участник</option>
                <option value="parent">Родитель</option>
              </select>
              <Button type="submit" variant="primary" loading={saving} className="w-full" icon={<Mail className="w-4 h-4" />}>
                Отправить приглашение
              </Button>
            </form>

            {isParent && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                <form onSubmit={createChildAccount} className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Создать аккаунт ребенка</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Родитель создает логин и временный пароль. Роль в семье будет `Ребенок`.
                  </p>
                  <Input
                    label="Имя ребенка"
                    value={childForm.fullName}
                    onChange={(e) => setChildForm({ ...childForm, fullName: e.target.value })}
                    required
                  />
                  <Input
                    label="Email ребенка"
                    type="email"
                    value={childForm.email}
                    onChange={(e) => setChildForm({ ...childForm, email: e.target.value })}
                    required
                  />
                  <Input
                    label="Временный пароль"
                    type="password"
                    value={childForm.password}
                    onChange={(e) => setChildForm({ ...childForm, password: e.target.value })}
                    required
                  />
                  <Button type="submit" variant="secondary" loading={saving} className="w-full" icon={<UserPlus className="w-4 h-4" />}>
                    Создать ребенка
                  </Button>
                </form>
              </div>
            )}

            <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
              <form onSubmit={joinByCode} className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Вступить по коду</h4>
                <Input
                  label="Код приглашения"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Введите код"
                  icon={<Copy className="w-4 h-4" />}
                  required
                />
                <Button type="submit" variant="secondary" loading={saving} className="w-full">
                  Вступить
                </Button>
              </form>
            </div>
          </div>
        </Modal>

        {/* Edit Settings Modal */}
        <Modal isOpen={isParent && showEditModal} onClose={() => setShowEditModal(false)} title="Настройки семьи">
          <div className="space-y-4">
            <Input
              label="Название"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Название семьи"
            />
            <Input
              label="Цель накоплений (₽)"
              type="number"
              value={editGoal}
              onChange={(e) => setEditGoal(e.target.value)}
              placeholder="0"
            />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowEditModal(false)} className="flex-1">Отмена</Button>
              <Button variant="primary" onClick={saveSettings} loading={saving} className="flex-1" icon={<Edit2 className="w-4 h-4" />}>Сохранить</Button>
            </div>
            <Button
              variant="danger"
              onClick={deleteFamily}
              loading={deletingFamily}
              className="w-full"
              icon={<Trash2 className="w-4 h-4" />}
            >
              Расформировать семью
            </Button>
          </div>
        </Modal>
      </div>
    </>
  );
}

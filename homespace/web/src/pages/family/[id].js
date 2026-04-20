import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Users, Mail, Copy, UserPlus, Settings, Trash2, Edit2, CheckSquare, Wallet, ArrowLeft, Target, Share2, FileText, Trophy } from 'lucide-react';
import api from '../../utils/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Loading from '../../components/ui/Loading';

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

  useEffect(() => {
    if (id) fetchFamily();
  }, [id]);

  const fetchFamily = async () => {
    setLoading(true);
    try {
      const [res, overviewRes] = await Promise.all([
        api.get(`/families/${id}`),
        api.get(`/families/${id}/overview`).catch(() => null),
      ]);
      const payload = res.data.data || {};
      const nextFamily = payload.family ? { ...payload.family, ...payload } : payload;
      setFamily(nextFamily);
      setOverview(overviewRes?.data?.data || null);
      setEditName(nextFamily.name);
      setEditGoal(nextFamily.savings_goal || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const updateMemberRole = async (userId, role) => {
    setRoleUpdating((prev) => ({ ...prev, [userId]: true }));
    try {
      await api.put(`/families/${id}/member/${userId}/role`, { role });
      fetchFamily();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось изменить роль участника.');
    } finally {
      setRoleUpdating((prev) => ({ ...prev, [userId]: false }));
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

  if (loading) return <Loading text="Загрузка семьи..." />;
  if (!family) return <EmptyState icon={Users} title="Семья не найдена" />;

  const savingsProgress = family.savings_goal > 0
    ? Math.min(((family.total_saved || 0) / family.savings_goal) * 100, 100)
    : 0;

  const pendingTasks = family.pending_tasks_today || 0;
  const metrics = overview?.metrics || {};
  const storageCount = (metrics.storage || []).reduce((sum, item) => sum + Number(item.count || 0), 0);
  const topPerformer = metrics.productivity?.[0];

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
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)} icon={<Settings className="w-4 h-4" />}>
                Настройки
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowInviteModal(true)} icon={<UserPlus className="w-4 h-4" />}>
                Пригласить
              </Button>
            </div>
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
        <div className="grid sm:grid-cols-3 gap-4">
          <Link href={`/dashboard?familyId=${id}`} className="card hover:shadow-lg transition-all p-4 flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Задачи</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{pendingTasks} ожидающих</p>
            </div>
          </Link>
          <Link href={`/budget?familyId=${id}`} className="card hover:shadow-lg transition-all p-4 flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Бюджет</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Финансы семьи</p>
            </div>
          </Link>
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
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{storageCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Файлов в семье</p>
            </div>
          </Card>
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
                    {family.role === 'parent' ? (
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member.id, e.target.value)}
                        disabled={roleUpdating[member.id]}
                        className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="parent">Родитель</option>
                        <option value="child">Ребёнок</option>
                      </select>
                    ) : (
                      <Badge variant={member.role === 'parent' ? 'warning' : 'default'} size="sm">
                        {member.role === 'parent' ? 'Родитель' : 'Участник'}
                      </Badge>
                    )}
                    {family.role === 'parent' && member.id !== family.current_user_id && (
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
        <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Пригласить участника">
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

            {family.role === 'parent' && (
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
        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Настройки семьи">
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
          </div>
        </Modal>
      </div>
    </>
  );
}

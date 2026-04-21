import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { User, Camera, Edit2, Save, TrendingUp, TrendingDown, PiggyBank, Calendar, Phone, Mail, Users, Crown, Lock, CheckSquare, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Loading from '../components/ui/Loading';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [families, setFamilies] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', birth_date: '', phone: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchFamilies();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/profile');
      setProfile(res.data.data);
      setForm({
        full_name: res.data.data.full_name || '',
        birth_date: res.data.data.birth_date ? res.data.data.birth_date.split('T')[0] : '',
        phone: res.data.data.phone || '',
        email: res.data.data.email || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilies = async () => {
    try {
      const res = await api.get('/families');
      setFamilies(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put('/users/profile', form);
      setProfile(res.data.data);
      updateUser(res.data.data);
      setEditMode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await api.post('/users/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile((prev) => ({ ...prev, avatar_url: res.data.data.avatar_url }));
      updateUser({ avatar_url: res.data.data.avatar_url });
    } catch (err) {
      console.error(err);
    } finally {
      setAvatarUploading(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      window.alert('Новые пароли не совпадают.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/change-password', passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      window.alert('Пароль обновлен.');
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось изменить пароль.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading text="Загрузка профиля..." />;

  const stats = profile?.stats || {};
  const personalBudget = stats.personalBudget || { total_income: 0, total_expense: 0 };
  const familyBudget = stats.transactions || { total_income: 0, total_expense: 0 };
  const personalTasks = stats.personalTasks || { total_tasks: 0, completed_tasks: 0 };
  const familyTasks = stats.tasks || { total_tasks: 0, completed_tasks: 0 };
  const totalTasks = Number(personalTasks.total_tasks || 0) + Number(familyTasks.total_tasks || 0);
  const completedTasks = Number(personalTasks.completed_tasks || 0) + Number(familyTasks.completed_tasks || 0);
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <>
      <Head><title>Профиль — HomeSpace</title></Head>
      <div className="space-y-6 animate-fade-in">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-xl shadow-indigo-950/15 dark:border-indigo-900/50">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 via-white to-amber-200" />
          <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white/85">
                <ShieldCheck className="h-4 w-4" />
                Личный центр HomeSpace
              </div>
              <h1 className="text-3xl font-extrabold">Профиль</h1>
              <p className="mt-1 text-sm text-white/75">Управление аккаунтом, безопасностью и семейной статистикой</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xs text-white/60">Выполнение задач</p>
                <p className="text-2xl font-bold">{taskCompletionRate}%</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => editMode ? saveProfile() : setEditMode(true)}
                loading={saving}
                className={editMode ? 'bg-white text-indigo-700 hover:bg-indigo-50' : 'bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg shadow-black/10'}
                icon={editMode ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              >
                {editMode ? 'Сохранить' : 'Редактировать'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1 overflow-hidden p-0">
            <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <div className="-mt-12 px-6 pb-6 text-center">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold mx-auto ring-4 ring-white dark:ring-gray-800 shadow-lg">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover" />
                  ) : (
                    (profile?.full_name || 'U').charAt(0)
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition-colors ring-2 ring-white dark:ring-gray-800">
                  <Camera className="w-4 h-4 text-white" />
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={avatarUploading} />
                </label>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-4">{profile?.full_name}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{profile?.email}</p>

              {/* Subscription */}
              <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50">
                {profile?.has_subscription ? (
                  <div>
                    <Badge variant="success" dot>Подписка активна</Badge>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      До {new Date(profile.subscription_until).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                ) : (
                  <div>
                    <Badge variant="warning">Нет подписки</Badge>
                    <Link href="/subscription">
                      <Button variant="secondary" size="sm" className="mt-3 w-full border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200" icon={<Crown className="w-4 h-4" />}>
                        Купить подписку
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3 dark:border-indigo-900/50 dark:bg-indigo-900/20">
                  <p className="text-xs text-indigo-500 dark:text-indigo-300">Семей</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{families.length}</p>
                </div>
                <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3 dark:border-purple-900/50 dark:bg-purple-900/20">
                  <p className="text-xs text-purple-500 dark:text-purple-300">Задач</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{totalTasks}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-t-4 border-t-indigo-400">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Личные данные</h3>
              <div className="space-y-4">
                <Input
                  label="Полное имя"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  disabled={!editMode}
                  icon={<User className="w-4 h-4" />}
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Дата рождения"
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                    disabled={!editMode}
                    icon={<Calendar className="w-4 h-4" />}
                  />
                  <Input
                    label="Телефон"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    disabled={!editMode}
                    icon={<Phone className="w-4 h-4" />}
                  />
                </div>
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={!editMode}
                  icon={<Mail className="w-4 h-4" />}
                />
              </div>
            </Card>

            <Card className="border-t-4 border-t-violet-400">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-500" />
                Смена пароля
              </h3>
              <form onSubmit={changePassword} className="space-y-4">
                <Input
                  label="Текущий пароль"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Новый пароль"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                  />
                  <Input
                    label="Повторите пароль"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" variant="secondary" loading={saving} icon={<Lock className="w-4 h-4" />}>
                  Изменить пароль
                </Button>
              </form>
            </Card>

            {/* Personal Budget Stats */}
            <Card className="border-t-4 border-t-emerald-400">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" />
                Личный бюджет
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <TrendingUp className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{Number(personalBudget.total_income || 0).toLocaleString('ru-RU')} ₽</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Доход</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                  <TrendingDown className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{Number(personalBudget.total_expense || 0).toLocaleString('ru-RU')} ₽</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Расход</p>
                </div>
                <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                  <PiggyBank className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {(Number(personalBudget.total_income || 0) - Number(personalBudget.total_expense || 0)).toLocaleString('ru-RU')} ₽
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Баланс</p>
                </div>
              </div>
            </Card>

            {/* Family Budget Stats */}
            <Card className="border-t-4 border-t-purple-400">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                Семейный бюджет
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <TrendingUp className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{Number(familyBudget.total_income || 0).toLocaleString('ru-RU')} ₽</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Доход</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                  <TrendingDown className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{Number(familyBudget.total_expense || 0).toLocaleString('ru-RU')} ₽</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Расход</p>
                </div>
                <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                  <PiggyBank className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {(Number(familyBudget.total_income || 0) - Number(familyBudget.total_expense || 0)).toLocaleString('ru-RU')} ₽
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Баланс</p>
                </div>
              </div>
            </Card>

            {/* Tasks Stats */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="text-center border-l-4 border-l-indigo-400">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center justify-center gap-2">
                  <CheckSquare className="w-4 h-4" /> Личные задачи
                </h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{personalTasks.total_tasks || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Выполнено: {personalTasks.completed_tasks || 0}
                </p>
              </Card>
              <Card className="text-center border-l-4 border-l-purple-400">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center justify-center gap-2">
                  <CheckSquare className="w-4 h-4" /> Семейные задачи
                </h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{familyTasks.total_tasks || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Выполнено: {familyTasks.completed_tasks || 0}
                </p>
              </Card>
            </div>

            {/* Families */}
            <Card className="border-t-4 border-t-pink-400">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Семейные группы</h3>
              {families.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Вы не состоите ни в одной семье</p>
              ) : (
                <div className="space-y-3">
                  {families.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{f.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{f.members?.length || 0} участников</p>
                      </div>
                      <Badge variant="primary">{f.role || 'Участник'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

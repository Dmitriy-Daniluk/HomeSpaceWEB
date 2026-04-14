import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Users, Home, CheckSquare, Wallet, TrendingUp, BarChart3, UserPlus, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../utils/api';
import Card from '../components/ui/Card';
import Loading from '../components/ui/Loading';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [families, setFamilies] = useState([]);
  const [subscriptionData, setSubscriptionData] = useState([]);
  const [growthData, setGrowthData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, familiesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/families'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.slice(0, 10));
      setFamilies(familiesRes.data.slice(0, 10));
      setSubscriptionData(statsRes.data.subscriptions || [
        { name: 'Активные', value: statsRes.data.activeSubscriptions || 0 },
        { name: 'Истекшие', value: statsRes.data.expiredSubscriptions || 0 },
      ]);
      setGrowthData(statsRes.data.growth || [
        { month: 'Янв', users: 120, families: 45 },
        { month: 'Фев', users: 180, families: 65 },
        { month: 'Мар', users: 250, families: 90 },
        { month: 'Апр', users: 340, families: 120 },
        { month: 'Май', users: 420, families: 155 },
        { month: 'Июн', users: 510, families: 190 },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading text="Загрузка панели администратора..." />;

  return (
    <>
      <Head><title>Админ-панель — HomeSpace</title></Head>
      <div className="space-y-6 animate-fade-in hidden md:block">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Панель администратора</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Обзор платформы</p>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalUsers || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Пользователи</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Home className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalFamilies || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Семьи</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalTasks || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Задачи</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalTransactions || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Транзакции</p>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Рост платформы
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} name="Пользователи" />
                <Line type="monotone" dataKey="families" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} name="Семьи" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Подписки
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subscriptionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} name="Количество" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Tables */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Последние пользователи
            </h3>
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                      {(u.fullName || 'U').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{u.fullName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '-'}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Home className="w-5 h-5" /> Последние семьи
            </h3>
            <div className="space-y-3">
              {families.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{f.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{f.members?.length || 0} участников</p>
                  </div>
                  <span className="text-xs text-gray-400">{f.created_at ? new Date(f.created_at).toLocaleDateString('ru-RU') : '-'}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

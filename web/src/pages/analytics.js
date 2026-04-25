import { useState, useEffect } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, TrendingUp, Award, Download, FileText, FileSpreadsheet, Trophy } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../utils/api';
import { downloadPdf } from '../utils/pdfExport';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Loading from '../components/ui/Loading';
import EmptyState from '../components/ui/EmptyState';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

const normalizeRateRow = (row) => ({
  ...row,
  total_tasks: Number(row.total_tasks || row.total || 0),
  completed_tasks: Number(row.completed_tasks || row.completed || 0),
  completion_rate: Number(row.completion_rate || 0),
});

export default function AnalyticsPage() {
  const [families, setFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [productivity, setProductivity] = useState([]);
  const [completionRates, setCompletionRates] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) fetchData();
  }, [selectedFamilyId]);

  const fetchFamilies = async () => {
    try {
      const res = await api.get('/families');
      const data = res.data.data || [];
      const parentFamilies = data.filter((family) => (
        family.role === 'parent' ||
        (family.currentUserPermissions || family.current_user_permissions || []).includes('analytics.view')
      ));
      setFamilies(parentFamilies);
      if (parentFamilies.length > 0) setSelectedFamilyId(String(parentFamilies[0].id));
      if (parentFamilies.length === 0) setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const familyId = selectedFamilyId;
      const prodRes = await api.get('/analytics/productivity', { params: { familyId } });
      const data = prodRes.data.data || {};
      setProductivity((data.productivity || data.topPerformers || []).map(normalizeRateRow));
      setCompletionRates((data.completion_rates || data.topPerformers || []).map(normalizeRateRow));
      setMonthlyTrend((data.monthly_trend || data.monthlyRates || []).map(normalizeRateRow));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const topPerformer = completionRates.length > 0
    ? completionRates.reduce((a, b) => (Number(a.completion_rate) > Number(b.completion_rate) ? a : b))
    : null;
  const totalTasks = completionRates.reduce((sum, item) => sum + Number(item.total_tasks || 0), 0);
  const completedTasks = completionRates.reduce((sum, item) => sum + Number(item.completed_tasks || 0), 0);
  const averageCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const selectedFamily = families.find((family) => String(family.id) === String(selectedFamilyId));
  const hasExportAccess = Boolean(selectedFamily?.has_subscription);

  const exportPDF = () => {
    if (!hasExportAccess) {
      window.alert('Экспорт PDF доступен в подписке HomeSpace Plus.');
      return;
    }
    downloadPdf('analytics.pdf', {
      content: [
        { text: 'Аналитика - HomeSpace', style: 'title' },
        topPerformer
          ? { text: `Лучший исполнитель: ${topPerformer.executor_name || topPerformer.full_name || topPerformer.fullName} (${topPerformer.completion_rate}%)`, style: 'subtitle' }
          : { text: 'Лучший исполнитель: нет данных', style: 'subtitle' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Участник', style: 'tableHeader' },
                { text: 'Выполнено', style: 'tableHeader' },
                { text: 'Всего', style: 'tableHeader' },
                { text: 'Процент', style: 'tableHeader' },
              ],
              ...completionRates.map((c) => [
                c.executor_name || c.full_name || c.fullName || '-',
                c.completed_tasks || 0,
                c.total_tasks || 0,
                `${Number(c.completion_rate || 0).toFixed(1)}%`,
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
        },
      ],
    });
  };

  const exportExcel = () => {
    if (!hasExportAccess) {
      window.alert('Экспорт Excel доступен в подписке HomeSpace Plus.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(completionRates.map((c) => ({
      Сотрудник: c.executor_name,
      Выполнено: c.completed_tasks,
      Всего: c.total_tasks,
      Процент: `${Number(c.completion_rate || 0).toFixed(1)}%`,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Аналитика');
    XLSX.writeFile(wb, 'analytics.xlsx');
  };

  if (loading) return <Loading text="Загрузка аналитики..." />;

  if (families.length === 0) {
    return (
      <>
        <Head><title>Аналитика — HomeSpace</title></Head>
        <EmptyState icon={BarChart3} title="Аналитика доступна родителю" description="Обычный участник не может просматривать семейную аналитику." />
      </>
    );
  }

  return (
    <>
      <Head><title>Аналитика — HomeSpace</title></Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Аналитика</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Продуктивность и статистика</p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedFamilyId}
              onChange={(e) => setSelectedFamilyId(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {families.map((family) => (
                <option key={family.id} value={family.id}>{family.name}</option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={exportPDF} icon={<FileText className="w-4 h-4" />}>PDF</Button>
            <Button variant="secondary" size="sm" onClick={exportExcel} icon={<FileSpreadsheet className="w-4 h-4" />}>Excel</Button>
          </div>
        </div>

        <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
          <div className="grid lg:grid-cols-[220px_1fr] gap-6 items-center">
            <div className="relative mx-auto h-44 w-44 rounded-full p-3" style={{ background: `conic-gradient(#34d399 ${averageCompletion * 3.6}deg, rgba(255,255,255,0.12) 0deg)` }}>
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-950 shadow-inner">
                <span className="text-5xl font-black">{averageCompletion}%</span>
                <span className="mt-1 text-xs uppercase tracking-[0.25em] text-indigo-200">готово</span>
              </div>
            </div>
            <div>
              <Badge variant="success" className="mb-4">Процент выполнения</Badge>
              <h2 className="text-2xl font-bold">Семейный темп за выбранный период</h2>
              <p className="mt-2 max-w-2xl text-sm text-indigo-100/80">
                Выполнено {completedTasks} из {totalTasks} задач. Показатель считается по всем участникам семьи, включая тех, у кого пока нет назначенных задач.
              </p>
              <div className="mt-5 grid sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-bold">{totalTasks}</p>
                  <p className="text-xs text-indigo-100/70">Всего задач</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-bold">{completedTasks}</p>
                  <p className="text-xs text-indigo-100/70">Выполнено</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-bold">{completionRates.length}</p>
                  <p className="text-xs text-indigo-100/70">Участников</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Top Performer */}
        {topPerformer && (
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Лучший исполнитель</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{topPerformer.executor_name || topPerformer.full_name || topPerformer.fullName}</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">{Number(topPerformer.completion_rate || 0).toFixed(1)}% задач выполнено</p>
              </div>
            </div>
          </Card>
        )}

        {/* Productivity Bar Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Задачи по участникам
          </h3>
          {productivity.length === 0 ? (
            <EmptyState icon={BarChart3} title="Нет данных" description="Создайте задачи для отображения аналитики" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="executor_name" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="total_tasks" fill="#6366f1" radius={[8, 8, 0, 0]} name="Всего" />
                <Bar dataKey="completed_tasks" fill="#10b981" radius={[8, 8, 0, 0]} name="Выполнено" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Completion Rates + Monthly Trend */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" /> Процент выполнения
            </h3>
            {completionRates.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">Нет данных</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie data={completionRates} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="completion_rate">
                    {completionRates.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${Number(v || 0).toFixed(1)}%`} />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Тренд по месяцам
            </h3>
            {monthlyTrend.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">Нет данных</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="report_month" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip formatter={(v) => `${Number(v || 0).toFixed(1)}%`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="completion_rate" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} name="Процент" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, TrendingUp, Award, Download, FileText, FileSpreadsheet, Trophy } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import api from '../utils/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import EmptyState from '../components/ui/EmptyState';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

export default function AnalyticsPage() {
  const [families, setFamilies] = useState([]);
  const [productivity, setProductivity] = useState([]);
  const [completionRates, setCompletionRates] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (families.length > 0) fetchData();
  }, [families]);

  const fetchFamilies = async () => {
    try {
      const res = await api.get('/families');
      setFamilies(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const familyId = families[0]?.id;
      const [prodRes, exportRes] = await Promise.all([
        api.get('/analytics/productivity', { params: { familyId } }),
        api.get('/analytics/export', { params: { familyId, type: 'productivity' } }),
      ]);
      setProductivity(prodRes.data.data.productivity || []);
      setCompletionRates(prodRes.data.data.completion_rates || []);
      setMonthlyTrend(prodRes.data.data.monthly_trend || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const topPerformer = completionRates.length > 0
    ? completionRates.reduce((a, b) => (a.completion_rate > b.completion_rate ? a : b))
    : null;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Аналитика - HomeSpace', 14, 22);
    if (topPerformer) {
      doc.setFontSize(12);
      doc.text(`Лучший сотрудник: ${topPerformer.executor_name} (${topPerformer.completion_rate}%)`, 14, 32);
    }
    autoTable(doc, {
      startY: 40,
      head: [['Сотрудник', 'Задач выполнено', 'Всего задач', 'Процент']],
      body: completionRates.map((c) => [c.executor_name, c.completed_tasks, c.total_tasks, `${c.completion_rate}%`]),
    });
    doc.save('analytics.pdf');
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(completionRates.map((c) => ({
      Сотрудник: c.executor_name,
      Выполнено: c.completed_tasks,
      Всего: c.total_tasks,
      Процент: `${c.completion_rate}%`,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Аналитика');
    XLSX.writeFile(wb, 'analytics.xlsx');
  };

  if (loading) return <Loading text="Загрузка аналитики..." />;

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
            <Button variant="secondary" size="sm" onClick={exportPDF} icon={<FileText className="w-4 h-4" />}>PDF</Button>
            <Button variant="secondary" size="sm" onClick={exportExcel} icon={<FileSpreadsheet className="w-4 h-4" />}>Excel</Button>
          </div>
        </div>

        {/* Top Performer */}
        {topPerformer && (
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Лучший исполнитель</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{topPerformer.executor_name}</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">{topPerformer.completion_rate}% задач выполнено</p>
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
                  <Tooltip formatter={(v) => `${v}%`} />
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
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
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

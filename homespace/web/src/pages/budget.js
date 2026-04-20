import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Plus, Filter, TrendingUp, TrendingDown, PieChart, Download, FileText, FileSpreadsheet, Calendar, X, User, Users } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import api from '../utils/api';
import { downloadPdf } from '../utils/pdfExport';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Loading from '../components/ui/Loading';
import TransactionRow from '../components/TransactionRow';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4'];

export default function BudgetPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [families, setFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
  const [categoryData, setCategoryData] = useState([]);
  const [budgetMeta, setBudgetMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [newTx, setNewTx] = useState({ type: 'expense', amount: '', category: '', description: '', transaction_date: new Date().toISOString().split('T')[0] });
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState('personal');

  useEffect(() => {
    if (router.isReady) fetchFamilies();
  }, [router.isReady]);

  useEffect(() => {
    if (mode === 'family') {
      if (selectedFamilyId) {
        fetchData(selectedFamilyId);
      }
    } else {
      fetchData(null);
    }
  }, [mode, period, customStart, customEnd, typeFilter, selectedFamilyId]);

  const fetchFamilies = async () => {
    try {
      const res = await api.get('/families');
      const data = res.data.data || [];
      setFamilies(data);
      if (data.length > 0) {
        const queryFamilyId = router.query.familyId ? String(router.query.familyId) : '';
        setSelectedFamilyId(queryFamilyId || String(data[0].id));
        if (queryFamilyId) setMode('family');
      }
    } catch (err) { console.error(err); }
  };

  const fetchData = async (familyId) => {
    setLoading(true);
    try {
      if (period === 'custom' && (!customStart || !customEnd)) {
        setLoading(false);
        return;
      }

      const params = {};
      if (familyId) params.familyId = familyId;
      if (period === 'month') params.period = 'month';
      if (period === 'custom') { params.period = 'custom'; params.startDate = customStart; params.endDate = customEnd; }
      if (typeFilter) params.type = typeFilter;

      const [txRes, statsRes] = await Promise.all([
        api.get('/budget', { params }),
        api.get('/budget/stats', { params }),
      ]);
      const txData = txRes.data.data || [];
      const statsData = statsRes.data.data || {};
      setBudgetMeta(txRes.data.meta || statsRes.data.meta || null);
      setTransactions(txData);
      setStats({
        income: Number(statsData.totals?.total_income || 0),
        expense: Number(statsData.totals?.total_expense || 0),
        balance: Number(statsData.totals?.balance || 0),
      });

      const cats = {};
      txData.filter((t) => t.type === 'expense').forEach((t) => {
        cats[t.category || 'Без категории'] = (cats[t.category || 'Без категории'] || 0) + Number(t.amount);
      });
      setCategoryData(Object.entries(cats).map(([name, value]) => ({ name, value })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const addTransaction = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const params = mode === 'family' ? { familyId: selectedFamilyId } : {};
      await api.post('/budget', { ...newTx, amount: Number(newTx.amount) }, { params });
      closeModal();
      fetchData(mode === 'family' ? selectedFamilyId : null);
    } catch (err) { console.error(err); }
    finally { setAdding(false); }
  };

  const deleteTransaction = async (id) => {
    if (!window.confirm('Удалить транзакцию?')) return;
    try {
      await api.delete(`/budget/${id}`);
      fetchData(mode === 'family' ? selectedFamilyId : null);
    } catch (err) { console.error(err); }
  };

  const openEditModal = (tx) => {
    setEditingTx(tx);
    setNewTx({
      type: tx.type,
      amount: String(tx.amount),
      category: tx.category || '',
      description: tx.description || '',
      transaction_date: tx.transaction_date ? tx.transaction_date.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingTx(null);
    setNewTx({ type: 'expense', amount: '', category: '', description: '', transaction_date: new Date().toISOString().split('T')[0] });
  };

  const submitTransaction = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const params = mode === 'family' ? { familyId: selectedFamilyId } : {};
      if (editingTx) {
        await api.put(`/budget/${editingTx.id}`, { ...newTx, amount: Number(newTx.amount) });
      } else {
        await api.post('/budget', { ...newTx, amount: Number(newTx.amount) }, { params });
      }
      closeModal();
      fetchData(mode === 'family' ? selectedFamilyId : null);
    } catch (err) { console.error(err); }
    finally { setAdding(false); }
  };

  const exportPDF = () => {
    if (!hasExportAccess) {
      window.alert('Экспорт PDF доступен в подписке HomeSpace Plus.');
      return;
    }
    const modeTitle = mode === 'personal' ? 'Личный бюджет - HomeSpace' : 'Бюджет - HomeSpace';
    downloadPdf('budget.pdf', {
      content: [
        { text: modeTitle, style: 'title' },
        {
          text: `Доход: ${stats.income} ₽ | Расход: ${stats.expense} ₽ | Баланс: ${stats.balance} ₽`,
          style: 'subtitle',
        },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', '*', 'auto'],
            body: [
              [
                { text: 'Тип', style: 'tableHeader' },
                { text: 'Категория', style: 'tableHeader' },
                { text: 'Сумма', style: 'tableHeader' },
                { text: 'Описание', style: 'tableHeader' },
                { text: 'Дата', style: 'tableHeader' },
              ],
              ...transactions.map((t) => [
                t.type === 'income' ? 'Доход' : 'Расход',
                t.category || '-',
                `${t.amount} ₽`,
                t.description || '-',
                new Date(t.transaction_date).toLocaleDateString('ru-RU'),
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
    const ws = XLSX.utils.json_to_sheet(transactions.map((t) => ({
      Тип: t.type === 'income' ? 'Доход' : 'Расход',
      Категория: t.category,
      Сумма: t.amount,
      Описание: t.description,
      Дата: new Date(t.transaction_date).toLocaleDateString('ru-RU'),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Бюджет');
    XLSX.writeFile(wb, 'budget.xlsx');
  };

  const selectedFamily = families.find((family) => String(family.id) === String(selectedFamilyId));
  const familyHasSubscription = selectedFamily?.has_subscription;
  const hasExportAccess = mode === 'family' ? familyHasSubscription : user?.has_subscription;

  return (
    <>
      <Head><title>Бюджет — HomeSpace</title></Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Бюджет</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {mode === 'personal' ? 'Управление личными финансами' : 'Управление финансами семьи'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={exportPDF} icon={<FileText className="w-4 h-4" />}>PDF</Button>
            <Button variant="secondary" size="sm" onClick={exportExcel} icon={<FileSpreadsheet className="w-4 h-4" />}>Excel</Button>
            <Button onClick={() => setShowAddModal(true)} icon={<Plus className="w-4 h-4" />}>Транзакция</Button>
          </div>
        </div>

        {/* Mode Toggle */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode('personal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                mode === 'personal'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <User className="w-4 h-4" />
              Личный бюджет
            </button>
            <button
              onClick={() => setMode('family')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                mode === 'family'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Семейный бюджет
            </button>
          </div>
        </Card>

        {mode === 'family' && familyHasSubscription && (
          <Badge variant="success" size="sm" dot>Подписка: доступны данные за всё время</Badge>
        )}

        {budgetMeta?.limitedBySubscription && (
          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Freemium-ограничение бюджета</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Без подписки показываем последние {budgetMeta.retentionDays} дней. Данные за всё время остаются в базе и откроются после подписки.
                </p>
              </div>
              <Badge variant="warning" size="sm">с {new Date(budgetMeta.availableFrom).toLocaleDateString('ru-RU')}</Badge>
            </div>
          </Card>
        )}

        {mode === 'personal' && (
          <Badge variant="info" size="sm" dot>Отображаются ваши личные транзакции</Badge>
        )}

        {/* Period Selector */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            {['all', 'month', 'custom'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {p === 'all' ? 'Всё время' : p === 'month' ? 'Месяц' : 'Период'}
              </button>
            ))}
            {mode === 'family' && families.length > 0 && (
              <Select
                options={families.map((family) => ({ value: family.id, label: family.name }))}
                value={selectedFamilyId}
                onChange={(e) => setSelectedFamilyId(e.target.value)}
                placeholder="Семья"
                className="w-auto min-w-32"
              />
            )}
            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm dark:text-white" />
                <span className="text-gray-400">—</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm dark:text-white" />
              </div>
            )}
            <Select
              options={[{ value: 'income', label: 'Доходы' }, { value: 'expense', label: 'Расходы' }]}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              placeholder="Тип"
              className="w-auto min-w-28"
            />
          </div>
        </Card>

        {/* Summary */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.income?.toLocaleString('ru-RU')} ₽</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Доходы</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.expense?.toLocaleString('ru-RU')} ₽</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Расходы</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <PieChart className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'}`}>
                {stats.balance?.toLocaleString('ru-RU')} ₽
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Баланс</p>
            </div>
          </Card>
        </div>

        {/* Chart + Table */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pie Chart */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Расходы по категориям</h3>
            {categoryData.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">Нет данных</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${v} ₽`} />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Transactions Table */}
          <Card className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Транзакции</h3>
            {loading ? <Loading /> : transactions.length === 0 ? (
              <EmptyState icon={Filter} title="Нет транзакций" description="Добавьте первую транзакцию" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                      <th className="pb-3 px-4">Описание</th>
                      <th className="pb-3 px-4">Тип</th>
                      <th className="pb-3 px-4">Сумма</th>
                      <th className="pb-3 px-4">Дата</th>
                      <th className="pb-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <TransactionRow
                        key={t.id}
                        transaction={t}
                        onDelete={deleteTransaction}
                        onEdit={openEditModal}
                        onUploaded={() => fetchData(mode === 'family' ? selectedFamilyId : null)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Add Transaction Modal */}
        <Modal isOpen={showAddModal} onClose={closeModal} title={editingTx ? 'Редактировать транзакцию' : 'Новая транзакция'}>
          <form onSubmit={submitTransaction} className="space-y-4">
            <Select
              label="Тип"
              value={newTx.type}
              onChange={(e) => setNewTx({ ...newTx, type: e.target.value })}
              options={[{ value: 'income', label: 'Доход' }, { value: 'expense', label: 'Расход' }]}
            />
            <Input
              label="Сумма"
              type="number"
              value={newTx.amount}
              onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
              placeholder="0"
              required
            />
            <Input
              label="Категория"
              value={newTx.category}
              onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
              placeholder="Продукты, Зарплата..."
              required
            />
            <Input label="Описание" value={newTx.description} onChange={(e) => setNewTx({ ...newTx, description: e.target.value })} placeholder="Подробности..." />
            <Input label="Дата" type="date" value={newTx.transaction_date} onChange={(e) => setNewTx({ ...newTx, transaction_date: e.target.value })} />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">Отмена</Button>
              <Button type="submit" variant="primary" loading={adding} className="flex-1" icon={<Plus className="w-4 h-4" />}>{editingTx ? 'Сохранить' : 'Добавить'}</Button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}

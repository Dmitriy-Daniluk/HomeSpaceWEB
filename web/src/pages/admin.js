import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Activity, AlertTriangle, BarChart3, CheckSquare, Crown, Database, Download,
  Edit2, ExternalLink, FileArchive, FileSpreadsheet, FileText,
  HardDrive, Home, KeyRound, LifeBuoy, MessageSquare, Search, Shield, Trash2,
  Star, UserCog, Users, Wallet
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as XLSX from 'xlsx';
import api from '../utils/api';
import { getApiOrigin } from '../utils/api';
import { downloadPdf } from '../utils/pdfExport';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Loading from '../components/ui/Loading';

const API_ORIGIN = getApiOrigin();

const navSections = [
  {
    label: 'Операторская',
    items: [
      { id: 'overview', label: 'Сводка', icon: BarChart3 },
      { id: 'sales', label: 'Продажи', icon: Crown },
      { id: 'reports', label: 'Отчеты', icon: FileSpreadsheet },
    ],
  },
  {
    label: 'Данные',
    items: [
      { id: 'users', label: 'Пользователи', icon: Users },
      { id: 'families', label: 'Семьи', icon: Home },
      { id: 'tasks', label: 'Задачи', icon: CheckSquare },
      { id: 'files', label: 'Файлы', icon: FileArchive },
      { id: 'passwords', label: 'Пароли', icon: KeyRound },
    ],
  },
  {
    label: 'Коммуникации',
    items: [
      { id: 'support', label: 'Поддержка', icon: LifeBuoy },
      { id: 'feedback', label: 'Отзывы', icon: MessageSquare },
    ],
  },
  {
    label: 'Контроль',
    items: [
      { id: 'audit', label: 'Аудит', icon: Activity },
      { id: 'profile', label: 'Профиль', icon: UserCog },
    ],
  },
];

const allNavItems = navSections.flatMap((section) => section.items);

const supportStatusLabels = {
  open: 'Открыт',
  in_progress: 'В работе',
  resolved: 'Решен',
  closed: 'Закрыт',
};

const taskStatusLabels = {
  new: 'Новая',
  in_progress: 'В процессе',
  done: 'Выполнена',
};

const priorityLabels = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

const visibilityLabels = {
  private: 'Личный',
  parents: 'Родители',
  family: 'Семья',
};

const fileTypeLabels = {
  receipt: 'Чек',
  document: 'Документ',
  image: 'Изображение',
  other: 'Другое',
};

const reportCards = [
  { id: 'sales', title: 'Продажи подписок', description: 'Выручка, планы, mock-СБП платежи и покупатели.' },
  { id: 'conversion', title: 'Конверсия Free -> Plus', description: 'Новые пользователи, первые оплаты и процент конверсии по месяцам.' },
  { id: 'risks', title: 'Проблемные семьи', description: 'Просроченные задачи, открытые тикеты и низкая активность.' },
  { id: 'users', title: 'Пользователи и подписки', description: 'Аккаунты, статус подписки, семьи, задачи и транзакции.' },
  { id: 'families', title: 'Семьи и активность', description: 'Состав семей, задачи, бюджет, файлы и инвайт-коды.' },
  { id: 'tasks', title: 'Задачи и нагрузка', description: 'Статусы, приоритеты, исполнители, дедлайны и вложения.' },
  { id: 'files', title: 'Файлы системы', description: 'Документы, чеки, изображения, владельцы и связи.' },
  { id: 'passwords', title: 'Password vault', description: 'Метаданные хранилища без выгрузки секретов в отчет.' },
  { id: 'support', title: 'Поддержка и отзывы', description: 'Обращения, статусы, ответы администратора и отзывы.' },
  { id: 'audit', title: 'Аудит действий', description: 'Кто, когда и что изменил или удалил в админке.' },
];

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('ru-RU')} ₽`;

const formatDate = (value, withTime = false) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return withTime ? date.toLocaleString('ru-RU') : date.toLocaleDateString('ru-RU');
};

const formatBytes = (bytes) => {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`;
  return `${(value / 1024 / 1024).toFixed(1)} МБ`;
};

export default function AdminPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [families, setFamilies] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [passwords, setPasswords] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editingFamily, setEditingFamily] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingFile, setEditingFile] = useState(null);
  const [editingPassword, setEditingPassword] = useState(null);
  const [profileForm, setProfileForm] = useState({ fullName: '', email: '', phone: '', birthDate: '' });
  const [adminPasswordForm, setAdminPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const requestedTab = String(router.query.tab || 'overview');
    if (allNavItems.some((item) => item.id === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [router.isReady, router.query.tab]);

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      fullName: user.fullName || user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      birthDate: user.birthDate || user.birth_date ? String(user.birthDate || user.birth_date).slice(0, 10) : '',
    });
  }, [user]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, familiesRes, tasksRes, filesRes, passwordsRes, paymentsRes, ticketsRes, feedbackRes, auditRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/families'),
        api.get('/admin/tasks'),
        api.get('/admin/files'),
        api.get('/admin/passwords'),
        api.get('/admin/payments'),
        api.get('/admin/tickets'),
        api.get('/admin/feedback'),
        api.get('/admin/audit'),
      ]);
      const statsData = statsRes.data.data || statsRes.data;
      setStats(statsData);
      setUsers(usersRes.data.data || []);
      setFamilies(familiesRes.data.data || []);
      setTasks(tasksRes.data.data || []);
      setFiles(filesRes.data.data || []);
      setPasswords(passwordsRes.data.data || []);
      setPayments(paymentsRes.data.data || []);
      setTickets(ticketsRes.data.data || []);
      setFeedback(feedbackRes.data.data || []);
      setAuditLogs(auditRes.data.data || []);
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось загрузить админку.');
    } finally {
      setLoading(false);
    }
  };

  const goToTab = (tab) => {
    setActiveTab(tab);
    setQuery('');
    router.push({ pathname: '/admin', query: { tab } }, undefined, { shallow: true });
  };

  const normalizedQuery = query.trim().toLowerCase();
  const includesQuery = (value) => String(value || '').toLowerCase().includes(normalizedQuery);

  const filteredUsers = useMemo(() => users.filter((item) =>
    [item.email, item.full_name, item.phone].some(includesQuery)
  ), [users, normalizedQuery]);

  const filteredFamilies = useMemo(() => families.filter((item) =>
    [item.name, item.description, item.invite_code].some(includesQuery)
  ), [families, normalizedQuery]);

  const filteredTasks = useMemo(() => tasks.filter((item) =>
    [item.title, item.description, item.family_name, item.executor_name].some(includesQuery)
  ), [tasks, normalizedQuery]);

  const filteredFiles = useMemo(() => files.filter((item) =>
    [item.file_name, item.file_type, item.family_name, item.uploader_email, item.task_title].some(includesQuery)
  ), [files, normalizedQuery]);

  const filteredPasswords = useMemo(() => passwords.filter((item) =>
    [item.service_name, item.login, item.url, item.family_name, item.owner_email].some(includesQuery)
  ), [passwords, normalizedQuery]);

  const filteredPayments = useMemo(() => payments.filter((item) =>
    [item.provider_payment_id, item.email, item.full_name, item.plan].some(includesQuery)
  ), [payments, normalizedQuery]);

  const filteredAudit = useMemo(() => auditLogs.filter((item) =>
    [item.action, item.entity_type, item.admin_email, item.details].some(includesQuery)
  ), [auditLogs, normalizedQuery]);

  const updateTicket = async (id, payload) => {
    try {
      const response = await api.put(`/admin/tickets/${id}`, payload);
      const updated = response.data.data || payload;
      setTickets((prev) => prev.map((ticket) => (ticket.id === id ? { ...ticket, ...updated } : ticket)));
      fetchData();
    } catch (err) {
      console.error(err);
      window.alert('Не удалось обновить обращение.');
    }
  };

  const changeTicketDraft = (id, patch) => {
    setTickets((prev) => prev.map((ticket) => (ticket.id === id ? { ...ticket, ...patch } : ticket)));
  };

  const deleteTicket = async (id) => {
    if (!window.confirm('Удалить обращение поддержки?')) return;
    try {
      await api.delete(`/admin/tickets/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      window.alert('Не удалось удалить обращение.');
    }
  };

  const saveUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/users/${editingUser.id}`, {
        full_name: editingUser.full_name,
        email: editingUser.email,
        phone: editingUser.phone,
        has_subscription: Boolean(editingUser.has_subscription),
        subscription_until: editingUser.subscription_until || null,
        new_password: editingUser.new_password || undefined,
      });
      setEditingUser(null);
      fetchData();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось сохранить пользователя.');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Удалить пользователя и все связанные данные?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось удалить пользователя.');
    }
  };

  const saveFamily = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/families/${editingFamily.id}`, {
        name: editingFamily.name,
        description: editingFamily.description,
        savings_goal: editingFamily.savings_goal,
      });
      setEditingFamily(null);
      fetchData();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось сохранить семью.');
    } finally {
      setSaving(false);
    }
  };

  const deleteFamily = async (id) => {
    if (!window.confirm('Удалить семью и все связанные задачи, бюджет, файлы, чат?')) return;
    try {
      await api.delete(`/admin/families/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось удалить семью.');
    }
  };

  const saveTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/tasks/${editingTask.id}`, {
        title: editingTask.title,
        description: editingTask.description,
        deadline: editingTask.deadline || null,
        priority: editingTask.priority,
        status: editingTask.status,
        executor_id: editingTask.executor_id || null,
      });
      setEditingTask(null);
      fetchData();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось сохранить задачу.');
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm('Удалить задачу?')) return;
    try {
      await api.delete(`/admin/tasks/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось удалить задачу.');
    }
  };

  const saveFile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/files/${editingFile.id}`, {
        file_name: editingFile.file_name,
        file_type: editingFile.file_type,
        related_task_id: editingFile.related_task_id || null,
        related_transaction_id: editingFile.related_transaction_id || null,
      });
      setEditingFile(null);
      fetchData();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось сохранить файл.');
    } finally {
      setSaving(false);
    }
  };

  const deleteFile = async (id) => {
    if (!window.confirm('Удалить файл из базы и хранилища?')) return;
    try {
      await api.delete(`/admin/files/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось удалить файл.');
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!editingPassword.passwordDraft || !editingPassword.passwordDraft.trim()) {
        window.alert('Введите новый секрет. Админ не может читать или менять метаданные vault-записи.');
        return;
      }
      const payload = { password: editingPassword.passwordDraft };
      await api.put(`/admin/passwords/${editingPassword.id}`, payload);
      setEditingPassword(null);
      fetchData();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось сохранить пароль.');
    } finally {
      setSaving(false);
    }
  };

  const deletePassword = async (id) => {
    if (!window.confirm('Удалить запись password vault?')) return;
    try {
      await api.delete(`/admin/passwords/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось удалить пароль.');
    }
  };

  const deleteFeedback = async (id) => {
    if (!window.confirm('Удалить отзыв?')) return;
    try {
      await api.delete(`/admin/feedback/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      window.alert('Не удалось удалить отзыв.');
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.put('/users/profile', {
        fullName: profileForm.fullName,
        email: profileForm.email,
        phone: profileForm.phone,
        birthDate: profileForm.birthDate || null,
      });
      updateUser(response.data.data);
      window.alert('Профиль администратора обновлен.');
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось сохранить профиль.');
    } finally {
      setSaving(false);
    }
  };

  const changeAdminPassword = async (e) => {
    e.preventDefault();
    if (adminPasswordForm.newPassword !== adminPasswordForm.confirmPassword) {
      window.alert('Новые пароли не совпадают.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/change-password', adminPasswordForm);
      setAdminPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      window.alert('Пароль администратора обновлен.');
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось изменить пароль.');
    } finally {
      setSaving(false);
    }
  };

  const buildReport = (type) => {
    if (type === 'sales') {
      return createReport('Продажи подписок HomeSpace', [
        ['Выручка всего', formatCurrency(stats?.salesTotalRevenue)],
        ['Выручка за месяц', formatCurrency(stats?.salesMonthRevenue)],
        ['Оплаченных заказов', stats?.salesOrders || 0],
        ['Платящих пользователей', stats?.salesPayingUsers || 0],
      ], [
        ['ID', 'Плательщик', 'План', 'Сумма', 'Метод', 'Статус', 'Дата'],
        ...payments.map((item) => [item.id, item.email || item.full_name || 'Удален', item.plan, formatCurrency(item.amount), item.payment_method, item.status, formatDate(item.created_at, true)]),
      ]);
    }

    if (type === 'conversion') {
      return createReport('Конверсия Free -> Plus', [
        ['Пользователей всего', stats?.totalUsers || 0],
        ['Активных подписок', stats?.activeSubscriptions || 0],
        ['ARPPU', formatCurrency(stats?.salesArpu)],
      ], [
        ['Месяц', 'Новые пользователи', 'Оплатившие', 'Конверсия'],
        ...(stats?.conversionByMonth || []).map((item) => [item.month, item.new_users, item.paid_users, `${item.conversion_rate}%`]),
      ]);
    }

    if (type === 'risks') {
      return createReport('Проблемные семьи HomeSpace', [
        ['Семей в зоне внимания', stats?.problemFamilies?.length || 0],
        ['Открытых тикетов', stats?.openTickets || 0],
      ], [
        ['ID', 'Семья', 'Участники', 'Просрочено задач', 'Открыто тикетов', 'Последняя активность'],
        ...(stats?.problemFamilies || []).map((item) => [item.id, item.name, item.member_count, item.overdue_tasks, item.open_tickets, formatDate(item.last_activity_at, true)]),
      ]);
    }

    if (type === 'users') {
      return createReport('Пользователи и подписки HomeSpace', [
        ['Всего пользователей', stats?.totalUsers || 0],
        ['Активных подписок', stats?.activeSubscriptions || 0],
      ], [
        ['ID', 'ФИО', 'Email', 'Семьи', 'Задачи', 'Подписка'],
        ...users.map((item) => [item.id, item.full_name || 'Без имени', item.email, item.family_count || 0, item.task_count || 0, item.has_subscription ? `Plus до ${formatDate(item.subscription_until)}` : 'Free']),
      ]);
    }

    if (type === 'families') {
      return createReport('Семьи и активность HomeSpace', [
        ['Всего семей', stats?.totalFamilies || 0],
        ['Всего задач', stats?.totalTasks || 0],
      ], [
        ['ID', 'Семья', 'Участники', 'Задачи', 'Баланс', 'Файлы'],
        ...families.map((item) => [item.id, item.name, item.member_count || 0, item.task_count || 0, formatCurrency(Number(item.income || 0) - Number(item.expense || 0)), item.file_count || 0]),
      ]);
    }

    if (type === 'tasks') {
      return createReport('Задачи и операционная нагрузка HomeSpace', [
        ['Всего задач', stats?.totalTasks || 0],
      ], [
        ['ID', 'Задача', 'Семья', 'Исполнитель', 'Статус', 'Приоритет', 'Дедлайн'],
        ...tasks.map((item) => [item.id, item.title, item.family_name || 'Личная', item.executor_name || 'Не назначен', taskStatusLabels[item.status] || item.status, priorityLabels[item.priority] || item.priority, formatDate(item.deadline)]),
      ]);
    }

    if (type === 'files') {
      return createReport('Файлы системы HomeSpace', [
        ['Всего файлов', files.length],
        ['Хранилище', formatBytes(stats?.totalStorageBytes)],
      ], [
        ['ID', 'Название', 'Тип', 'Семья', 'Загрузил', 'Размер', 'Дата'],
        ...files.map((item) => [item.id, item.file_name, fileTypeLabels[item.file_type] || item.file_type, item.family_name || '-', item.uploader_email || item.uploader_name || '-', formatBytes(item.file_size), formatDate(item.created_at, true)]),
      ]);
    }

    if (type === 'passwords') {
      return createReport('Password vault HomeSpace', [
        ['Записей vault', passwords.length],
        ['Важно', 'Секреты в отчет не выгружаются'],
      ], [
        ['ID', 'Сервис', 'Логин', 'URL', 'Семья', 'Владелец', 'Видимость'],
        ...passwords.map((item) => [item.id, item.service_name, item.login || '-', item.url || '-', item.family_name || '-', item.owner_email || '-', visibilityLabels[item.visibility_level] || item.visibility_level]),
      ]);
    }

    if (type === 'audit') {
      return createReport('Аудит действий администратора', [
        ['Событий', auditLogs.length],
      ], [
        ['ID', 'Админ', 'Действие', 'Сущность', 'ID сущности', 'Дата'],
        ...auditLogs.map((item) => [item.id, item.admin_email || item.admin_name || '-', item.action, item.entity_type, item.entity_id || '-', formatDate(item.created_at, true)]),
      ]);
    }

    return createReport('Поддержка и обратная связь HomeSpace', [
      ['Обращений всего', stats?.totalTickets || 0],
      ['Открыто', stats?.openTickets || 0],
      ['Отзывов', stats?.totalFeedback || 0],
    ], [
      ['Тип', 'Автор', 'Тема', 'Статус', 'Дата'],
      ...tickets.map((item) => ['Поддержка', item.email || item.full_name || 'Пользователь', item.subject, supportStatusLabels[item.status] || item.status, formatDate(item.created_at, true)]),
      ...feedback.map((item) => ['Отзыв', item.email || item.full_name || 'Анонимно', item.message, item.rating ? `${item.rating}/5` : '-', formatDate(item.created_at, true)]),
    ]);
  };

  const exportReport = async (type, format) => {
    const report = buildReport(type);
    const fileBase = `homespace-admin-${type}-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['Отчет', report.title],
        ['Сформирован', formatDate(new Date(), true)],
        [],
        ...report.summary,
        [],
        ...report.rows,
      ]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет');
      XLSX.writeFile(workbook, `${fileBase}.xlsx`);
      return;
    }

    await downloadPdf(`${fileBase}.pdf`, {
      content: [
        { text: report.title, style: 'title' },
        { text: `Сформирован: ${formatDate(new Date(), true)}`, style: 'subtitle' },
        {
          table: {
            widths: ['*', '*'],
            body: report.summary.map(([label, value]) => [{ text: String(label), style: 'tableHeader' }, String(value)]),
          },
          margin: [0, 0, 0, 14],
        },
        {
          table: {
            headerRows: 1,
            widths: report.rows[0].map(() => '*'),
            body: report.rows.map((row, index) => row.map((cell) => index === 0 ? { text: String(cell), style: 'tableHeader' } : String(cell ?? ''))),
          },
          layout: 'lightHorizontalLines',
        },
      ],
    });
  };

  if (loading) return <Loading text="Загрузка панели администратора..." />;

  return (
    <>
      <Head><title>Админ-панель — HomeSpace</title></Head>
      <div className="space-y-6 animate-fade-in">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-indigo-100 mb-4">
                <Shield className="w-4 h-4" />
                Admin Workspace
              </div>
              <h1 className="text-3xl font-black">Операторская панель HomeSpace</h1>
              <p className="mt-2 max-w-2xl text-sm text-indigo-100/75">
                Управление продажами, данными, коммуникациями и рисками продукта из единого центра.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniMetric label="Выручка" value={formatCurrency(stats?.salesTotalRevenue)} />
              <MiniMetric label="Конверсия" value={`${stats?.conversionByMonth?.at(-1)?.conversion_rate || 0}%`} />
              <MiniMetric label="Vault" value={stats?.totalVaultEntries || passwords.length} />
              <MiniMetric label="Риски" value={stats?.problemFamilies?.length || 0} />
            </div>
          </div>
        </Card>

        <div className="grid xl:grid-cols-[260px_1fr] gap-6 items-start">
          <AdminSideNav activeTab={activeTab} onSelect={goToTab} />

          <div className="space-y-5 min-w-0">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {allNavItems.find((item) => item.id === activeTab)?.label || 'Сводка'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Раздел администрирования HomeSpace</p>
              </div>
              {['sales', 'users', 'families', 'tasks', 'files', 'passwords', 'audit'].includes(activeTab) && (
                <div className="relative w-full lg:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 py-2.5 pl-10 pr-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            {activeTab === 'overview' && (
              <Overview stats={stats} />
            )}
            {activeTab === 'sales' && (
              <SalesPanel payments={filteredPayments} stats={stats} />
            )}
            {activeTab === 'users' && (
              <UsersTable users={filteredUsers} onEdit={setEditingUser} onDelete={deleteUser} />
            )}
            {activeTab === 'families' && (
              <FamiliesTable families={filteredFamilies} onEdit={setEditingFamily} onDelete={deleteFamily} />
            )}
            {activeTab === 'tasks' && (
              <TasksTable tasks={filteredTasks} onEdit={setEditingTask} onDelete={deleteTask} />
            )}
            {activeTab === 'files' && (
              <FilesTable files={filteredFiles} onEdit={setEditingFile} onDelete={deleteFile} />
            )}
            {activeTab === 'passwords' && (
              <PasswordsPanel
                passwords={filteredPasswords}
                onEdit={(entry) => setEditingPassword({ ...entry })}
                onDelete={deletePassword}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsPanel onExport={exportReport} />
            )}
            {activeTab === 'support' && (
              <SupportTable tickets={tickets} onChange={changeTicketDraft} onUpdate={updateTicket} onDelete={deleteTicket} />
            )}
            {activeTab === 'feedback' && (
              <FeedbackTable feedback={feedback} onDelete={deleteFeedback} />
            )}
            {activeTab === 'audit' && (
              <AuditTable logs={filteredAudit} />
            )}
            {activeTab === 'profile' && (
              <AdminProfile
                user={user}
                profileForm={profileForm}
                setProfileForm={setProfileForm}
                onSubmit={saveProfile}
                passwordForm={adminPasswordForm}
                setPasswordForm={setAdminPasswordForm}
                onPasswordSubmit={changeAdminPassword}
                saving={saving}
              />
            )}
          </div>
        </div>

        <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Редактировать пользователя">
          {editingUser && (
            <form onSubmit={saveUser} className="space-y-4">
              <Input label="ФИО" value={editingUser.full_name || ''} onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })} />
              <Input label="Email" type="email" value={editingUser.email || ''} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} />
              <Input label="Телефон" value={editingUser.phone || ''} onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })} />
              <Input label="Новый пароль пользователя" type="password" value={editingUser.new_password || ''} onChange={(e) => setEditingUser({ ...editingUser, new_password: e.target.value })} placeholder="Оставьте пустым, если не меняем" />
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={Boolean(editingUser.has_subscription)} onChange={(e) => setEditingUser({ ...editingUser, has_subscription: e.target.checked })} />
                Активировать подписку
              </label>
              <Input label="Подписка до" type="datetime-local" value={editingUser.subscription_until ? String(editingUser.subscription_until).slice(0, 16) : ''} onChange={(e) => setEditingUser({ ...editingUser, subscription_until: e.target.value })} />
              <ModalActions onCancel={() => setEditingUser(null)} saving={saving} />
            </form>
          )}
        </Modal>

        <Modal isOpen={!!editingFamily} onClose={() => setEditingFamily(null)} title="Редактировать семью">
          {editingFamily && (
            <form onSubmit={saveFamily} className="space-y-4">
              <Input label="Название" value={editingFamily.name || ''} onChange={(e) => setEditingFamily({ ...editingFamily, name: e.target.value })} />
              <Input label="Цель накоплений" type="number" value={editingFamily.savings_goal || ''} onChange={(e) => setEditingFamily({ ...editingFamily, savings_goal: e.target.value })} />
              <Textarea label="Описание" value={editingFamily.description || ''} onChange={(e) => setEditingFamily({ ...editingFamily, description: e.target.value })} />
              <ModalActions onCancel={() => setEditingFamily(null)} saving={saving} />
            </form>
          )}
        </Modal>

        <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="Редактировать задачу" size="lg">
          {editingTask && (
            <form onSubmit={saveTask} className="space-y-4">
              <Input label="Название" value={editingTask.title || ''} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} />
              <Textarea label="Комментарий" value={editingTask.description || ''} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} />
              <div className="grid md:grid-cols-2 gap-4">
                <Select label="Статус" value={editingTask.status || 'new'} onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })} options={entriesToOptions(taskStatusLabels)} />
                <Select label="Приоритет" value={editingTask.priority || 'medium'} onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })} options={entriesToOptions(priorityLabels)} />
                <Input label="Дедлайн" type="datetime-local" value={editingTask.deadline ? String(editingTask.deadline).slice(0, 16) : ''} onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value })} />
                <Select
                  label="Исполнитель"
                  value={editingTask.executor_id || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, executor_id: e.target.value })}
                  options={[{ value: '', label: 'Не назначен' }, ...users.map((item) => ({ value: item.id, label: `${item.full_name || 'Без имени'} (${item.email})` }))]}
                />
              </div>
              <ModalActions onCancel={() => setEditingTask(null)} saving={saving} />
            </form>
          )}
        </Modal>

        <Modal isOpen={!!editingFile} onClose={() => setEditingFile(null)} title="Редактировать файл">
          {editingFile && (
            <form onSubmit={saveFile} className="space-y-4">
              <Input label="Название файла" value={editingFile.file_name || ''} onChange={(e) => setEditingFile({ ...editingFile, file_name: e.target.value })} />
              <Select label="Тип файла" value={editingFile.file_type || 'other'} onChange={(e) => setEditingFile({ ...editingFile, file_type: e.target.value })} options={entriesToOptions(fileTypeLabels)} />
              <Input label="ID связанной задачи" value={editingFile.related_task_id || ''} onChange={(e) => setEditingFile({ ...editingFile, related_task_id: e.target.value })} />
              <Input label="ID связанной транзакции" value={editingFile.related_transaction_id || ''} onChange={(e) => setEditingFile({ ...editingFile, related_transaction_id: e.target.value })} />
              <ModalActions onCancel={() => setEditingFile(null)} saving={saving} />
            </form>
          )}
        </Modal>

        <Modal isOpen={!!editingPassword} onClose={() => setEditingPassword(null)} title="Редактировать пароль" size="lg">
          {editingPassword && (
            <form onSubmit={savePassword} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <ReadOnlyField label="Сервис" value={editingPassword.service_name || '-'} />
                <ReadOnlyField label="Логин" value={editingPassword.login || '-'} />
                <ReadOnlyField label="URL" value={editingPassword.url || '-'} />
                <ReadOnlyField label="Видимость" value={visibilityLabels[editingPassword.visibility_level] || editingPassword.visibility_level || '-'} />
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                Админ видит только метаданные. Старый секрет не расшифровывается; можно только заменить его новым значением.
              </div>
              <Input label="Новый секрет" value={editingPassword.passwordDraft ?? ''} onChange={(e) => setEditingPassword({ ...editingPassword, passwordDraft: e.target.value })} placeholder="Введите новый секрет" required />
              <ModalActions onCancel={() => setEditingPassword(null)} saving={saving} />
            </form>
          )}
        </Modal>
      </div>
    </>
  );
}

function createReport(title, summary, rows) {
  return { title, summary, rows };
}

function entriesToOptions(source) {
  return Object.entries(source).map(([value, label]) => ({ value, label }));
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-indigo-100/70">{label}</p>
    </div>
  );
}

function AdminSideNav({ activeTab, onSelect }) {
  return (
    <Card className="sticky top-24 p-3">
      <div className="space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{section.label}</p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                    activeTab === item.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Overview({ stats }) {
  const cards = [
    { label: 'Выручка всего', value: formatCurrency(stats?.salesTotalRevenue), icon: Crown, tone: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300' },
    { label: 'Выручка за месяц', value: formatCurrency(stats?.salesMonthRevenue), icon: Wallet, tone: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-300' },
    { label: 'Пользователи', value: stats?.totalUsers || 0, icon: Users, tone: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' },
    { label: 'Семьи', value: stats?.totalFamilies || 0, icon: Home, tone: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' },
    { label: 'Задачи', value: stats?.totalTasks || 0, icon: CheckSquare, tone: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300' },
    { label: 'Файлы', value: stats?.totalFiles || 0, icon: HardDrive, tone: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300' },
    { label: 'Vault', value: stats?.totalVaultEntries || 0, icon: KeyRound, tone: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300' },
    { label: 'Риски', value: stats?.problemFamilies?.length || 0, icon: AlertTriangle, tone: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((item) => (
          <Card key={item.label} className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.tone}`}>
              <item.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <ChartCard title="Конверсия Free -> Plus">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats?.conversionByMonth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="conversion_rate" stroke="#10b981" strokeWidth={3} name="Конверсия, %" />
              <Line type="monotone" dataKey="paid_users" stroke="#6366f1" strokeWidth={3} name="Оплатившие" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Retention семей по активности">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats?.familyRetention || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip />
              <Bar dataKey="active_rate" fill="#6366f1" name="Активность, %" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid xl:grid-cols-[1fr_380px] gap-6">
        <ChartCard title="Продажи подписок по месяцам">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats?.salesByMonth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="revenue" fill="#10b981" name="Выручка" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Проблемные семьи</h3>
          <div className="space-y-3">
            {(stats?.problemFamilies || []).length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Семей в зоне внимания нет.</p>
            ) : stats.problemFamilies.map((family) => (
              <div key={family.id} className="rounded-2xl bg-red-50 dark:bg-red-900/20 p-3">
                <p className="font-semibold text-gray-900 dark:text-white">{family.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Просрочено: {family.overdue_tasks} • Тикеты: {family.open_tickets}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Активность: {formatDate(family.last_activity_at, true)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {children}
    </Card>
  );
}

function SalesPanel({ payments, stats }) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <SummaryPill label="Выручка всего" value={formatCurrency(stats?.salesTotalRevenue)} />
        <SummaryPill label="Выручка за месяц" value={formatCurrency(stats?.salesMonthRevenue)} />
        <SummaryPill label="Выручка за год" value={formatCurrency(stats?.salesYearRevenue)} />
        <SummaryPill label="ARPPU" value={formatCurrency(stats?.salesArpu)} />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Динамика продаж">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats?.salesByMonth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} name="Выручка" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Планы подписки">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats?.salesByPlan || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="revenue" fill="#6366f1" name="Выручка" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <PaymentsTable payments={payments} />
    </div>
  );
}

function SummaryPill({ label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 dark:bg-gray-700/50 p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function PaymentsTable({ payments }) {
  return (
    <DataTable minWidth="900px" headers={['Платеж', 'Пользователь', 'План', 'Сумма', 'Метод', 'Статус', 'Дата']}>
      {payments.map((payment) => (
        <tr key={payment.id} className="border-b border-gray-50 dark:border-gray-700/50">
          <Cell><strong>#{payment.id}</strong><Small>{payment.provider_payment_id || '-'}</Small></Cell>
          <Cell>{payment.email || payment.full_name || 'Удаленный пользователь'}</Cell>
          <Cell>{payment.plan === 'year' ? 'Год' : 'Месяц'}</Cell>
          <Cell><strong>{formatCurrency(payment.amount)}</strong></Cell>
          <Cell>{payment.payment_method}</Cell>
          <Cell><Badge variant={payment.status === 'paid' ? 'success' : 'warning'} size="sm">{payment.status}</Badge></Cell>
          <Cell>{formatDate(payment.created_at, true)}</Cell>
        </tr>
      ))}
    </DataTable>
  );
}

function UsersTable({ users, onEdit, onDelete }) {
  return (
    <DataTable minWidth="900px" headers={['Пользователь', 'Семьи', 'Задачи', 'Транзакции', 'Подписка', 'Создан', '']}>
      {users.map((user) => (
        <tr key={user.id} className="border-b border-gray-50 dark:border-gray-700/50">
          <Cell><strong>{user.full_name || 'Без имени'}</strong><Small>{user.email}</Small></Cell>
          <Cell>{user.family_count || 0}</Cell>
          <Cell>{user.task_count || 0}</Cell>
          <Cell>{user.transaction_count || 0}</Cell>
          <Cell><Badge variant={user.has_subscription ? 'success' : 'default'} size="sm">{user.has_subscription ? 'Plus' : 'Free'}</Badge></Cell>
          <Cell>{formatDate(user.created_at)}</Cell>
          <Cell><RowActions onEdit={() => onEdit(user)} onDelete={() => onDelete(user.id)} /></Cell>
        </tr>
      ))}
    </DataTable>
  );
}

function FamiliesTable({ families, onEdit, onDelete }) {
  return (
    <DataTable minWidth="900px" headers={['Семья', 'Участники', 'Задачи', 'Бюджет', 'Файлы', 'Код', '']}>
      {families.map((family) => (
        <tr key={family.id} className="border-b border-gray-50 dark:border-gray-700/50">
          <Cell><strong>{family.name}</strong><Small>{family.description || 'Без описания'}</Small></Cell>
          <Cell>{family.member_count || 0}</Cell>
          <Cell>{family.task_count || 0}</Cell>
          <Cell>{formatCurrency(Number(family.income || 0) - Number(family.expense || 0))}</Cell>
          <Cell>{family.file_count || 0}</Cell>
          <Cell>{family.invite_code || '-'}</Cell>
          <Cell><RowActions onEdit={() => onEdit(family)} onDelete={() => onDelete(family.id)} /></Cell>
        </tr>
      ))}
    </DataTable>
  );
}

function TasksTable({ tasks, onEdit, onDelete }) {
  return (
    <DataTable minWidth="1000px" headers={['Задача', 'Семья', 'Исполнитель', 'Статус', 'Приоритет', 'Дедлайн', 'Вложения', '']}>
      {tasks.map((task) => (
        <tr key={task.id} className="border-b border-gray-50 dark:border-gray-700/50">
          <Cell><strong>{task.title}</strong><Small>{task.description || 'Без комментария'}</Small></Cell>
          <Cell>{task.family_name || 'Личная'}</Cell>
          <Cell>{task.executor_name || 'Не назначен'}</Cell>
          <Cell><Badge variant={task.status === 'done' ? 'success' : task.status === 'in_progress' ? 'info' : 'default'} size="sm">{taskStatusLabels[task.status] || task.status}</Badge></Cell>
          <Cell><Badge variant={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'default'} size="sm">{priorityLabels[task.priority] || task.priority}</Badge></Cell>
          <Cell>{formatDate(task.deadline)}</Cell>
          <Cell>{task.attachment_count || 0}</Cell>
          <Cell><RowActions onEdit={() => onEdit(task)} onDelete={() => onDelete(task.id)} /></Cell>
        </tr>
      ))}
    </DataTable>
  );
}

function FilesTable({ files, onEdit, onDelete }) {
  return (
    <DataTable minWidth="1000px" headers={['Файл', 'Тип', 'Семья', 'Загрузил', 'Связь', 'Размер', 'Дата', '']}>
      {files.map((file) => (
        <tr key={file.id} className="border-b border-gray-50 dark:border-gray-700/50">
          <Cell>
            <strong>{file.file_name || 'Без названия'}</strong>
            <a href={`${API_ORIGIN}${file.file_path}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:underline">
              Открыть <ExternalLink className="w-3 h-3" />
            </a>
          </Cell>
          <Cell><Badge size="sm">{fileTypeLabels[file.file_type] || file.file_type}</Badge></Cell>
          <Cell>{file.family_name || '-'}</Cell>
          <Cell>{file.uploader_email || file.uploader_name || '-'}</Cell>
          <Cell>{file.task_title || file.transaction_description || '-'}</Cell>
          <Cell>{formatBytes(file.file_size)}</Cell>
          <Cell>{formatDate(file.created_at, true)}</Cell>
          <Cell><RowActions onEdit={() => onEdit(file)} onDelete={() => onDelete(file.id)} /></Cell>
        </tr>
      ))}
    </DataTable>
  );
}

function PasswordsPanel({ passwords, onEdit, onDelete }) {
  return (
    <div className="space-y-4">
      <Card className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <div>
          <p className="font-semibold text-amber-900 dark:text-amber-100">Password vault защищен от просмотра админом</p>
          <p className="text-sm text-amber-800/80 dark:text-amber-200/80">
            Админ видит метаданные, может удалить запись или заменить секрет, но старый пароль не расшифровывается и не показывается.
          </p>
        </div>
        <Badge variant="success">Правильная модель доступа</Badge>
      </Card>
      <DataTable minWidth="1100px" headers={['Сервис', 'Логин', 'Пароль', 'URL', 'Семья', 'Владелец', 'Видимость', '']}>
        {passwords.map((entry) => (
          <tr key={entry.id} className="border-b border-gray-50 dark:border-gray-700/50">
            <Cell><strong>{entry.service_name}</strong><Small>ID {entry.id}</Small></Cell>
            <Cell>{entry.login || '-'}</Cell>
            <Cell><code className="rounded-lg bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs">encrypted</code></Cell>
            <Cell>{entry.url ? <a href={entry.url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">{entry.url}</a> : '-'}</Cell>
            <Cell>{entry.family_name || '-'}</Cell>
            <Cell>{entry.owner_email || entry.owner_name || '-'}</Cell>
            <Cell><Badge size="sm">{visibilityLabels[entry.visibility_level] || entry.visibility_level}</Badge></Cell>
            <Cell><RowActions onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)} /></Cell>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function ReportsPanel({ onExport }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {reportCards.map((report) => (
        <Card key={report.id} className="flex flex-col justify-between gap-5">
          <div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{report.title}</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => onExport(report.id, 'pdf')} icon={<FileText className="w-4 h-4" />}>PDF</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => onExport(report.id, 'xlsx')} icon={<Download className="w-4 h-4" />}>Excel</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SupportTable({ tickets, onChange, onUpdate, onDelete }) {
  return (
    <Card className="space-y-3">
      {tickets.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Обращений пока нет.</p>
      ) : tickets.map((ticket) => (
        <div key={ticket.id} className="rounded-2xl bg-gray-50 dark:bg-gray-700/50 p-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{ticket.subject}</p>
              <p className="text-xs text-gray-500">{ticket.email || ticket.full_name || 'Пользователь'} • {formatDate(ticket.created_at, true)}</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{ticket.message}</p>
              {ticket.admin_response && <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-300">Ответ: {ticket.admin_response}</p>}
            </div>
            <select value={ticket.status} onChange={(e) => onUpdate(ticket.id, { status: e.target.value })} className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
              {Object.entries(supportStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto_auto]">
            <textarea value={ticket.admin_response || ''} onChange={(e) => onChange(ticket.id, { admin_response: e.target.value })} rows={2} placeholder="Ответ администратора" className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            <Button type="button" size="sm" onClick={() => onUpdate(ticket.id, { admin_response: ticket.admin_response || '' })}>Сохранить ответ</Button>
            <button onClick={() => onDelete(ticket.id)} className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 className="w-4 h-4" /> Удалить
            </button>
          </div>
        </div>
      ))}
    </Card>
  );
}

function FeedbackTable({ feedback, onDelete }) {
  return (
    <Card className="space-y-3">
      {feedback.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Отзывов пока нет.</p>
      ) : feedback.map((item) => (
        <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 p-4">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{item.full_name || item.email || 'Анонимно'}</p>
            <p className="text-xs text-gray-500">{formatDate(item.created_at, true)}</p>
            <div className="mt-2 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, index) => {
                const filled = Number(item.rating || 0) >= index + 1;
                return (
                  <Star
                    key={index}
                    className={`h-4 w-4 ${filled ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                  />
                );
              })}
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                {item.rating ? `${item.rating}/5` : 'без оценки'}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{item.message}</p>
          </div>
          <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </Card>
  );
}

function AuditTable({ logs }) {
  return (
    <DataTable minWidth="900px" headers={['Дата', 'Админ', 'Действие', 'Сущность', 'ID', 'Детали']}>
      {logs.map((log) => (
        <tr key={log.id} className="border-b border-gray-50 dark:border-gray-700/50">
          <Cell>{formatDate(log.created_at, true)}</Cell>
          <Cell>{log.admin_email || log.admin_name || '-'}</Cell>
          <Cell><Badge size="sm" variant="info">{log.action}</Badge></Cell>
          <Cell>{log.entity_type}</Cell>
          <Cell>{log.entity_id || '-'}</Cell>
          <Cell><Small>{typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {})}</Small></Cell>
        </tr>
      ))}
    </DataTable>
  );
}

function AdminProfile({ user, profileForm, setProfileForm, onSubmit, passwordForm, setPasswordForm, onPasswordSubmit, saving }) {
  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-6">
      <Card className="text-center">
        <div className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-4xl font-black">
          {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'A'}
        </div>
        <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{user?.fullName || 'Администратор'}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
        <Badge className="mt-4" variant="primary">Отдельный админ-профиль</Badge>
      </Card>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="ФИО" value={profileForm.fullName} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} />
          <Input label="Email" type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
          <Input label="Телефон" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
          <Input label="Дата рождения" type="date" value={profileForm.birthDate} onChange={(e) => setProfileForm({ ...profileForm, birthDate: e.target.value })} />
          <Button type="submit" loading={saving}>Сохранить профиль</Button>
        </form>
      </Card>
      <Card className="lg:col-start-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-indigo-500" />
          Смена пароля администратора
        </h3>
        <form onSubmit={onPasswordSubmit} className="space-y-4">
          <Input
            label="Текущий пароль"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            required
          />
          <div className="grid md:grid-cols-2 gap-4">
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
          <Button type="submit" variant="secondary" loading={saving} icon={<KeyRound className="w-4 h-4" />}>
            Изменить пароль
          </Button>
        </form>
      </Card>
    </div>
  );
}

function DataTable({ headers, children, minWidth }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-xs uppercase tracking-wider text-gray-500">
            {headers.map((header) => <th key={header} className="pb-3 px-3">{header}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </Card>
  );
}

function Cell({ children }) {
  return <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300 align-top">{children}</td>;
}

function Small({ children }) {
  return <p className="text-xs text-gray-500 dark:text-gray-400">{children}</p>;
}

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex gap-2 justify-end">
      <button onClick={onEdit} className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
        <Edit2 className="w-4 h-4" />
      </button>
      <button onClick={onDelete} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <textarea value={value} onChange={onChange} rows={3} className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <select value={value} onChange={onChange} className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      <div className="min-h-[42px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
        {value}
      </div>
    </div>
  );
}

function ModalActions({ onCancel, saving }) {
  return (
    <div className="flex gap-3 pt-2">
      <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Отмена</Button>
      <Button type="submit" loading={saving} className="flex-1">Сохранить</Button>
    </div>
  );
}

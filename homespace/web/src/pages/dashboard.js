import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Plus, Filter, CheckCircle, Clock, AlertCircle, ListTodo, User, Users, Paperclip, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import TaskCard from '../components/TaskCard';
import EmptyState from '../components/ui/EmptyState';
import Loading, { CardSkeleton } from '../components/ui/Loading';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [families, setFamilies] = useState([]);
  const [stats, setStats] = useState({ total: 0, new_count: 0, in_progress_count: 0, done_count: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ familyId: '', status: '', executor: '', priority: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', deadline: '', description: '', priority: 'medium', executor_id: '' });
  const [taskAttachment, setTaskAttachment] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [mode, setMode] = useState('personal');

  useEffect(() => {
    if (router.isReady) fetchFamilies();
  }, [router.isReady]);

  useEffect(() => {
    if (mode === 'family' && families.length > 0 && filters.familyId) {
      fetchTasks();
      fetchStats();
    } else if (mode === 'personal') {
      fetchTasks();
      fetchStats();
    }
  }, [filters.familyId, filters.status, filters.executor, filters.priority, mode]);

  useEffect(() => {
    if (mode === 'family' && families.length > 0 && filters.familyId) {
      fetchTasks();
      fetchStats();
    }
  }, [mode]);

  const fetchFamilies = async () => {
    try {
      const res = await api.get('/families');
      const data = res.data.data || [];
      setFamilies(data);
      if (data.length > 0) {
        const queryFamilyId = router.query.familyId ? String(router.query.familyId) : '';
        const selectedFamilyId = queryFamilyId || String(data[0].id);
        setFilters((prev) => ({ ...prev, familyId: selectedFamilyId }));
        if (queryFamilyId) setMode('family');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (mode === 'family' && filters.familyId) params.familyId = filters.familyId;
      if (filters.status) params.status = filters.status;
      if (filters.executor) params.executor = filters.executor;
      if (filters.priority) params.priority = filters.priority;
      const res = await api.get('/tasks', { params });
      setTasks(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = {};
      if (mode === 'family' && filters.familyId) params.familyId = filters.familyId;
      const res = await api.get('/tasks/stats', { params });
      const d = res.data.data.overall || {};
      setStats({
        total: d.total || 0,
        new: d.new_count || 0,
        in_progress: d.in_progress_count || 0,
        done: d.done_count || 0,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const params = mode === 'family' ? { familyId: filters.familyId } : {};
      const res = await api.post('/tasks', { ...newTask }, { params });
      const createdTask = res.data.data;

      if (taskAttachment && createdTask?.id) {
        const formData = new FormData();
        formData.append('file', taskAttachment);
        if (mode === 'family' && filters.familyId) formData.append('familyId', filters.familyId);
        formData.append('relatedTaskId', createdTask.id);
        formData.append('file_type', taskAttachment.type.startsWith('image/') ? 'image' : 'document');
        await api.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      setShowCreateModal(false);
      setNewTask({ title: '', deadline: '', description: '', priority: 'medium', executor_id: '' });
      setTaskAttachment(null);
      fetchTasks();
      fetchStats();
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось создать задачу.');
    } finally {
      setCreateLoading(false);
    }
  };

  const currentFamily = families.find((f) => String(f.id) === String(filters.familyId));

  return (
    <>
      <Head><title>Задачи — HomeSpace</title></Head>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Задачи</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {mode === 'personal' ? 'Ваши личные задачи' : 'Управляйте задачами вашей семьи'}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" />}>
            Новая задача
          </Button>
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
              Мои задачи
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
              Задачи семьи
            </button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <ListTodo className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Всего</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.new}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Новые</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.in_progress}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">В работе</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.done}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Готово</p>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-gray-400" />
            {mode === 'family' && (
              <Select
                options={families.map((f) => ({ value: f.id, label: f.name }))}
                value={filters.familyId}
                onChange={(e) => setFilters((prev) => ({ ...prev, familyId: e.target.value }))}
                placeholder="Семья"
                className="w-auto min-w-32"
              />
            )}
            <Select
              options={[
                { value: 'new', label: 'Новая' },
                { value: 'in_progress', label: 'В работе' },
                { value: 'done', label: 'Готово' },
              ]}
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              placeholder="Статус"
              className="w-auto min-w-32"
            />
            <Select
              options={[
                { value: 'low', label: 'Низкий' },
                { value: 'medium', label: 'Средний' },
                { value: 'high', label: 'Высокий' },
              ]}
              value={filters.priority}
              onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
              placeholder="Приоритет"
              className="w-auto min-w-32"
            />
            {mode === 'family' && currentFamily?.members?.length > 0 && (
              <Select
                options={currentFamily.members.map((m) => ({ value: m.id, label: m.full_name || m.fullName || m.email }))}
                value={filters.executor}
                onChange={(e) => setFilters((prev) => ({ ...prev, executor: e.target.value }))}
                placeholder="Все участники"
                className="w-auto min-w-40"
              />
            )}
            {(filters.status || filters.priority || filters.executor) && (
              <button
                onClick={() => setFilters({ familyId: filters.familyId, status: '', executor: '', priority: '' })}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Сбросить
              </button>
            )}
          </div>
        </Card>

        {/* Task List */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="Нет задач"
            description={mode === 'personal' ? 'Создайте свою первую личную задачу' : 'Создайте первую задачу для вашей семьи'}
            action={<Button onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" />}>Создать задачу</Button>}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                members={currentFamily?.members || []}
                onUpdate={() => { fetchTasks(); fetchStats(); }}
                onDelete={() => { fetchTasks(); fetchStats(); }}
              />
            ))}
          </div>
        )}

        {/* Create Task Modal */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Новая задача" size="md">
          <form onSubmit={createTask} className="space-y-4">
            <Input
              label="Название"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="Что нужно сделать?"
              required
            />
            <Input
              label="Срок"
              type="date"
              value={newTask.deadline}
              onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Описание</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Подробности задачи..."
              />
            </div>
            <Select
              label="Приоритет"
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              options={[
                { value: 'low', label: 'Низкий' },
                { value: 'medium', label: 'Средний' },
                { value: 'high', label: 'Высокий' },
              ]}
            />
            {mode === 'family' && (
              <Select
                label="Исполнитель"
                value={newTask.executor_id}
                onChange={(e) => setNewTask({ ...newTask, executor_id: e.target.value })}
                options={(currentFamily?.members || []).map((m) => ({ value: m.id, label: m.full_name || m.fullName || m.email }))}
              />
            )}
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-600 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" /> Вложение к задаче
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Файл будет прикреплён сразу после создания задачи. На free действует общий лимит 20 файлов.
                  </p>
                </div>
                {taskAttachment && (
                  <button
                    type="button"
                    onClick={() => setTaskAttachment(null)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {taskAttachment ? (
                <p className="text-sm text-gray-700 dark:text-gray-200 mt-3 truncate">{taskAttachment.name}</p>
              ) : (
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                  <Paperclip className="w-4 h-4" />
                  Выбрать файл
                  <input type="file" className="hidden" onChange={(e) => setTaskAttachment(e.target.files?.[0] || null)} />
                </label>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)} className="flex-1">
                Отмена
              </Button>
              <Button type="submit" variant="primary" loading={createLoading} className="flex-1">
                Создать
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}

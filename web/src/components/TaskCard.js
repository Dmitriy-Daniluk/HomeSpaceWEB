import { useState } from 'react';
import { Clock, CheckCircle, AlertCircle, User, MoreVertical, Trash2, Edit2, Calendar } from 'lucide-react';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Modal from './ui/Modal';
import api from '../utils/api';

const priorityConfig = {
  low: { label: 'Низкий', variant: 'success' },
  medium: { label: 'Средний', variant: 'warning' },
  high: { label: 'Высокий', variant: 'danger' },
};

const statusConfig = {
  new: { label: 'Новая', variant: 'info' },
  in_progress: { label: 'В работе', variant: 'warning' },
  done: { label: 'Готово', variant: 'success' },
};

function getDaysRemaining(deadline) {
  if (!deadline) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: `Просрочено на ${Math.abs(diff)} дн.`, color: 'text-red-500' };
  if (diff === 0) return { text: 'Сегодня', color: 'text-amber-500' };
  if (diff === 1) return { text: 'Остался 1 день', color: 'text-amber-500' };
  if (diff <= 3) return { text: `Осталось ${diff} дн.`, color: 'text-amber-500' };
  return { text: `Осталось ${diff} дн.`, color: 'text-gray-500 dark:text-gray-400' };
}

export default function TaskCard({ task, onUpdate, onDelete, members = [] }) {
  const [showActions, setShowActions] = useState(false);
  const [status, setStatus] = useState(task.status);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: task.title || '',
    description: task.description || '',
    deadline: task.deadline ? task.deadline.split('T')[0] : '',
    priority: task.priority || 'medium',
    executor_id: task.executor_id || '',
    status: task.status || 'new',
  });
  const [editLoading, setEditLoading] = useState(false);

  const handleStatusChange = async (newStatus) => {
    try {
      await api.put(`/tasks/${task.id}`, { ...task, status: newStatus });
      setStatus(newStatus);
      onUpdate?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Удалить задачу?')) {
      try {
        await api.delete(`/tasks/${task.id}`);
        onDelete?.();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await api.put(`/tasks/${task.id}`, editForm);
      setShowEditModal(false);
      onUpdate?.();
    } catch (err) {
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const executor = members.find((m) => m.id === task.executor_id);
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const st = statusConfig[status] || statusConfig.new;
  const daysRemaining = getDaysRemaining(task.deadline);
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && status !== 'done';

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={priority.variant} size="sm">{priority.label}</Badge>
              {isOverdue && (
                <Badge variant="danger" size="sm" dot>Просрочена</Badge>
              )}
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{task.title}</h3>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-all"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
            {showActions && (
              <div className="absolute right-0 top-8 bg-white dark:bg-gray-700 rounded-xl shadow-xl border border-gray-100 dark:border-gray-600 py-2 w-40 z-10 animate-fade-in">
                <button
                  onClick={() => { setShowEditModal(true); setShowActions(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <Edit2 className="w-4 h-4" /> Редактировать
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" /> Удалить
                </button>
              </div>
            )}
          </div>
        </div>

        {task.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm">
          {task.deadline && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
              <Calendar className="w-3.5 h-3.5" />
              {new Date(task.deadline).toLocaleDateString('ru-RU')}
              {daysRemaining && (
                <span className={`text-xs ${daysRemaining.color}`}>({daysRemaining.text})</span>
              )}
            </span>
          )}
          {executor && (
            <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <User className="w-3.5 h-3.5" />
              {executor.fullName}
            </span>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Статус:</span>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-sm bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            {Object.entries(statusConfig).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <Badge variant={st.variant} size="sm" className="ml-auto">
            {st.label}
          </Badge>
        </div>
      </div>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Редактировать задачу" size="md">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            label="Название"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            placeholder="Что нужно сделать?"
            required
          />
          <Input
            label="Срок"
            type="date"
            value={editForm.deadline}
            onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Описание</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Подробности задачи..."
            />
          </div>
          <Select
            label="Приоритет"
            value={editForm.priority}
            onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
            options={[
              { value: 'low', label: 'Низкий' },
              { value: 'medium', label: 'Средний' },
              { value: 'high', label: 'Высокий' },
            ]}
          />
          <Select
            label="Исполнитель"
            value={editForm.executor_id}
            onChange={(e) => setEditForm({ ...editForm, executor_id: e.target.value })}
            options={members.map((m) => ({ value: m.id, label: m.fullName }))}
          />
          <Select
            label="Статус"
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            options={[
              { value: 'new', label: 'Новая' },
              { value: 'in_progress', label: 'В работе' },
              { value: 'done', label: 'Готово' },
            ]}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={editLoading} className="flex-1">
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Bell, CheckCheck, Mail, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import api from '../utils/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Loading from '../components/ui/Loading';

const typeIcons = {
  task: CheckCircle,
  budget: Mail,
  family: Info,
  system: AlertTriangle,
  default: Bell,
};

const typeVariants = {
  task: 'success',
  budget: 'warning',
  family: 'info',
  system: 'danger',
  default: 'default',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) return <Loading text="Загрузка уведомлений..." />;

  return (
    <>
      <Head><title>Уведомления — HomeSpace</title></Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-7 h-7 text-gray-700 dark:text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Уведомления</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {unreadCount > 0 ? `${unreadCount} непрочитанных` : 'Все прочитаны'}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={markAllAsRead} loading={markingAll} icon={<CheckCheck className="w-4 h-4" />}>
              Прочитать все
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="Нет уведомлений" description="Здесь будут появляться ваши уведомления" />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = typeIcons[n.type] || typeIcons.default;
              const variant = typeVariants[n.type] || typeVariants.default;
              return (
                <Card
                  key={n.id}
                  className={`p-4 transition-all cursor-pointer ${
                    !n.is_read
                      ? 'border-l-4 border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10'
                      : 'opacity-70'
                  }`}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      !n.is_read
                        ? 'bg-indigo-100 dark:bg-indigo-900/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        !n.is_read ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!n.is_read ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                          {n.message || n.title}
                        </p>
                        {!n.is_read && (
                          <Badge variant={variant} size="sm" dot>Новое</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(n.createdAt || n.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                        className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

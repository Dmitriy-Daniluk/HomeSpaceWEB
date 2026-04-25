import { useState, useEffect } from 'react';
import Head from 'next/head';
import { LifeBuoy, Plus, Send, MessageSquare, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../utils/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Loading from '../components/ui/Loading';

const statusConfig = {
  open: { label: 'Открыт', variant: 'info', icon: Clock },
  in_progress: { label: 'В работе', variant: 'warning', icon: AlertCircle },
  resolved: { label: 'Решён', variant: 'success', icon: CheckCircle },
};

const faqs = [
  { q: 'Как создать семью?', a: 'Перейдите в раздел "Семья" и нажмите "Создать семью". Заполните название и описание.' },
  { q: 'Как пригласить участника?', a: 'Откройте страницу семьи и нажмите "Пригласить". Введите email или поделитесь кодом.' },
  { q: 'Как добавить задачу?', a: 'На странице "Задачи" нажмите "Новая задача" и заполните все поля.' },
  { q: 'Как экспортировать бюджет?', a: 'На странице "Бюджет" используйте кнопки PDF или Excel для экспорта данных.' },
  { q: 'Как изменить видимость пароля?', a: 'Откройте пароль, нажмите редактировать и выберите нужный уровень видимости.' },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/support/my');
      setTickets(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const submitTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/support', form);
      setShowForm(false);
      setForm({ subject: '', message: '' });
      fetchTickets();
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      <Head><title>Поддержка — HomeSpace</title></Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Поддержка</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Помощь и обращения</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} icon={<Plus className="w-4 h-4" />}>
            Новое обращение
          </Button>
        </div>

        {/* Create Ticket Form */}
        {showForm && (
          <Card className="animate-slide-up">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Создать обращение</h3>
            <form onSubmit={submitTicket} className="space-y-4">
              <Input
                label="Тема"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Кратко опишите проблему"
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Сообщение</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Подробное описание..."
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Отмена</Button>
                <Button type="submit" variant="primary" loading={submitting} className="flex-1" icon={<Send className="w-4 h-4" />}>Отправить</Button>
              </div>
            </form>
          </Card>
        )}

        {/* My Tickets */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Мои обращения
          </h3>
          {loading ? <Loading /> : tickets.length === 0 ? (
            <EmptyState icon={LifeBuoy} title="Нет обращений" description="Создайте обращение, если нужна помощь" />
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => {
                const st = statusConfig[t.status] || statusConfig.open;
                const StatusIcon = st.icon;
                return (
                  <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{t.subject}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(t.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <Badge variant={st.variant} size="sm">
                      <StatusIcon className="w-3 h-3" /> {st.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* FAQ */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Часто задаваемые вопросы</h3>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-gray-500 dark:text-gray-400 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

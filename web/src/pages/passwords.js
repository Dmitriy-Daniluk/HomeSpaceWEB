import { useState, useEffect } from 'react';
import Head from 'next/head';
import { KeyRound, Plus, Eye, EyeOff, Copy, Check, Trash2, Edit2, Search, Shield, ShieldOff, Globe } from 'lucide-react';
import api from '../utils/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Loading from '../components/ui/Loading';

const visibilityConfig = {
  private: { label: 'Приватный', icon: ShieldOff, variant: 'danger' },
  parents: { label: 'Родители', icon: Shield, variant: 'warning' },
  family: { label: 'Семья', icon: Globe, variant: 'success' },
};

export default function PasswordsPage() {
  const [passwords, setPasswords] = useState([]);
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ service_name: '', login: '', password: '', url: '', notes: '', visibility_level: 'private' });
  const [showPassword, setShowPassword] = useState({});
  const [copied, setCopied] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (families.length > 0) fetchPasswords();
  }, [families]);

  const fetchFamilies = async () => {
    try {
      const res = await api.get('/families');
      setFamilies(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchPasswords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (families[0]?.id) params.familyId = families[0].id;
      const res = await api.get('/passwords', { params });
      setPasswords(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, familyId: families[0]?.id };
      if (editItem) {
        await api.put(`/passwords/${editItem.id}`, data);
      } else {
        await api.post('/passwords', data);
      }
      setShowModal(false);
      setEditItem(null);
      setForm({ service_name: '', login: '', password: '', url: '', notes: '', visibility_level: 'private' });
      fetchPasswords();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const deletePassword = async (id) => {
    if (!window.confirm('Удалить пароль?')) return;
    try {
      await api.delete(`/passwords/${id}`);
      fetchPasswords();
    } catch (err) { console.error(err); }
  };

  const editPassword = (item) => {
    setEditItem(item);
    setForm({
      service_name: item.service_name || '',
      login: item.login || '',
      password: item.password || '',
      url: item.url || '',
      notes: item.notes || '',
      visibility_level: item.visibility_level || 'private',
    });
    setShowModal(true);
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleShowPassword = (id) => {
    setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = passwords.filter((p) =>
    (p.service_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.login || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loading text="Загрузка паролей..." />;

  return (
    <>
      <Head><title>Пароли — HomeSpace</title></Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Пароли</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Безопасное хранение паролей</p>
          </div>
          <Button onClick={() => { setEditItem(null); setForm({ service: '', login: '', password: '', url: '', notes: '', visibility_level: 'private' }); setShowModal(true); }} icon={<Plus className="w-4 h-4" />}>
            Добавить пароль
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по сервису или логину..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="Нет сохранённых паролей"
            description="Добавьте первый пароль"
            action={<Button onClick={() => setShowModal(true)} icon={<Plus className="w-4 h-4" />}>Добавить пароль</Button>}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const vis = visibilityConfig[item.visibility_level] || visibilityConfig.private;
              const VisIcon = vis.icon;
              return (
                <Card key={item.id} className="hover:shadow-md transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{item.service}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{item.login}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={vis.variant} size="sm">
                        <VisIcon className="w-3 h-3" /> {vis.label}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard(item.login, `login-${item.id}`)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 transition-colors"
                          title="Копировать логин"
                        >
                          {copied === `login-${item.id}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(item.password, `pass-${item.id}`)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 transition-colors"
                          title="Копировать пароль"
                        >
                          {copied === `pass-${item.id}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => toggleShowPassword(item.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 transition-colors"
                          title="Показать/скрыть"
                        >
                          {showPassword[item.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => editPassword(item)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 transition-colors" title="Редактировать">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deletePassword(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Удалить">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {showPassword[item.id] && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg font-mono text-sm text-gray-700 dark:text-gray-300 animate-fade-in">
                      {item.password}
                    </div>
                  )}
                  {item.url && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{item.url}</p>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal */}
        <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Редактировать пароль' : 'Новый пароль'}>
          <form onSubmit={savePassword} className="space-y-4">
            <Input label="Сервис" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} placeholder="Google, VK..." required />
            <Input label="Логин" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} placeholder="username@email.com" required />
            <Input label="Пароль" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
            <Input label="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Заметки</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <Badge variant="info" className="text-xs">Видимость</Badge>
            <select
              value={form.visibility_level}
              onChange={(e) => setForm({ ...form, visibility_level: e.target.value })}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="private">Приватный</option>
              <option value="parents">Родители</option>
              <option value="family">Семья</option>
            </select>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditItem(null); }} className="flex-1">Отмена</Button>
              <Button type="submit" variant="primary" loading={saving} className="flex-1" icon={<KeyRound className="w-4 h-4" />}>{editItem ? 'Сохранить' : 'Добавить'}</Button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}

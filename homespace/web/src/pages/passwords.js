import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { KeyRound, Plus, Eye, EyeOff, Copy, Check, Trash2, Edit2, Search, Shield, ShieldOff, Globe, ExternalLink, Filter } from 'lucide-react';
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

const getExternalUrl = (url) => {
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

export default function PasswordsPage() {
  const [passwords, setPasswords] = useState([]);
  const [families, setFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [sortBy, setSortBy] = useState('service');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ service: '', login: '', password: '', url: '', notes: '', visibility_level: 'private' });
  const [showPassword, setShowPassword] = useState({});
  const [copied, setCopied] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) fetchPasswords();
  }, [selectedFamilyId]);

  const fetchFamilies = async () => {
    try {
      const res = await api.get('/families');
      const data = res.data.data || [];
      setFamilies(data);
      if (data.length > 0) setSelectedFamilyId(String(data[0].id));
      if (data.length === 0) setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  const fetchPasswords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedFamilyId) params.familyId = selectedFamilyId;
      const res = await api.get('/passwords', { params });
      setPasswords(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, familyId: selectedFamilyId };
      if (editItem) {
        await api.put(`/passwords/${editItem.id}`, data);
      } else {
        await api.post('/passwords', data);
      }
      setShowModal(false);
      setEditItem(null);
      setForm({ service: '', login: '', password: '', url: '', notes: '', visibility_level: 'private' });
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
      service: item.service || item.service_name || '',
      login: item.login || '',
      password: item.password || item.encrypted_password || '',
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

  const normalizedSearch = search.trim().toLowerCase();
  const groupOrder = { private: 1, parents: 2, family: 3 };
  const filtered = passwords.filter((p) => {
    const service = p.service || p.service_name || '';
    const url = p.url || '';
    const login = p.login || '';
    const visibility = p.visibility_level || 'private';

    const matchesGroup = !groupFilter || visibility === groupFilter;
    const matchesSearch =
      !normalizedSearch ||
      service.toLowerCase().includes(normalizedSearch) ||
      url.toLowerCase().includes(normalizedSearch) ||
      login.toLowerCase().includes(normalizedSearch);

    return matchesGroup && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'group') {
      return (groupOrder[a.visibility_level || 'private'] || 0) - (groupOrder[b.visibility_level || 'private'] || 0);
    }

    return (a.service || a.service_name || '').localeCompare(b.service || b.service_name || '', 'ru');
  });

  if (loading) return <Loading text="Загрузка паролей..." />;

  const selectedFamily = families.find((family) => String(family.id) === String(selectedFamilyId));
  const visibilityStats = passwords.reduce((acc, item) => {
    const level = item.visibility_level || 'private';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  if (families.length === 0) {
    return (
      <>
        <Head><title>Пароли — HomeSpace</title></Head>
        <EmptyState
          icon={KeyRound}
          title="Сначала создайте семью"
          description="Хранилище паролей работает внутри семейной группы и поддерживает личную, родительскую и общую видимость."
          action={<Link href="/family"><Button>Перейти к семьям</Button></Link>}
        />
      </>
    );
  }

  return (
    <>
      <Head><title>Пароли — HomeSpace</title></Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Пароли</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {selectedFamily ? `Безопасное хранение для семьи: ${selectedFamily.name}` : 'Безопасное хранение паролей'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <SelectFamily
              families={families}
              selectedFamilyId={selectedFamilyId}
              setSelectedFamilyId={setSelectedFamilyId}
            />
            <Button onClick={() => { setEditItem(null); setForm({ service: '', login: '', password: '', url: '', notes: '', visibility_level: 'private' }); setShowModal(true); }} icon={<Plus className="w-4 h-4" />}>
              Добавить пароль
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {Object.entries(visibilityConfig).map(([level, config]) => {
            const Icon = config.icon;
            return (
              <Card key={level} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{visibilityStats[level] || 0}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{config.label}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid md:grid-cols-[1fr_auto_auto] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию, ссылке или логину..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="w-full md:w-56 pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Все группы</option>
              <option value="private">Приватные</option>
              <option value="parents">Родители</option>
              <option value="family">Семья</option>
            </select>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full md:w-48 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="service">Сортировка: название</option>
            <option value="group">Сортировка: группа</option>
          </select>
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
                        <p className="font-medium text-gray-900 dark:text-white truncate">{item.service || item.service_name}</p>
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
                          onClick={() => copyToClipboard(item.password || item.encrypted_password, `pass-${item.id}`)}
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
                      {item.password || item.encrypted_password}
                    </div>
                  )}
                  {item.url && (
                    <a
                      href={getExternalUrl(item.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 mt-2 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {item.url}
                    </a>
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

function SelectFamily({ families, selectedFamilyId, setSelectedFamilyId }) {
  return (
    <select
      value={selectedFamilyId}
      onChange={(e) => setSelectedFamilyId(e.target.value)}
      className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {families.map((family) => (
        <option key={family.id} value={family.id}>{family.name}</option>
      ))}
    </select>
  );
}

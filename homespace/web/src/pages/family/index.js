import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Users, Plus, Target, UserCheck, ArrowRight } from 'lucide-react';
import api from '../../utils/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Loading from '../../components/ui/Loading';

export default function FamilyListPage() {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newFamily, setNewFamily] = useState({ name: '', description: '', savings_goal: '' });
  const [inviteCode, setInviteCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFamilies();
  }, []);

  const fetchFamilies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/families');
      setFamilies(res.data.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Не удалось загрузить семьи');
    } finally {
      setLoading(false);
    }
  };

  const createFamily = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const res = await api.post('/families', {
        ...newFamily,
        savings_goal: newFamily.savings_goal ? Number(newFamily.savings_goal) : undefined,
      });
      setShowCreateModal(false);
      setNewFamily({ name: '', description: '', savings_goal: '' });
      await fetchFamilies();
      if (res.data.data?.id) {
        window.location.href = `/family/${res.data.data.id}`;
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Не удалось создать семью');
    } finally {
      setCreating(false);
    }
  };

  const joinFamily = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await api.post('/families/join', { inviteCode });
      setShowJoinModal(false);
      setInviteCode('');
      fetchFamilies();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Не удалось вступить в семью');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Loading text="Загрузка семей..." />;

  return (
    <>
      <Head><title>Семья — HomeSpace</title></Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Семейные группы</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Управление семьями и участниками</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowJoinModal(true)}>
              Вступить
            </Button>
            <Button onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" />}>
              Создать семью
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {families.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Нет семейных групп"
            description="Создайте свою первую семью или вступите по коду"
            action={
              <div className="flex gap-3">
                <Button onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" />}>Создать</Button>
                <Button variant="secondary" onClick={() => setShowJoinModal(true)}>Вступить</Button>
              </div>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {families.map((f) => (
              <Link key={f.id} href={`/family/${f.id}`}>
                <Card hover className="cursor-pointer group h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{f.name}</h3>
                  {f.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{f.description}</p>}
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-4 h-4" /> {f.members?.length || 0}
                    </span>
                    {f.savings_goal > 0 && (
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" /> {f.savings_goal.toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <Badge variant="primary" size="sm">{f.role || 'Участник'}</Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Создать семью">
          <form onSubmit={createFamily} className="space-y-4">
            <Input
              label="Название"
              value={newFamily.name}
              onChange={(e) => setNewFamily({ ...newFamily, name: e.target.value })}
              placeholder="Семья Ивановых"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Описание</label>
              <textarea
                value={newFamily.description}
                onChange={(e) => setNewFamily({ ...newFamily, description: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Описание семьи..."
              />
            </div>
            <Input
              label="Цель накоплений (₽)"
              type="number"
              value={newFamily.savings_goal}
              onChange={(e) => setNewFamily({ ...newFamily, savings_goal: e.target.value })}
              placeholder="100000"
            />
            <Button type="submit" variant="primary" loading={creating} className="w-full" icon={<Plus className="w-4 h-4" />}>
              Создать
            </Button>
          </form>
        </Modal>

        {/* Join Modal */}
        <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="Вступить в семью">
          <form onSubmit={joinFamily} className="space-y-4">
            <Input
              label="Код приглашения"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Введите код"
              required
            />
            <Button type="submit" variant="primary" loading={creating} className="w-full">
              Вступить
            </Button>
          </form>
        </Modal>
      </div>
    </>
  );
}

function Badge({ children, variant = 'default', size = 'md' }) {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    primary: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  };
  const sizes = { sm: 'px-2 py-0.5 text-xs', md: 'px-2.5 py-1 text-sm' };
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
}

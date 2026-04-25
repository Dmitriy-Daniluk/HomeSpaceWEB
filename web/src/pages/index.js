import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import {
  CheckSquare, Wallet, KeyRound, MapPin, FileText, Users,
  ArrowRight, Star, Send, Menu, X, ChevronRight, Sparkles,
  Shield, Zap, Clock, Download, Smartphone, QrCode, Database,
  Activity, MessageCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const defaultOverview = {
  stats: {
    users: 0,
    families: 0,
    tasks: 0,
    completedTasks: 0,
    activeTasks: 0,
    completionRate: 0,
    transactions: 0,
    files: 0,
    feedback: 0,
    averageRating: 0,
  },
  feedback: [],
};

const formatNumber = (value) => Number(value || 0).toLocaleString('ru-RU');

export default function Home() {
  const { user, logout } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [overview, setOverview] = useState(defaultOverview);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [feedback, setFeedback] = useState({ name: '', email: '', message: '', rating: 5 });
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [policyTab, setPolicyTab] = useState(null);

  const fetchOverview = async () => {
    try {
      const res = await api.get('/public/overview');
      setOverview(res.data.data || defaultOverview);
    } catch (err) {
      console.error(err);
      setOverview(defaultOverview);
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const sendFeedback = async (e) => {
    e.preventDefault();
    try {
      await api.post('/feedback', feedback);
      setFeedbackSent(true);
      setFeedback({ name: '', email: '', message: '', rating: 5 });
      fetchOverview();
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const features = [
    { icon: CheckSquare, title: 'Управление задачами', desc: 'Создавайте, назначайте и отслеживайте задачи для всей семьи', color: 'from-blue-500 to-cyan-500', border: 'border-t-blue-400' },
    { icon: Wallet, title: 'Семейный бюджет', desc: 'Контролируйте доходы и расходы, ставьте финансовые цели', color: 'from-emerald-500 to-teal-500', border: 'border-t-emerald-400' },
    { icon: KeyRound, title: 'Хранение паролей', desc: 'Безопасное хранение паролей с разным уровнем доступа', color: 'from-purple-500 to-pink-500', border: 'border-t-purple-400' },
    { icon: MapPin, title: 'Геолокация', desc: 'Отслеживайте местоположение членов семьи и создавайте геозоны', color: 'from-orange-500 to-red-500', border: 'border-t-orange-400' },
    { icon: FileText, title: 'Файлы и документы', desc: 'Храните важные документы, чеки и фотографии в одном месте', color: 'from-indigo-500 to-blue-500', border: 'border-t-indigo-400' },
    { icon: Users, title: 'Семейные группы', desc: 'Объединяйте семью, приглашайте участников, управляйте ролями', color: 'from-pink-500 to-rose-500', border: 'border-t-pink-400' },
  ];

  const heroStats = [
    { value: formatNumber(overview.stats.families), label: 'семей в базе' },
    { value: formatNumber(overview.stats.tasks), label: 'задач создано' },
    { value: `${overview.stats.completionRate || 0}%`, label: 'задач закрыто' },
  ];

  const productPulse = [
    { icon: CheckSquare, value: overview.stats.activeTasks, label: 'активных задач', color: 'text-indigo-500', accent: 'border-l-indigo-400' },
    { icon: Wallet, value: overview.stats.transactions, label: 'операций бюджета', color: 'text-emerald-500', accent: 'border-l-emerald-400' },
    { icon: FileText, value: overview.stats.files, label: 'файлов в хранилище', color: 'text-amber-500', accent: 'border-l-amber-400' },
    { icon: MessageCircle, value: overview.stats.feedback, label: 'отзывов и идей', color: 'text-rose-500', accent: 'border-l-rose-400' },
  ];

  return (
    <>
      <Head>
        <title>HomeSpace — Умное пространство для вашей семьи</title>
        <meta name="description" content="HomeSpace помогает семьям организовать быт, бюджет и задачи в одном месте" />
      </Head>

      <div className="min-h-screen bg-white dark:bg-gray-950">
        {/* Navbar */}
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">HomeSpace</span>
              </div>

              <div className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Возможности</a>
                <a href="#about" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">О нас</a>
                <a href="#mobile-app" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Мобильное</a>
                <a href="#reviews" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Отзывы</a>
                <a href="#feedback" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Обратная связь</a>
              </div>

              <div className="flex items-center gap-3">
                {user ? (
                  <>
                    <Link href="/profile">
                      <Button variant="secondary" size="sm">Профиль</Button>
                    </Link>
                    <button
                      onClick={logout}
                      className="rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      Выйти
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button variant="secondary" size="sm">Войти</Button>
                    </Link>
                    <Link href="/register">
                      <Button variant="primary" size="sm">Регистрация</Button>
                    </Link>
                  </>
                )}
                <button
                  onClick={() => setMobileMenu(!mobileMenu)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {mobileMenu && (
            <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 animate-slide-up">
              <div className="px-4 py-3 space-y-2">
                <a href="#features" className="block py-2 text-gray-600 dark:text-gray-400" onClick={() => setMobileMenu(false)}>Возможности</a>
                <a href="#about" className="block py-2 text-gray-600 dark:text-gray-400" onClick={() => setMobileMenu(false)}>О нас</a>
                <a href="#mobile-app" className="block py-2 text-gray-600 dark:text-gray-400" onClick={() => setMobileMenu(false)}>Мобильное</a>
                <a href="#reviews" className="block py-2 text-gray-600 dark:text-gray-400" onClick={() => setMobileMenu(false)}>Отзывы</a>
                <a href="#feedback" className="block py-2 text-gray-600 dark:text-gray-400" onClick={() => setMobileMenu(false)}>Обратная связь</a>
                {user && (
                  <>
                    <Link href="/profile" className="block py-2 text-gray-600 dark:text-gray-400" onClick={() => setMobileMenu(false)}>Профиль</Link>
                    <button onClick={() => { setMobileMenu(false); logout(); }} className="block py-2 text-red-600">Выйти</button>
                  </>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/15 to-transparent" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/90 mb-6">
                <Activity className="w-4 h-4" />
                Живые показатели HomeSpace
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
                Умное пространство<br />для вашей <span className="text-yellow-300">семьи</span>
              </h1>
              <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10">
                Организуйте задачи, бюджет, файлы и общение всей семьи в одном удобном приложении. Просто, безопасно, эффективно.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href={user ? '/dashboard' : '/register'}>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-yellow-300 text-gray-950 border-yellow-100 hover:bg-yellow-200 shadow-2xl shadow-yellow-500/30 ring-2 ring-white/70"
                  >
                    {user ? 'Перейти в кабинет' : 'Начать бесплатно'} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button className="bg-white/10 text-white border border-white/30 hover:bg-white/20 backdrop-blur-sm shadow-lg shadow-black/10" size="lg">
                    Узнать больше
                  </Button>
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-16 max-w-xl mx-auto rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-4">
                    <div className="text-3xl font-bold text-white">{overviewLoading ? '...' : stat.value}</div>
                    <div className="text-sm text-white/60">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Всё для вашей семьи
              </h2>
              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                Полный набор инструментов для организации семейной жизни
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <div key={i} className={`group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 border-t-4 ${f.border} shadow-sm ring-1 ring-black/5 dark:ring-white/5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-gray-50 to-transparent opacity-70 dark:from-white/5" />
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <f.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live Data */}
        <section className="py-20 bg-white dark:bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-8 items-stretch">
              <div className="relative overflow-hidden rounded-2xl border border-indigo-200/40 bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-900 p-8 text-white shadow-xl shadow-indigo-950/20 dark:border-indigo-900/60">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 via-indigo-300 to-pink-300" />
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                  <Database className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-bold">Главная теперь смотрит в реальные данные</h2>
                <p className="mt-4 text-sm leading-6 text-indigo-100/80">
                  Эти числа приходят из базы HomeSpace: задачи, бюджетные операции, файлы и отзывы обновляются вместе с жизнью проекта, без заранее нарисованных обещаний.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {productPulse.map((item) => (
                  <div key={item.label} className={`rounded-2xl border border-gray-100 border-l-4 ${item.accent} bg-gray-50 p-6 shadow-sm ring-1 ring-black/5 transition-colors hover:bg-white dark:border-gray-800 dark:bg-gray-900 dark:ring-white/5 dark:hover:bg-gray-800`}>
                    <div className="mb-5 flex items-center justify-between">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-gray-800 ${item.color}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium uppercase text-gray-400">live</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{overviewLoading ? '...' : formatNumber(item.value)}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="py-24 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] dark:bg-[linear-gradient(180deg,#030712_0%,#111827_100%)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                  Почему выбирают <span className="text-indigo-600">HomeSpace</span>?
                </h2>
                <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
                  Мы создали приложение, которое объединяет все аспекты семейной жизни в одном месте. Больше никаких разрозненных заметок и приложений.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: Shield, title: 'Безопасность', desc: 'Ваши данные защищены шифрованием' },
                    { icon: Zap, title: 'Скорость', desc: 'Мгновенная синхронизация между устройствами' },
                    { icon: Clock, title: 'Экономия времени', desc: 'До 5 часов в неделю на организации' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white/70 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/70">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-3xl p-8 border border-indigo-100 dark:border-indigo-900/50">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4 border border-white/80 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                      <div>
                        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-2 w-16 bg-gray-100 dark:bg-gray-600 rounded mt-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded" />
                      <div className="h-3 w-3/4 bg-gray-100 dark:bg-gray-700 rounded" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg" />
                      <div className="h-8 w-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile App */}
        <section id="mobile-app" className="py-24 bg-gray-950 text-white border-y border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-[1fr_380px] gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-1.5 text-sm text-cyan-50">
                  <Smartphone className="h-4 w-4" />
                  Android-приложение
                </div>
                <h2 className="mt-6 text-3xl font-bold sm:text-4xl">Здесь будет APK для мобильного HomeSpace</h2>
                <p className="mt-4 max-w-2xl text-lg text-white/70">
                  Раздел уже готов под релиз: можно будет поставить версию, дату сборки, размер файла, QR-код и кнопку загрузки. Сам APK пока не подключаю.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {['Синхронизация с вебом', 'Семейные задачи', 'Бюджет и файлы'].map((item) => (
                    <span key={item} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button disabled className="bg-white text-gray-950 hover:bg-white" size="lg" icon={<Download className="w-4 h-4" />}>
                    APK скоро
                  </Button>
                  <Link href="/register">
                    <Button className="bg-white/10 text-white border border-white/20 hover:bg-white/20" size="lg">
                      Подготовить аккаунт
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-sm">
                <div className="rounded-[2rem] border border-cyan-300/20 bg-white/10 p-4 shadow-2xl shadow-cyan-950/30">
                  <div className="rounded-[1.5rem] bg-gray-900 p-5 ring-1 ring-white/10">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">HomeSpace Mobile</p>
                        <p className="text-xs text-white/45">future build</p>
                      </div>
                      <div className="h-3 w-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="space-y-3">
                      {[
                        ['Задачи', overview.stats.activeTasks],
                        ['Бюджет', overview.stats.transactions],
                        ['Файлы', overview.stats.files],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl bg-white/10 p-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white/70">{label}</span>
                            <span className="font-semibold">{overviewLoading ? '...' : formatNumber(value)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 grid grid-cols-[72px_1fr] gap-4 rounded-2xl border border-dashed border-white/20 p-4">
                      <div className="flex h-[72px] items-center justify-center rounded-xl bg-white text-gray-950">
                        <QrCode className="h-9 w-9" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Место под QR</p>
                        <p className="mt-1 text-xs leading-5 text-white/50">Позже сюда можно добавить ссылку на актуальную APK-сборку.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="reviews" className="py-24 bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Свежие отзывы из HomeSpace
              </h2>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                Здесь показываются последние сообщения из формы обратной связи
              </p>
            </div>
            {overview.feedback.length === 0 ? (
              <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm dark:border-indigo-800 dark:bg-gray-800">
                <MessageCircle className="mx-auto h-10 w-10 text-indigo-500" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Отзывов пока нет</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Первый реальный отзыв появится здесь сразу после отправки формы ниже.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {overview.feedback.slice(0, 3).map((item) => (
                  <div key={item.id} className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm ring-1 ring-black/5 dark:ring-white/5 hover:shadow-lg transition-all">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-pink-300 to-indigo-300" />
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: item.rating || 5 }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">&ldquo;{item.message}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {(item.authorName || 'H').charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.authorName || 'Пользователь HomeSpace'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ru-RU') : 'свежий отзыв'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Feedback Form */}
        <section id="feedback" className="py-24 bg-white dark:bg-gray-950">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Обратная связь</h2>
              <p className="text-gray-500 dark:text-gray-400">Расскажите нам, что вы думаете о HomeSpace</p>
            </div>
            {feedbackSent ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 mb-2">Спасибо за отзыв!</h3>
                <p className="text-emerald-600 dark:text-emerald-400 text-sm">Мы ценим ваше мнение и обязательно его рассмотрим.</p>
              </div>
            ) : (
              <form onSubmit={sendFeedback} className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 p-6 space-y-4 shadow-xl shadow-indigo-950/5 ring-1 ring-black/5 dark:ring-white/5">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />
                <Input
                  label="Имя"
                  value={feedback.name}
                  onChange={(e) => setFeedback({ ...feedback, name: e.target.value })}
                  placeholder="Ваше имя"
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={feedback.email}
                  onChange={(e) => setFeedback({ ...feedback, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Оценка</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setFeedback({ ...feedback, rating })}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                          feedback.rating >= rating
                            ? 'border-amber-300 bg-amber-50 text-amber-500 dark:border-amber-700 dark:bg-amber-900/20'
                            : 'border-gray-200 text-gray-300 hover:text-amber-400 dark:border-gray-700 dark:text-gray-600'
                        }`}
                        aria-label={`Оценка ${rating}`}
                      >
                        <Star className={`h-5 w-5 ${feedback.rating >= rating ? 'fill-amber-400' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Сообщение</label>
                  <textarea
                    value={feedback.message}
                    onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Ваш отзыв..."
                    required
                  />
                </div>
                <Button type="submit" variant="primary" className="w-full">
                  Отправить <Send className="w-4 h-4" />
                </Button>
              </form>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-gradient-to-r from-indigo-700 via-purple-700 to-fuchsia-700 border-y border-white/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Готовы организовать семейную жизнь?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
              Присоединяйтесь к HomeSpace и ведите задачи, бюджет, файлы и семейные данные в одном месте
            </p>
            <Link href={user ? '/dashboard' : '/register'}>
              <Button variant="secondary" className="bg-yellow-300 text-gray-950 border-yellow-100 hover:bg-yellow-200 shadow-2xl shadow-yellow-500/30 ring-2 ring-white/70" size="lg">
                {user ? 'Перейти в кабинет' : 'Начать бесплатно'} <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-bold text-white">HomeSpace</span>
                </div>
                <p className="text-sm">Умное пространство для вашей семьи</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-3">Продукт</h4>
                <div className="space-y-2 text-sm">
                  <a href="#features" className="block hover:text-white transition-colors">Возможности</a>
                  <a href="#about" className="block hover:text-white transition-colors">О нас</a>
                  <a href="#mobile-app" className="block hover:text-white transition-colors">Мобильное</a>
                  <a href="#reviews" className="block hover:text-white transition-colors">Отзывы</a>
                </div>
              </div>
              <div>
                <h4 className="text-white font-medium mb-3">Поддержка</h4>
                <div className="space-y-2 text-sm">
                  <Link href="/support" className="block hover:text-white transition-colors">Помощь</Link>
                  <a href="#feedback" className="block hover:text-white transition-colors">Обратная связь</a>
                  <button type="button" onClick={() => setPolicyTab('privacy')} className="block hover:text-white transition-colors">
                    Политика конфиденциальности
                  </button>
                  <button type="button" onClick={() => setPolicyTab('terms')} className="block hover:text-white transition-colors">
                    Условия использования
                  </button>
                </div>
              </div>
              <div>
                <h4 className="text-white font-medium mb-3">Аккаунт</h4>
                <div className="space-y-2 text-sm">
                  {user ? (
                    <>
                      <Link href="/profile" className="block hover:text-white transition-colors">Профиль</Link>
                      <button onClick={logout} className="block hover:text-white transition-colors">Выйти</button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="block hover:text-white transition-colors">Войти</Link>
                      <Link href="/register" className="block hover:text-white transition-colors">Регистрация</Link>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm">
              &copy; {new Date().getFullYear()} HomeSpace. Все права защищены.
            </div>
          </div>
        </footer>
      </div>
      <PrivacyPolicyModal
        isOpen={Boolean(policyTab)}
        initialTab={policyTab || 'privacy'}
        onClose={() => setPolicyTab(null)}
      />
    </>
  );
}

import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import {
  CheckSquare, Wallet, KeyRound, MapPin, FileText, Users,
  ArrowRight, Star, Send, Menu, X, ChevronRight, Sparkles,
  Shield, Zap, Clock
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../utils/api';

export default function Home() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [feedback, setFeedback] = useState({ name: '', email: '', message: '' });
  const [feedbackSent, setFeedbackSent] = useState(false);

  const sendFeedback = async (e) => {
    e.preventDefault();
    try {
      await api.post('/feedback', feedback);
      setFeedbackSent(true);
      setFeedback({ name: '', email: '', message: '' });
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const features = [
    { icon: CheckSquare, title: 'Управление задачами', desc: 'Создавайте, назначайте и отслеживайте задачи для всей семьи', color: 'from-blue-500 to-cyan-500' },
    { icon: Wallet, title: 'Семейный бюджет', desc: 'Контролируйте доходы и расходы, ставьте финансовые цели', color: 'from-emerald-500 to-teal-500' },
    { icon: KeyRound, title: 'Хранение паролей', desc: 'Безопасное хранение паролей с разным уровнем доступа', color: 'from-purple-500 to-pink-500' },
    { icon: MapPin, title: 'Геолокация', desc: 'Отслеживайте местоположение членов семьи и создавайте геозоны', color: 'from-orange-500 to-red-500' },
    { icon: FileText, title: 'Файлы и документы', desc: 'Храните важные документы, чеки и фотографии в одном месте', color: 'from-indigo-500 to-blue-500' },
    { icon: Users, title: 'Семейные группы', desc: 'Объединяйте семью, приглашайте участников, управляйте ролями', color: 'from-pink-500 to-rose-500' },
  ];

  const testimonials = [
    { name: 'Анна К.', role: 'Мама двоих детей', text: 'HomeSpace помог нам организовать семейную жизнь. Теперь все задачи и расходы под контролем!', rating: 5 },
    { name: 'Дмитрий П.', role: 'Отец семейства', text: 'Удобное приложение для всей семьи. Особенно нравится функция геолокации и общий бюджет.', rating: 5 },
    { name: 'Елена М.', role: 'Многодетная мама', text: 'Наконец-то все пароли, документы и задачи в одном месте. Рекомендую всем семьям!', rating: 5 },
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
                <a href="#reviews" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Отзывы</a>
                <a href="#feedback" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Обратная связь</a>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button variant="secondary" size="sm">Войти</Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">Регистрация</Button>
                </Link>
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
                <a href="#reviews" className="block py-2 text-gray-600 dark:text-gray-400" onClick={() => setMobileMenu(false)}>Отзывы</a>
                <a href="#feedback" className="block py-2 text-gray-600 dark:text-gray-400" onClick={() => setMobileMenu(false)}>Обратная связь</a>
              </div>
            </div>
          )}
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/90 mb-6">
                <Sparkles className="w-4 h-4" />
                Новое поколение семейного управления
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
                Умное пространство<br />для вашей <span className="text-yellow-300">семьи</span>
              </h1>
              <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10">
                Организуйте задачи, бюджет, файлы и общение всей семьи в одном удобном приложении. Просто, безопасно, эффективно.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button variant="primary" size="lg" className="bg-white text-indigo-700 hover:bg-gray-100 shadow-xl">
                    Начать бесплатно <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button className="bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm" size="lg">
                    Узнать больше
                  </Button>
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 mt-16 max-w-lg mx-auto">
                <div>
                  <div className="text-3xl font-bold text-white">10K+</div>
                  <div className="text-sm text-white/60">Семей</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">50K+</div>
                  <div className="text-sm text-white/60">Задач</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">99%</div>
                  <div className="text-sm text-white/60">Довольных</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900">
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
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
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

        {/* About */}
        <section id="about" className="py-24">
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
                    <div key={i} className="flex items-start gap-4">
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
                <div className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-3xl p-8">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
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

        {/* Testimonials */}
        <section id="reviews" className="py-24 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Что говорят наши пользователи
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feedback Form */}
        <section id="feedback" className="py-24">
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
              <form onSubmit={sendFeedback} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
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
        <section className="py-24 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Готовы организовать семейную жизнь?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
              Присоединяйтесь к тысячам семей, которые уже используют HomeSpace
            </p>
            <Link href="/register">
              <Button className="bg-white text-indigo-700 hover:bg-gray-100 shadow-xl" size="lg">
                Начать бесплатно <ChevronRight className="w-4 h-4" />
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
                  <a href="#reviews" className="block hover:text-white transition-colors">Отзывы</a>
                </div>
              </div>
              <div>
                <h4 className="text-white font-medium mb-3">Поддержка</h4>
                <div className="space-y-2 text-sm">
                  <Link href="/support" className="block hover:text-white transition-colors">Помощь</Link>
                  <a href="#feedback" className="block hover:text-white transition-colors">Обратная связь</a>
                </div>
              </div>
              <div>
                <h4 className="text-white font-medium mb-3">Аккаунт</h4>
                <div className="space-y-2 text-sm">
                  <Link href="/login" className="block hover:text-white transition-colors">Войти</Link>
                  <Link href="/register" className="block hover:text-white transition-colors">Регистрация</Link>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm">
              &copy; {new Date().getFullYear()} HomeSpace. Все права защищены.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { UserPlus, Mail, Lock, User, Eye, EyeOff, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';

const ADMIN_EMAILS = ['admin@homespace.local', 'admin@homespace.ru', 'admin@example.com'];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [policyTab, setPolicyTab] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      return setError('Пароли не совпадают');
    }
    if (form.password.length < 6) {
      return setError('Пароль должен быть не менее 6 символов');
    }
    if (!agreeTerms) {
      return setError('Примите условия использования');
    }
    setLoading(true);
    try {
      const userData = await register(form.fullName, form.email, form.password, form.confirmPassword);
      window.location.href = ADMIN_EMAILS.includes(userData.email?.toLowerCase()) ? '/admin' : '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <Head><title>Регистрация — HomeSpace</title></Head>
      <div className="min-h-screen flex">
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md animate-slide-up">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">HomeSpace</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Создать аккаунт</h1>
              <p className="text-gray-500 dark:text-gray-400">Присоединяйтесь к HomeSpace</p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 text-sm text-red-700 dark:text-red-300 animate-fade-in">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Полное имя"
                value={form.fullName}
                onChange={(e) => updateForm('fullName', e.target.value)}
                placeholder="Иван Иванов"
                icon={<User className="w-4 h-4" />}
                required
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
                placeholder="your@email.com"
                icon={<Mail className="w-4 h-4" />}
                required
              />
              <div className="relative">
                <Input
                  label="Пароль"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateForm('password', e.target.value)}
                  placeholder="Минимум 6 символов"
                  icon={<Lock className="w-4 h-4" />}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Input
                label="Подтвердите пароль"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => updateForm('confirmPassword', e.target.value)}
                placeholder="Повторите пароль"
                icon={<CheckCircle className="w-4 h-4" />}
                required
              />

              <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  id="agreeTerms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <p>
                  Я согласен с{' '}
                  <button
                    type="button"
                    onClick={() => setPolicyTab('terms')}
                    className="text-indigo-600 underline hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    условиями использования
                  </button>{' '}
                  и{' '}
                  <button
                    type="button"
                    onClick={() => setPolicyTab('privacy')}
                    className="text-indigo-600 underline hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    политикой конфиденциальности
                  </button>
                </p>
              </div>

              <Button type="submit" variant="primary" loading={loading} className="w-full" icon={<UserPlus className="w-4 h-4" />}>
                Зарегистрироваться
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Уже есть аккаунт?{' '}
              <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                Войти
              </Link>
            </p>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 items-center justify-center p-12">
          <div className="text-center text-white max-w-md">
            <h2 className="text-3xl font-bold mb-4">Начните прямо сейчас</h2>
            <p className="text-white/80 text-lg">Создайте аккаунт и организуйте жизнь вашей семьи за несколько минут</p>
          </div>
        </div>
      </div>
      <PrivacyPolicyModal
        isOpen={Boolean(policyTab)}
        initialTab={policyTab || 'privacy'}
        onClose={() => setPolicyTab(null)}
      />
    </>
  );
}

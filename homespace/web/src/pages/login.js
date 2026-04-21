import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { LogIn, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(email, password);
      if (userData) {
        router.replace(userData.isAdmin ? '/admin' : '/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка входа. Проверьте данные.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Вход — HomeSpace</title>
      </Head>
      <div className="min-h-screen flex">
        {/* Left - Form */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md animate-slide-up">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">HomeSpace</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Добро пожаловать</h1>
              <p className="text-gray-500 dark:text-gray-400">Войдите в свой аккаунт</p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 text-sm text-red-700 dark:text-red-300 animate-fade-in">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                icon={<Mail className="w-4 h-4" />}
                required
              />
              <div className="relative">
                <Input
                  label="Пароль"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  icon={<Lock className="w-4 h-4" />}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  Запомнить меня
                </label>
                <Link href="/forgot-password" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                  Забыли пароль?
                </Link>
              </div>

              <Button type="submit" variant="primary" loading={loading} className="w-full" icon={<LogIn className="w-4 h-4" />}>
                Войти
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Нет аккаунта?{' '}
              <Link href="/register" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>

        {/* Right - Gradient */}
        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 items-center justify-center p-12">
          <div className="text-center text-white max-w-md">
            <h2 className="text-3xl font-bold mb-4">Организуйте жизнь вашей семьи</h2>
            <p className="text-white/80 text-lg">
              Задачи, бюджет, файлы и общение — всё в одном месте
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { KeyRound, Mail, Lock, ArrowLeft, Sparkles, CheckCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../utils/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState('');

  useEffect(() => {
    const queryToken = router.query.token;
    if (queryToken && typeof queryToken === 'string') {
      setToken(queryToken);
      setStep(2);
    }
  }, [router.query.token]);

  const sendResetEmail = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setDevToken(res.data.data?.resetToken || '');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) return setError('Пароли не совпадают');
    if (newPassword.length < 6) return setError('Пароль минимум 6 символов');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, token, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка сброса пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Восстановление пароля — HomeSpace</title></Head>
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {step === 1 ? 'Восстановление пароля' : 'Новый пароль'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {step === 1
                ? 'Введите email для получения ссылки'
                : 'Введите код из письма и новый пароль'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 text-sm text-red-700 dark:text-red-300 animate-fade-in">
              {error}
            </div>
          )}

          {success ? (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 mb-2">Пароль изменён!</h3>
              <p className="text-emerald-600 dark:text-emerald-400 text-sm mb-4">Теперь вы можете войти с новым паролем</p>
              <Link href="/login">
                <Button variant="primary">Войти</Button>
              </Link>
            </div>
          ) : step === 1 ? (
            <form onSubmit={sendResetEmail} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                icon={<Mail className="w-4 h-4" />}
                required
              />
              <Button type="submit" variant="primary" loading={loading} className="w-full">
                Отправить ссылку
              </Button>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
              <Input
                label="Код из письма"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="XXXXXX"
                icon={<KeyRound className="w-4 h-4" />}
                required
              />
              {devToken && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
                  SMTP не настроен, dev-код: <span className="font-mono font-semibold">{devToken}</span>
                </div>
              )}
              <Input
                label="Новый пароль"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                icon={<Lock className="w-4 h-4" />}
                required
              />
              <Input
                label="Подтвердите пароль"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                icon={<Lock className="w-4 h-4" />}
                required
              />
              <Button type="submit" variant="primary" loading={loading} className="w-full">
                Сбросить пароль
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              <ArrowLeft className="w-4 h-4" /> Вернуться к входу
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Check, CheckCircle2, Copy, Crown, FileSpreadsheet, Infinity, LockKeyhole, QrCode,
  ShieldCheck, Smartphone, Sparkles, TrendingUp, Wallet
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const plans = [
  {
    id: 'month',
    title: 'HomeSpace Plus',
    period: 'месяц',
    price: 299,
    badge: 'Гибкий старт',
    description: 'Подходит, чтобы попробовать расширенную аналитику и отчёты.',
  },
  {
    id: 'year',
    title: 'HomeSpace Plus год',
    period: 'год',
    price: 2490,
    badge: 'Выгодно',
    description: 'Для семьи, которая уже ведёт бюджет и задачи в HomeSpace.',
  },
];

const banks = ['СберБанк', 'Т-Банк', 'Альфа-Банк', 'ВТБ'];

const features = [
  { icon: Infinity, title: 'Бюджет за всё время', text: 'Без ограничения последних 60 дней для семейной статистики.' },
  { icon: TrendingUp, title: 'Аналитика продуктивности', text: 'Процент выполнения задач и вклад каждого участника.' },
  { icon: FileSpreadsheet, title: 'Экспорт PDF/Excel', text: 'Готовые отчёты по бюджету и аналитике.' },
  { icon: LockKeyhole, title: 'Безопасное хранилище', text: 'Пароли, документы, чеки и вложения в одном месте.' },
];

export default function SubscriptionPage() {
  const { user, updateUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('month');
  const [selectedBank, setSelectedBank] = useState(banks[0]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [payment, setPayment] = useState(null);
  const [copied, setCopied] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const plan = plans.find((item) => item.id === selectedPlan) || plans[0];
  const sbpCode = useMemo(
    () => `SBP-HOMESPACE-${selectedPlan.toUpperCase()}-${user?.id || 'DEMO'}`,
    [selectedPlan, user?.id]
  );

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(sbpCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error(err);
      setPaymentError(`Не удалось скопировать код. Код оплаты: ${sbpCode}`);
    }
  };

  const confirmSbpPayment = async () => {
    setLoading(true);
    setSuccess(false);
    setPaymentError('');
    try {
      const res = await api.post('/users/subscription', {
        plan: selectedPlan,
        paymentMethod: 'mock_sbp',
        bank: selectedBank,
        sbpCode,
      });
      updateUser(res.data.data);
      setPayment(res.data.payment || null);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setPaymentError(err.response?.data?.message || 'Не удалось активировать подписку. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Подписка — HomeSpace</title></Head>
      <div className="space-y-6 animate-fade-in">
        <Card className="overflow-hidden bg-gradient-to-br from-sky-600 via-cyan-600 to-emerald-500 text-white border-0">
          <div className="relative p-2">
            <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -left-12 bottom-0 w-48 h-48 rounded-full bg-yellow-300/20 blur-2xl" />
            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <Badge variant="warning" className="mb-4">
                  <Sparkles className="w-3 h-3" /> СБП-заглушка для dev
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">Оплата подписки через СБП</h1>
                <p className="text-white/85 text-lg">
                  Сейчас это безопасный mock-сценарий: QR и банк отображаются как в реальном checkout, деньги не списываются,
                  но покупка записывается в продажи системы.
                </p>
                {user?.has_subscription && (
                  <div className="mt-5 rounded-2xl bg-white/10 border border-white/20 p-4">
                    <p className="font-semibold">Подписка уже активна</p>
                    <p className="text-sm text-white/75">
                      Действует до {new Date(user.subscription_until).toLocaleDateString('ru-RU')}. Новая покупка продлит текущий срок.
                    </p>
                  </div>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((feature) => (
                  <div key={feature.title} className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur-sm">
                    <feature.icon className="w-6 h-6 text-yellow-200 mb-3" />
                    <p className="font-semibold">{feature.title}</p>
                    <p className="text-sm text-white/75 mt-1">{feature.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-[1fr_420px] gap-6">
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {plans.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedPlan(item.id)}
                  className={`text-left rounded-2xl border bg-white dark:bg-gray-800 p-6 transition-all ${
                    selectedPlan === item.id
                      ? 'border-cyan-500 shadow-xl ring-4 ring-cyan-500/10'
                      : 'border-gray-100 dark:border-gray-700 hover:border-cyan-300 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-cyan-600 dark:text-cyan-300" />
                    </div>
                    <Badge variant={item.id === 'year' ? 'success' : 'info'}>{item.badge}</Badge>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-5">{item.title}</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{item.description}</p>
                  <div className="mt-5 flex items-end gap-2">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{item.price.toLocaleString('ru-RU')} ₽</span>
                    <span className="text-gray-500 dark:text-gray-400 pb-1">/ {item.period}</span>
                  </div>
                  <div className="mt-5 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <p className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Полная история бюджета</p>
                    <p className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> PDF и Excel отчёты</p>
                    <p className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Расширенная аналитика семьи</p>
                  </div>
                </button>
              ))}
            </div>

            <Card>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Выберите банк для СБП</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Это имитация банковского выбора для проверки сценария.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {banks.map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSelectedBank(bank)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      selectedBank === bank
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200'
                        : 'border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <p className="font-semibold">{bank}</p>
                    <p className="text-xs opacity-70 mt-1">Открыть оплату в приложении банка</p>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <Card className="h-fit overflow-hidden">
            <div className="rounded-3xl bg-gradient-to-br from-gray-950 to-cyan-950 p-5 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-cyan-100/75">К оплате</p>
                  <p className="text-3xl font-black">{plan.price.toLocaleString('ru-RU')} ₽</p>
                </div>
                <Badge variant="success">СБП</Badge>
              </div>

              <div className="mt-5 rounded-3xl bg-white p-5 text-gray-950">
                <div className="mx-auto grid h-56 w-56 grid-cols-5 gap-2 rounded-2xl bg-white p-3 shadow-inner">
                  {Array.from({ length: 25 }).map((_, index) => (
                    <div
                      key={index}
                      className={`rounded-md ${
                        [0, 1, 3, 4, 5, 6, 8, 10, 13, 16, 18, 19, 20, 22, 24].includes(index)
                          ? 'bg-gray-950'
                          : 'bg-cyan-100'
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold">
                  <QrCode className="w-4 h-4" />
                  QR-заглушка СБП
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-white/10 border border-white/10 p-4">
                <p className="text-xs text-cyan-100/70">Код платежа</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-xl bg-black/20 px-3 py-2 text-xs">{sbpCode}</code>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="rounded-xl bg-white/10 p-2 hover:bg-white/20"
                    aria-label="Скопировать код СБП"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {copied && (
                  <p className="mt-2 text-xs text-emerald-200">Код скопирован</p>
                )}
              </div>

              <Button
                onClick={confirmSbpPayment}
                loading={loading}
                className="mt-5 w-full bg-white text-gray-950 hover:bg-cyan-50"
                icon={<ShieldCheck className="w-4 h-4" />}
              >
                {success ? 'Продлить ещё раз' : 'Оплата выполнена, активировать'}
              </Button>

              {paymentError && (
                <div className="mt-4 rounded-2xl bg-red-500/15 border border-red-300/30 p-4 text-sm text-red-100">
                  {paymentError}
                </div>
              )}

              {success && (
                <div className="mt-4 rounded-2xl bg-emerald-400/15 border border-emerald-300/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-emerald-300/20 p-1">
                      <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-100">Подписка активирована</p>
                      <p className="mt-1 text-sm text-emerald-50/80">
                        Plus доступен до {user?.subscription_until ? new Date(user.subscription_until).toLocaleDateString('ru-RU') : 'обновления профиля'}.
                      </p>
                      <p className="mt-2 text-xs text-emerald-50/60">
                        Платеж {payment?.providerPaymentId || 'SBP mock'} записан в продажи.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Link href="/budget" className="flex-1">
                <Button variant="secondary" className="w-full" icon={<Wallet className="w-4 h-4" />}>
                  Вернуться к бюджету
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

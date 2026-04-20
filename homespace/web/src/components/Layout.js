import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Home, CheckSquare, Wallet, Users, User, BarChart3, FileText,
  KeyRound, MapPin, MessageSquare, LifeBuoy, Shield, Menu, X,
  Search, Bell, Sun, Moon, LogOut, ChevronLeft, ChevronRight,
  Settings, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';

const ADMIN_EMAILS = ['admin@homespace.local', 'admin@homespace.ru', 'admin@example.com'];

const navItems = [
  { href: '/', icon: Home, label: 'Главная' },
  { href: '/dashboard', icon: CheckSquare, label: 'Задачи' },
  { href: '/budget', icon: Wallet, label: 'Бюджет' },
  { href: '/family', icon: Users, label: 'Семья' },
  { href: '/profile', icon: User, label: 'Профиль' },
  { href: '/analytics', icon: BarChart3, label: 'Аналитика' },
  { href: '/files', icon: FileText, label: 'Файлы' },
  { href: '/passwords', icon: KeyRound, label: 'Пароли' },
  { href: '/subscription', icon: Sparkles, label: 'Подписка' },
  { href: '/location', icon: MapPin, label: 'Геолокация' },
  { href: '/chat', icon: MessageSquare, label: 'Чат' },
  { href: '/support', icon: LifeBuoy, label: 'Поддержка' },
];

const adminNavItems = [
  { href: '/admin', icon: Shield, label: 'Админ-панель' },
];

export default function Layout({ children }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const lastNotificationFetchRef = useRef(0);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase());
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(router.pathname);
  const isLanding = router.pathname === '/';
  const visibleNavItems = isAdmin ? adminNavItems : navItems;
  const searchItems = visibleNavItems;
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchResults = normalizedSearch
    ? searchItems.filter((item) => item.label.toLowerCase().includes(normalizedSearch) || item.href.includes(normalizedSearch))
    : searchItems.slice(0, 6);

  const goToSearchResult = (href) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(href);
  };

  const fetchNotifications = useCallback(async () => {
    const now = Date.now();
    if (now - lastNotificationFetchRef.current < 30000) return;
    lastNotificationFetchRef.current = now;

    try {
      const res = await api.get('/notifications');
      const data = res.data.data || res.data;
      setNotifications(Array.isArray(data) ? data : []);
      setUnreadCount(Array.isArray(data) ? data.filter((n) => !n.is_read).length : 0);
    } catch (err) {
      if (err.response?.status !== 429) {
        console.error('Failed to fetch notifications:', err);
      }
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  }, []);

  useEffect(() => {
    if (!user && !isAuthPage && !isLanding) {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
      }
      return;
    }
    if (user && isAuthPage) {
      router.push(isAdmin ? '/admin' : '/dashboard');
      return;
    }
    if (user && isAdmin && router.pathname !== '/admin') {
      router.push('/admin');
      return;
    }
    if (!user || isAuthPage || isLanding) return;
    fetchNotifications();
  }, [user, isAdmin, isAuthPage, isLanding, fetchNotifications, router]);

  if (isAuthPage) {
    return (
      <>
        <PublicHeader theme={theme} toggleTheme={toggleTheme} />
        {children}
      </>
    );
  }

  if (!user) return null;
  if (user && isAdmin && router.pathname !== '/admin') return null;
  if (isLanding) return children;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-50 lg:z-0 bg-gradient-to-b from-indigo-900 via-indigo-800 to-purple-900 text-white transition-all duration-300 flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}
      >
        <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Home className="w-5 h-5" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-xl font-bold tracking-tight">HomeSpace</span>
          )}
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = router.pathname === item.href ||
              (item.href === '/dashboard' && router.pathname === '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                  ${isActive
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }
                  ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex items-center justify-center py-3 border-t border-white/10 text-white/50 hover:text-white/80 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors w-64"
                >
                  <Search className="w-4 h-4" />
                  <span>Поиск...</span>
                  <kbd className="ml-auto text-xs bg-white dark:bg-gray-600 px-1.5 py-0.5 rounded">⌘K</kbd>
                </button>
                {searchOpen && (
                  <div className="absolute top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 animate-slide-up">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchResults[0]) {
                          e.preventDefault();
                          goToSearchResult(searchResults[0].href);
                        }
                        if (e.key === 'Escape') setSearchOpen(false);
                      }}
                      placeholder="Введите запрос..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      autoFocus
                    />
                    <div className="mt-3 space-y-1">
                      {searchResults.length === 0 ? (
                        <p className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">Ничего не найдено</p>
                      ) : (
                        searchResults.map((item) => (
                          <button
                            key={item.href}
                            type="button"
                            onClick={() => goToSearchResult(item.href)}
                            className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <item.icon className="w-4 h-4 text-indigo-500" />
                            <span>{item.label}</span>
                            <span className="ml-auto text-xs text-gray-400">{item.href}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {!isAdmin && (
                <div className="relative">
                  <button
                    onClick={() => router.push('/notifications')}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                  >
                    <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </div>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user?.fullName}
                  </span>
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-slide-up">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.fullName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                      </div>
                      <Link
                        href={isAdmin ? '/admin?tab=profile' : '/profile'}
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <User className="w-4 h-4" /> {isAdmin ? 'Профиль админа' : 'Профиль'}
                      </Link>
                      {!isAdmin && (
                        <Link
                          href="/family"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <Settings className="w-4 h-4" /> Настройки семьи
                        </Link>
                      )}
                      <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                        <button
                          onClick={() => { setShowUserMenu(false); logout(); }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <LogOut className="w-4 h-4" /> Выйти
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

function PublicHeader({ theme, toggleTheme }) {
  return (
    <header className="sticky top-0 z-50 bg-white/85 dark:bg-gray-950/85 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">HomeSpace</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
          <Link href="/login" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            Войти
          </Link>
          <Link href="/register" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Регистрация
          </Link>
        </div>
      </div>
    </header>
  );
}

import { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '../utils/api';

const AuthContext = createContext(null);
const LOGOUT_AUDIT_TIMEOUT_MS = 1500;

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const persistUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const loadProfile = useCallback(async (fallbackUser) => {
    try {
      const res = await api.get('/users/profile');
      const profile = res.data.data || res.data;
      persistUser(profile);
      return profile;
    } catch (e) {
      if (fallbackUser) {
        persistUser(fallbackUser);
        return fallbackUser;
      }
      throw e;
    }
  }, []);

  const refreshUser = useCallback(async (fallbackUser = user) => loadProfile(fallbackUser), [loadProfile, user]);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      const stored = localStorage.getItem('user');

      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {
          localStorage.removeItem('user');
        }
      }

      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const userData = await loadProfile();
        if (!active) return;
        persistUser(userData);
      } catch (e) {
        if (active) clearSession();
      } finally {
        if (active) setLoading(false);
      }
    };

    const handleAuthExpired = () => {
      clearSession();
      setLoading(false);
    };

    restoreSession();
    window.addEventListener('homespace:auth-expired', handleAuthExpired);

    return () => {
      active = false;
      window.removeEventListener('homespace:auth-expired', handleAuthExpired);
    };
  }, [loadProfile]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: userData } = res.data.data;
    localStorage.setItem('token', token);
    return loadProfile(userData);
  };

  const register = async (fullName, email, password, confirmPassword = password) => {
    const res = await api.post('/auth/register', { fullName, email, password, confirmPassword });
    const { token, user: userData } = res.data.data;
    localStorage.setItem('token', token);
    return loadProfile(userData);
  };

  const logout = async () => {
    const token = localStorage.getItem('token');

    if (token) {
      api.post('/auth/logout', null, {
        timeout: LOGOUT_AUDIT_TIMEOUT_MS,
        headers: { Authorization: `Bearer ${token}` },
      }).catch((e) => {
        console.warn('Logout audit request failed:', e);
      });
    }

    clearSession();
    if (router.pathname !== '/login') {
      await router.replace('/login');
    }
  };

  const updateUser = (data) => {
    const normalized = {
      ...data,
      fullName: data.fullName || data.full_name || user?.fullName,
      avatarUrl: data.avatarUrl || data.avatar_url || user?.avatarUrl,
    };
    const updated = { ...user, ...normalized };
    persistUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

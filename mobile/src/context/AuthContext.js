import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import { auth } from '../utils/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStoredData();
  }, []);

  const persistUser = async (nextUser) => {
    setUser(nextUser);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(nextUser));
    return nextUser;
  };

  const refreshUser = async (fallbackUser = user) => {
    try {
      const response = await auth.getMe();
      const freshUser = response.data?.data || response.data;
      return await persistUser(freshUser);
    } catch (error) {
      if (fallbackUser) {
        return await persistUser(fallbackUser);
      }
      throw error;
    }
  };

  const loadStoredData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (storedToken && storedUser) {
        setToken(storedToken);
        const cachedUser = JSON.parse(storedUser);
        setUser(cachedUser);
        try {
          await refreshUser(cachedUser);
        } catch (error) {
          setUser(cachedUser);
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки данных:', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const response = await auth.login(email, password);
      const payload = response.data?.data || response.data;
      const { token: newToken, user: userData } = payload;
      setToken(newToken);
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
      await persistUser(userData);
      try {
        return await refreshUser(userData);
      } catch (profileError) {
        return userData;
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Ошибка авторизации';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName, email, password) => {
    try {
      setError(null);
      setLoading(true);
      const response = await auth.register(fullName, email, password);
      const payload = response.data?.data || response.data;
      const { token: newToken, user: userData } = payload;
      setToken(newToken);
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
      await persistUser(userData);
      try {
        return await refreshUser(userData);
      } catch (profileError) {
        return userData;
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Ошибка регистрации';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await auth.logout();
    } catch (e) {
      console.error('Ошибка выхода:', e);
    } finally {
      setToken(null);
      setUser(null);
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    }
  };

  const updateUser = async (userData) => {
    await persistUser(userData);
  };

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

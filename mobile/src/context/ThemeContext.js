import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, COLORS } from '../utils/constants';

const ThemeContext = createContext({});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system');
  const [isDark, setIsDark] = useState(systemScheme === 'dark');

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
      setIsDark(systemScheme === 'dark');
    }
  }, [systemScheme, themeMode]);

  const loadTheme = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
      if (stored) {
        setThemeMode(stored);
        if (stored === 'light') setIsDark(false);
        else if (stored === 'dark') setIsDark(true);
        else setIsDark(systemScheme === 'dark');
      }
    } catch (e) {
      console.error('Ошибка загрузки темы:', e);
    }
  };

  const setTheme = async (mode) => {
    setThemeMode(mode);
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, mode);
    if (mode === 'light') setIsDark(false);
    else if (mode === 'dark') setIsDark(true);
    else setIsDark(systemScheme === 'dark');
  };

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const theme = {
    isDark,
    themeMode,
    setTheme,
    toggleTheme,
    colors: {
      primary: COLORS.primary,
      accent: COLORS.accent,
      background: isDark ? COLORS.backgroundDark : COLORS.background,
      surface: isDark ? COLORS.surfaceDark : COLORS.surface,
      card: isDark ? COLORS.cardDark : COLORS.card,
      text: isDark ? COLORS.textDark : COLORS.text,
      textSecondary: isDark ? COLORS.textSecondaryDark : COLORS.textSecondary,
      border: isDark ? COLORS.borderDark : COLORS.border,
      success: COLORS.success,
      warning: COLORS.warning,
      danger: COLORS.danger,
      info: COLORS.info,
      overlay: COLORS.overlay,
      white: COLORS.white,
      black: COLORS.black,
    },
  };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export default ThemeContext;

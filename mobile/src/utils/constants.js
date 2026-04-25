export const COLORS = {
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',
  accent: '#d946ef',
  accentLight: '#e879f9',
  accentDark: '#c026d3',
  background: '#f8fafc',
  backgroundDark: '#0f172a',
  surface: '#ffffff',
  surfaceDark: '#1e293b',
  card: '#ffffff',
  cardDark: '#1e293b',
  text: '#0f172a',
  textDark: '#f1f5f9',
  textSecondary: '#64748b',
  textSecondaryDark: '#94a3b8',
  border: '#e2e8f0',
  borderDark: '#334155',
  success: '#10b981',
  successLight: '#34d399',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  danger: '#ef4444',
  dangerLight: '#f87171',
  info: '#06b6d4',
  infoLight: '#22d3ee',
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  gradientStart: '#2563eb',
  gradientEnd: '#7c3aed',
  gradientAccent: '#d946ef',
};

const DEFAULT_PUBLIC_API_URL = 'спрятать';

const normalizeApiUrl = (value) => {
  const normalized = String(value || '').trim().replace(/\/+$/, '');
  if (!normalized) return DEFAULT_PUBLIC_API_URL;
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

// Public backend address for mobile clients. Keep credentials and private network details off the device.
export const API_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL || DEFAULT_PUBLIC_API_URL);
export const API_ORIGIN = API_URL.replace(/\/api$/, '');

export const STORAGE_KEYS = {
  TOKEN: 'homespace_token',
  USER: 'homespace_user',
  THEME: 'homespace_theme',
  LANGUAGE: 'homespace_language',
  LAST_SYNC: 'homespace_last_sync',
  FAMILY_ID: 'homespace_family_id',
  PUSH_ENABLED: 'homespace_push_enabled',
};

export const TASK_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
};

export const TASK_STATUS_LABELS = {
  new: 'Новая',
  in_progress: 'В процессе',
  done: 'Выполнена',
};

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

export const TASK_PRIORITY_LABELS = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

export const TRANSACTION_TYPE = {
  INCOME: 'income',
  EXPENSE: 'expense',
};

export const TRANSACTION_TYPE_LABELS = {
  income: 'Доход',
  expense: 'Расход',
};

export const TRANSACTION_CATEGORIES = {
  income: ['Зарплата', 'Фриланс', 'Инвестиции', 'Подарок', 'Другое'],
  expense: ['Продукты', 'Транспорт', 'Развлечения', 'Жильё', 'Одежда', 'Здоровье', 'Образование', 'Другое'],
};

export const FILE_TYPES = ['receipt', 'document', 'image', 'other'];

export const FILE_TYPE_LABELS = {
  receipt: 'Чек',
  document: 'Документ',
  image: 'Изображение',
  other: 'Другое',
};

export const VISIBILITY_LEVELS = ['private', 'parents', 'family'];

export const VISIBILITY_LABELS = {
  private: 'Личное',
  parents: 'Родители',
  family: 'Семья',
};

export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed',
  TRANSACTION_ADDED: 'transaction_added',
  FAMILY_INVITE: 'family_invite',
  LOCATION_ALERT: 'location_alert',
  SYSTEM: 'system',
};

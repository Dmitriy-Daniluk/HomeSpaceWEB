import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getNotificationPermissions,
  getPushEnabled,
  requestNotificationPermissions,
  scheduleTestNotification,
  setPushEnabled,
} from '../utils/notificationService';

const SettingsScreen = ({ navigation }) => {
  const { colors, themeMode, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [testingPush, setTestingPush] = useState(false);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const [enabled, status] = await Promise.all([
        getPushEnabled(),
        getNotificationPermissions(),
      ]);
      setNotificationsEnabled(enabled);
      setPermissionStatus(status);
    } catch (error) {
      console.error('Ошибка чтения настроек уведомлений:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const handleSupport = () => {
    Linking.openURL('mailto:support@homespace.app');
  };

  const handleNotificationsToggle = async (value) => {
    if (value) {
      const status = await requestNotificationPermissions();
      setPermissionStatus(status);
      if (status !== 'granted') {
        Alert.alert(
          'Разрешение не выдано',
          'Чтобы системные уведомления появлялись на устройстве, разреши их в настройках Android.'
        );
        await setPushEnabled(false);
        setNotificationsEnabled(false);
        return;
      }
    }

    await setPushEnabled(value);
    setNotificationsEnabled(value);
  };

  const handleTestPush = async () => {
    try {
      setTestingPush(true);
      const status = permissionStatus === 'granted'
        ? permissionStatus
        : await requestNotificationPermissions();

      setPermissionStatus(status);

      if (status !== 'granted') {
        Alert.alert('Нет доступа', 'Сначала разреши уведомления для приложения.');
        return;
      }

      await setPushEnabled(true);
      setNotificationsEnabled(true);
      await scheduleTestNotification();
      Alert.alert(
        'Тест запущен',
        'Через несколько секунд должно появиться локальное уведомление HomeSpace.'
      );
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось запланировать тестовое уведомление.');
    } finally {
      setTestingPush(false);
    }
  };

  const openLink = (url) => {
    Linking.openURL(url);
  };

  const sections = [
    {
      title: 'Внешний вид',
      items: [
        {
          icon: 'theme-light-dark',
          label: 'Тёмная тема',
          type: 'switch',
          value: themeMode === 'dark',
          onValueChange: toggleTheme,
        },
      ],
    },
    {
      title: 'Уведомления',
      items: [
        {
          icon: 'bell-ring-outline',
          label: 'Push-уведомления',
          subtitle: permissionStatus === 'granted' ? 'Разрешение выдано' : 'Нужно разрешение устройства',
          type: 'switch',
          value: notificationsEnabled,
          onValueChange: handleNotificationsToggle,
        },
        {
          icon: 'bell-outline',
          label: 'Лента уведомлений',
          subtitle: 'Встроенные уведомления проекта',
          type: 'navigate',
          onPress: () => navigation.navigate('Notifications'),
        },
      ],
    },
    {
      title: 'Конфиденциальность',
      items: [
        {
          icon: 'map-marker-account',
          label: 'Отслеживание местоположения',
          subtitle: 'Локальный переключатель доступа',
          type: 'switch',
          value: locationEnabled,
          onValueChange: setLocationEnabled,
        },
        {
          icon: 'shield-lock-outline',
          label: 'Пароли',
          subtitle: 'Зашифрованное хранилище',
          type: 'navigate',
          onPress: () => navigation.navigate('Passwords'),
        },
      ],
    },
    {
      title: 'О приложении',
      items: [
        {
          icon: 'information-outline',
          label: 'Версия',
          subtitle: '1.0.0',
          type: 'static',
        },
        {
          icon: 'file-document-outline',
          label: 'Условия использования',
          subtitle: 'Открыть сайт',
          type: 'link',
          onPress: () => openLink('https://homespace.app/terms'),
        },
        {
          icon: 'shield-check-outline',
          label: 'Политика конфиденциальности',
          subtitle: 'Открыть сайт',
          type: 'link',
          onPress: () => openLink('https://homespace.app/privacy'),
        },
      ],
    },
  ];

  const renderItem = (item, isLast) => (
    <TouchableOpacity
      key={item.label}
      activeOpacity={item.type === 'switch' || item.type === 'static' ? 1 : 0.7}
      onPress={item.type === 'navigate' || item.type === 'link' ? item.onPress : undefined}
      style={[
        styles.itemRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.itemIcon, { backgroundColor: colors.primary + '15' }]}>
        <Icon name={item.icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
        {item.subtitle ? (
          <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
        ) : null}
      </View>

      {item.type === 'switch' ? (
        <Switch
          value={item.value}
          onValueChange={item.onValueChange}
          trackColor={{ false: colors.border, true: colors.primary + '60' }}
          thumbColor={item.value ? colors.primary : colors.textSecondary}
        />
      ) : item.type === 'static' ? (
        <Text style={[styles.staticValue, { color: colors.textSecondary }]}>{item.subtitle}</Text>
      ) : (
        <Icon name="chevron-right" size={20} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Настройки" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {sections.map((section) => (
          <Card key={section.title} style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            {section.items.map((item, index) => renderItem(item, index === section.items.length - 1))}
          </Card>
        ))}

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Проверка уведомлений</Text>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Этот тест проверяет системное уведомление на устройстве. Серверные события проекта пока пишутся
            в ленту уведомлений внутри HomeSpace, а не в настоящий remote push.
          </Text>
          <Button
            title="Отправить тестовое уведомление"
            onPress={handleTestPush}
            loading={testingPush}
            icon="bell-ring"
            fullWidth
            style={styles.testButton}
          />
        </Card>

        <Button
          title="Написать в поддержку"
          onPress={handleSupport}
          variant="outline"
          icon="lifebuoy"
          fullWidth
          style={styles.supportButton}
        />

        <Button
          title="Выйти из аккаунта"
          onPress={handleLogout}
          variant="danger"
          icon="logout"
          fullWidth
          style={styles.logoutButton}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  staticValue: {
    fontSize: 13,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  testButton: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  supportButton: {
    marginBottom: 12,
  },
  logoutButton: {
    marginBottom: 20,
  },
});

export default SettingsScreen;

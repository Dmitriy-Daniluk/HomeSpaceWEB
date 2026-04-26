import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { formatCurrency, getPagePermissions, isChildOnlyUser } from '../utils/helpers';
import { auth as authApi } from '../utils/api';
import { getResponseData } from '../utils/syncService';

const ProfileScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const isFocused = useIsFocused();
  const [stats, setStats] = useState(null);
  const permissions = getPagePermissions(user);
  const isChildOnly = isChildOnlyUser(user);
  const showSubscription = !isChildOnly;

  const loadStats = useCallback(async () => {
    try {
      const response = await authApi.getMe();
      const profile = getResponseData(response);
      await updateUser(profile);
      setStats({
        total_earned: Number(profile.stats?.transactions?.total_income || 0)
          + Number(profile.stats?.personalBudget?.total_income || 0),
        total_spent: Number(profile.stats?.transactions?.total_expense || 0)
          + Number(profile.stats?.personalBudget?.total_expense || 0),
        total_saved:
          Number(profile.stats?.transactions?.total_income || 0)
          + Number(profile.stats?.personalBudget?.total_income || 0)
          - Number(profile.stats?.transactions?.total_expense || 0)
          - Number(profile.stats?.personalBudget?.total_expense || 0),
      });
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
    }
  }, [updateUser]);

  useEffect(() => {
    if (!isFocused) return;
    loadStats();
  }, [isFocused, loadStats]);

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

  const settingsItems = [
    { icon: 'bell', label: 'Уведомления', screen: 'Notifications' },
    { icon: 'message-text', label: 'Чат', screen: 'Chat' },
    { icon: 'lifebuoy', label: 'Поддержка', screen: 'Support' },
    ...(showSubscription ? [{ icon: 'crown-outline', label: 'Подписка', screen: 'Subscription' }] : []),
    ...(!isChildOnly || permissions.has('passwords.view') ? [{ icon: 'shield-lock', label: 'Пароли', screen: 'Passwords' }] : []),
    ...(!isChildOnly || permissions.has('location.view') ? [{ icon: 'map-marker', label: 'Местоположение', screen: 'Location' }] : []),
    ...(!isChildOnly || permissions.has('files.view') ? [{ icon: 'folder', label: 'Файлы', screen: 'Files' }] : []),
    { icon: 'cog', label: 'Настройки', screen: 'Settings' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Профиль"
        rightIcon="cog"
        onRightPress={() => navigation.navigate('Settings')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              {user?.avatar_url || user?.avatarUrl ? (
                <Image source={{ uri: user.avatar_url || user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
                </Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.name, { color: colors.text }]}>
                {user?.full_name || 'Пользователь'}
              </Text>
              <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
            </View>
          </View>

          {showSubscription && user?.has_subscription && (
            <View style={[styles.subscriptionBadge, { backgroundColor: colors.accent + '15' }]}>
              <Icon name="star" size={16} color={colors.accent} />
              <Text style={[styles.subscriptionText, { color: colors.accent }]}>
                Подписка до {new Date(user.subscription_until).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          )}
        </Card>

        <Card style={styles.statsCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Статистика</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.success + '15' }]}>
                <Icon name="trending-up" size={24} color={colors.success} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(stats?.total_earned || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Заработано</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.danger + '15' }]}>
                <Icon name="trending-down" size={24} color={colors.danger} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(stats?.total_spent || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Потрачено</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="piggy-bank" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(stats?.total_saved || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Накоплено</Text>
            </View>
          </View>
        </Card>

        {showSubscription ? (
          <Card style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <View style={[styles.subscriptionIcon, { backgroundColor: colors.accent + '15' }]}>
                <Icon name="crown-outline" size={24} color={colors.accent} />
              </View>
              <View style={styles.subscriptionInfo}>
                <Text style={[styles.subscriptionTitle, { color: colors.text }]}>HomeSpace Plus</Text>
                <Text style={[styles.subscriptionSubtitle, { color: colors.textSecondary }]}>
                  {user?.has_subscription
                    ? `Активна до ${new Date(user.subscription_until).toLocaleDateString('ru-RU')}`
                    : 'Расширенная аналитика, экспорт и кастомные роли'}
                </Text>
              </View>
            </View>
            <Button
              title={user?.has_subscription ? 'Продлить подписку' : 'Оформить подписку'}
              onPress={() => navigation.navigate('Subscription')}
              icon="arrow-right"
              iconPosition="right"
              fullWidth
              variant={user?.has_subscription ? 'outline' : 'primary'}
              style={styles.subscriptionButton}
            />
          </Card>
        ) : null}

        <Card style={styles.settingsCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Разделы</Text>
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={item.screen}
              style={[
                styles.settingsItem,
                index < settingsItems.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
              ]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.6}
            >
              <View style={styles.settingsItemLeft}>
                <Icon name={item.icon} size={22} color={colors.primary} />
                <Text style={[styles.settingsItemText, { color: colors.text }]}>{item.label}</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </Card>

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
  profileCard: {
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  subscriptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsCard: {
    marginBottom: 16,
  },
  subscriptionCard: {
    marginBottom: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  subscriptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  subscriptionSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  subscriptionButton: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  settingsCard: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 20,
  },
});

export default ProfileScreen;

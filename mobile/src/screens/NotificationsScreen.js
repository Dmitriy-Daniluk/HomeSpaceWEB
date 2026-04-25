import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { notifications as notificationsApi } from '../utils/api';
import { formatRelativeDate } from '../utils/helpers';
import { toArrayData } from '../utils/syncService';

const NOTIFICATION_ICONS = {
  task_assigned: 'clipboard-check',
  task_completed: 'check-circle',
  transaction_added: 'cash',
  family_invite: 'account-plus',
  chat: 'message-text',
  location_alert: 'map-marker-alert',
  system: 'bell',
};

const NotificationsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationsApi.getAll();
      setNotifications(toArrayData(response));
    } catch (err) {
      console.error('Ошибка загрузки уведомлений:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Ошибка отметки прочтения:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Ошибка отметки всех прочитанными:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => !item.is_read && markAsRead(item.id)}
    >
      <Card
        style={[
          styles.notificationCard,
          !item.is_read && { borderLeftWidth: 4, borderLeftColor: colors.primary },
        ]}
      >
        <View style={styles.notificationRow}>
          <View
            style={[
              styles.notificationIcon,
              {
                backgroundColor: item.is_read ? colors.border : colors.primary + '15',
              },
            ]}
          >
            <Icon
              name={NOTIFICATION_ICONS[item.type] || 'bell'}
              size={22}
              color={item.is_read ? colors.textSecondary : colors.primary}
            />
          </View>
          <View style={styles.notificationContent}>
            <Text style={[styles.notificationTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {item.message && (
              <Text style={[styles.notificationMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.message}
              </Text>
            )}
            <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
              {formatRelativeDate(item.created_at)}
            </Text>
          </View>
          {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Уведомления"
        onBack={() => navigation.goBack()}
        rightComponent={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={[styles.markAllText, { color: colors.primary }]}>Прочитать все</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {notifications.length === 0 && !loading ? (
        <EmptyState
          icon="bell-outline"
          title="Нет уведомлений"
          description="Здесь будут ваши уведомления"
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationCard: {
    marginBottom: 10,
    padding: 14,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  notificationMessage: {
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
    marginTop: 4,
  },
});

export default NotificationsScreen;

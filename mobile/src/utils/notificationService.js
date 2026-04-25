import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { STORAGE_KEYS } from './constants';

const ANDROID_CHANNEL_ID = 'homespace-default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const initializeNotifications = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'HomeSpace',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
    });
  }
};

export const getNotificationPermissions = async () => {
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.status;
};

export const requestNotificationPermissions = async () => {
  await initializeNotifications();
  const permissions = await Notifications.requestPermissionsAsync();
  return permissions.status;
};

export const getPushEnabled = async () => {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_ENABLED);
  return stored !== '0';
};

export const setPushEnabled = async (enabled) => {
  await AsyncStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, enabled ? '1' : '0');
};

export const scheduleTestNotification = async () => {
  await initializeNotifications();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'HomeSpace',
      body: 'Тестовое уведомление пришло успешно.',
      data: { source: 'local-test' },
    },
    trigger: {
      seconds: 3,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
};

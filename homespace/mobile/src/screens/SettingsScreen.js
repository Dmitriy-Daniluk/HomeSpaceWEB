import React, { useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SettingsScreen = ({ navigation }) => {
  const { colors, themeMode, setTheme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

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

  const settingsSections = [
    {
      title: 'Внешний вид',
      items: [
        {
          icon: 'theme-light-dark',
          label: 'Тёмная тема',
          type: 'switch',
          value: themeMode === 'dark',
          onValueChange: () => toggleTheme(),
        },
      ],
    },
    {
      title: 'Уведомления',
      items: [
        {
          icon: 'bell',
          label: 'Push-уведомления',
          type: 'switch',
          value: notificationsEnabled,
          onValueChange: setNotificationsEnabled,
        },
      ],
    },
    {
      title: 'Конфиденциальность',
      items: [
        {
          icon: 'map-marker',
          label: 'Отслеживание местоположения',
          type: 'switch',
          value: locationEnabled,
          onValueChange: setLocationEnabled,
        },
        {
          icon: 'shield-lock',
          label: 'Пароли',
          type: 'navigate',
          screen: 'Passwords',
        },
      ],
    },
    {
      title: 'О приложении',
      items: [
        {
          icon: 'information',
          label: 'Версия',
          type: 'info',
          value: '1.0.0',
        },
        {
          icon: 'file-document',
          label: 'Условия использования',
          type: 'link',
          url: 'https://homespace.app/terms',
        },
        {
          icon: 'shield-check',
          label: 'Политика конфиденциальности',
          type: 'link',
          url: 'https://homespace.app/privacy',
        },
      ],
    },
  ];

  const renderSettingItem = (item) => (
    <View key={item.label} style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: colors.primary + '15' }]}>
        <Icon name={item.icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
        {item.type === 'info' && (
          <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{item.value}</Text>
        )}
      </View>
      {item.type === 'switch' && (
        <Switch
          value={item.value}
          onValueChange={item.onValueChange}
          trackColor={{ false: colors.border, true: colors.primary + '60' }}
          thumbColor={item.value ? colors.primary : colors.textSecondary}
        />
      )}
      {(item.type === 'navigate' || item.type === 'link') && (
        <Icon name="chevron-right" size={20} color={colors.textSecondary} />
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Настройки"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {settingsSections.map((section) => (
          <Card key={section.title} style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            {section.items.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.settingRow,
                  index < section.items.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                ]}
                onPress={() => {
                  if (item.type === 'navigate') {
                    navigation.navigate(item.screen);
                  } else if (item.type === 'link') {
                    Linking.openURL(item.url);
                  }
                }}
                activeOpacity={item.type === 'switch' ? 1 : 0.6}
              >
                {renderSettingItem(item)}
              </TouchableOpacity>
            ))}
          </Card>
        ))}

        <Button
          title="Написать в поддержку"
          onPress={handleSupport}
          variant="outline"
          icon="email"
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
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 13,
    marginTop: 1,
  },
  supportButton: {
    marginBottom: 12,
  },
  logoutButton: {
    marginBottom: 20,
  },
});

export default SettingsScreen;

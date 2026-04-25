import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Clipboard,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import BottomSheetModal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { families as familiesApi, passwords as passwordsApi } from '../utils/api';
import { VISIBILITY_LABELS } from '../utils/constants';
import { toArrayData } from '../utils/syncService';

const PasswordsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [passwords, setPasswords] = useState([]);
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [newPassword, setNewPassword] = useState({
    service: '',
    login: '',
    password: '',
    visibility_level: 'private',
    notes: '',
  });

  useEffect(() => {
    loadFamilies();
  }, []);

  useEffect(() => {
    loadPasswords();
  }, [selectedFamily]);

  const loadFamilies = async () => {
    try {
      const response = await familiesApi.getAll();
      const data = toArrayData(response);
      setFamilies(data);
      if (!selectedFamily && data.length > 0) {
        setSelectedFamily(data[0].id);
      }
    } catch (err) {
      console.error('Ошибка загрузки семей:', err);
    }
  };

  const loadPasswords = async () => {
    try {
      setLoading(true);
      if (!selectedFamily) {
        setPasswords([]);
        return;
      }
      const response = await passwordsApi.getAll({ familyId: selectedFamily });
      setPasswords(toArrayData(response));
    } catch (err) {
      console.error('Ошибка загрузки паролей:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPasswords();
  }, []);

  const toggleVisibility = (id) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text, label) => {
    Clipboard.setString(text);
    Alert.alert('Скопировано', `${label} скопирован в буфер обмена`);
  };

  const handleAddPassword = async () => {
    if (!newPassword.service.trim()) {
      Alert.alert('Ошибка', 'Введите название сервиса');
      return;
    }
    if (!newPassword.password) {
      Alert.alert('Ошибка', 'Введите пароль');
      return;
    }
    if (!selectedFamily) {
      Alert.alert('Ошибка', 'Сначала создайте или выберите семью');
      return;
    }
    try {
      await passwordsApi.create({ ...newPassword, familyId: selectedFamily });
      setNewPassword({ service: '', login: '', password: '', visibility_level: 'private', notes: '' });
      setShowAddModal(false);
      loadPasswords();
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось сохранить пароль');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Удалить пароль', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await passwordsApi.delete(id);
            setPasswords((prev) => prev.filter((p) => p.id !== id));
          } catch (err) {
            Alert.alert('Ошибка', 'Не удалось удалить пароль');
          }
        },
      },
    ]);
  };

  const renderPassword = ({ item }) => (
    <Card style={styles.passwordCard}>
      <View style={styles.passwordHeader}>
        <View style={[styles.serviceIcon, { backgroundColor: colors.primary + '15' }]}>
          <Icon name="shield-key" size={24} color={colors.primary} />
        </View>
        <View style={styles.passwordInfo}>
          <Text style={[styles.serviceName, { color: colors.text }]}>{item.service}</Text>
          <View style={styles.visibilityBadge}>
            <Text style={[styles.visibilityText, { color: colors.textSecondary }]}>
              {VISIBILITY_LABELS[item.visibility_level] || item.visibility_level}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
          <Icon name="delete" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.credentialsRow}>
        <View style={styles.credentialItem}>
          <Text style={[styles.credentialLabel, { color: colors.textSecondary }]}>Логин</Text>
          <View style={styles.credentialValueRow}>
            <Text style={[styles.credentialValue, { color: colors.text }]} numberOfLines={1}>
              {item.login || '—'}
            </Text>
            {item.login && (
              <TouchableOpacity onPress={() => copyToClipboard(item.login, 'Логин')}>
                <Icon name="content-copy" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.credentialItem}>
          <Text style={[styles.credentialLabel, { color: colors.textSecondary }]}>Пароль</Text>
          <View style={styles.credentialValueRow}>
            <Text style={[styles.credentialValue, { color: colors.text, fontFamily: visiblePasswords[item.id] ? 'monospace' : undefined }]}>
              {visiblePasswords[item.id] ? item.password : '••••••••'}
            </Text>
            <TouchableOpacity onPress={() => toggleVisibility(item.id)}>
              <Icon name={visiblePasswords[item.id] ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {item.password && (
              <TouchableOpacity onPress={() => copyToClipboard(item.password, 'Пароль')}>
                <Icon name="content-copy" size={18} color={colors.primary} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Пароли"
        onBack={() => navigation.goBack()}
        rightIcon="plus"
        onRightPress={() => setShowAddModal(true)}
      />

      {families.length > 1 && (
        <View style={styles.familyTabs}>
          {families.map((family) => (
            <TouchableOpacity
              key={family.id}
              style={[
                styles.familyTab,
                { backgroundColor: String(selectedFamily) === String(family.id) ? colors.primary : colors.card },
              ]}
              onPress={() => setSelectedFamily(family.id)}
            >
              <Text style={{ color: String(selectedFamily) === String(family.id) ? '#ffffff' : colors.text }}>
                {family.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {passwords.length === 0 && !loading ? (
        <EmptyState
          icon="shield-key"
          title="Паролей нет"
          description="Добавьте свой первый пароль"
          actionTitle="Добавить пароль"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <FlatList
          data={passwords}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPassword}
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

      <BottomSheetModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Добавить пароль"
      >
        <Input
          label="Сервис"
          value={newPassword.service}
          onChangeText={(text) => setNewPassword((prev) => ({ ...prev, service: text }))}
          placeholder="Название сервиса"
          icon="web"
        />
        <Input
          label="Логин"
          value={newPassword.login}
          onChangeText={(text) => setNewPassword((prev) => ({ ...prev, login: text }))}
          placeholder="Логин или email"
          icon="account"
        />
        <Input
          label="Пароль"
          value={newPassword.password}
          onChangeText={(text) => setNewPassword((prev) => ({ ...prev, password: text }))}
          placeholder="Пароль"
          icon="lock"
          secureTextEntry
        />
        <View style={styles.visibilitySelector}>
          <Text style={[styles.visibilityLabel, { color: colors.text }]}>Видимость</Text>
          <View style={styles.visibilityOptions}>
            {Object.entries(VISIBILITY_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.visibilityOption,
                  {
                    backgroundColor: newPassword.visibility_level === key ? colors.primary : colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => setNewPassword((prev) => ({ ...prev, visibility_level: key }))}
              >
                <Text
                  style={[
                    styles.visibilityOptionText,
                    { color: newPassword.visibility_level === key ? '#ffffff' : colors.text },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Input
          label="Заметки"
          value={newPassword.notes}
          onChangeText={(text) => setNewPassword((prev) => ({ ...prev, notes: text }))}
          placeholder="Дополнительные заметки"
          icon="note"
          multiline
        />
        <Button
          title="Сохранить"
          onPress={handleAddPassword}
          fullWidth
          icon="content-save"
        />
      </BottomSheetModal>
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
  familyTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  familyTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  passwordCard: {
    marginBottom: 12,
  },
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  passwordInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  visibilityBadge: {
    alignSelf: 'flex-start',
  },
  visibilityText: {
    fontSize: 11,
  },
  deleteButton: {
    padding: 8,
  },
  credentialsRow: {
    gap: 10,
  },
  credentialItem: {
    gap: 4,
  },
  credentialLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  credentialValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  credentialValue: {
    flex: 1,
    fontSize: 14,
  },
  visibilitySelector: {
    marginBottom: 16,
  },
  visibilityLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  visibilityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  visibilityOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PasswordsScreen;

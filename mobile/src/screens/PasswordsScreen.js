import React, { useState, useEffect, useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import BottomSheetModal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { families as familiesApi, passwords as passwordsApi } from '../utils/api';
import { VISIBILITY_LABELS } from '../utils/constants';
import { canAccessFamilyFeature, getPagePermissions, isChildOnlyUser } from '../utils/helpers';
import { toArrayData } from '../utils/syncService';

const EMPTY_PASSWORD_FORM = {
  service: '',
  login: '',
  password: '',
  visibility_level: 'private',
  notes: '',
};

const PasswordsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [passwords, setPasswords] = useState([]);
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [editingPassword, setEditingPassword] = useState(null);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const permissions = getPagePermissions(user);
  const isChildOnly = isChildOnlyUser(user);
  const canUsePasswords = !isChildOnly || permissions.has('passwords.view');

  useEffect(() => {
    if (!canUsePasswords) {
      setFamilies([]);
      setSelectedFamily(null);
      setPasswords([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    loadFamilies();
  }, [canUsePasswords]);

  useEffect(() => {
    if (!canUsePasswords) return;
    loadPasswords();
  }, [selectedFamily, canUsePasswords]);

  const loadFamilies = async () => {
    try {
      const response = await familiesApi.getAll();
      const data = toArrayData(response).filter((family) => canAccessFamilyFeature(family, 'passwords.view'));
      setFamilies(data);
      setSelectedFamily((current) => {
        if (data.length === 0) return null;
        if (current && data.some((family) => String(family.id) === String(current))) {
          return current;
        }
        return data[0].id;
      });
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

  const copyToClipboard = async (text, label) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Скопировано', `${label} скопирован в буфер обмена`);
  };

  const openCreateModal = () => {
    setEditingPassword(null);
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setShowAddModal(true);
  };

  const openEditModal = (password) => {
    setEditingPassword(password);
    setPasswordForm({
      service: password.service || '',
      login: password.login || '',
      password: '',
      visibility_level: password.visibility_level || 'private',
      notes: password.notes || '',
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingPassword(null);
    setPasswordForm(EMPTY_PASSWORD_FORM);
  };

  const handleSavePassword = async () => {
    const requiresPassword = !editingPassword || editingPassword.can_decrypt === false;

    if (!passwordForm.service.trim()) {
      Alert.alert('Ошибка', 'Введите название сервиса');
      return;
    }
    if (requiresPassword && !passwordForm.password.trim()) {
      Alert.alert('Ошибка', 'Введите пароль');
      return;
    }
    if (!selectedFamily) {
      Alert.alert('Ошибка', 'Сначала создайте или выберите семью');
      return;
    }
    try {
      const payload = {
        ...passwordForm,
        familyId: selectedFamily,
      };

      if (editingPassword) {
        if (!payload.password.trim()) {
          delete payload.password;
        }
        await passwordsApi.update(editingPassword.id, payload);
      } else {
        await passwordsApi.create(payload);
      }

      closeModal();
      await loadPasswords();
    } catch (err) {
      Alert.alert(
        'Ошибка',
        err.response?.data?.message || err.response?.data?.error || 'Не удалось сохранить пароль'
      );
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
        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
          <Icon name="pencil" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
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
              {!item.can_decrypt
                ? (visiblePasswords[item.id] ? 'Секрет нужно заменить' : '••••••••')
                : (visiblePasswords[item.id] ? item.password : '••••••••')}
            </Text>
            <TouchableOpacity onPress={() => toggleVisibility(item.id)}>
              <Icon name={visiblePasswords[item.id] ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {item.password && item.can_decrypt ? (
              <TouchableOpacity onPress={() => copyToClipboard(item.password, 'Пароль')}>
                <Icon name="content-copy" size={18} color={colors.primary} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            ) : null}
          </View>
          {!item.can_decrypt ? (
            <View style={[styles.warningBox, { backgroundColor: colors.warning + '15' }]}>
              <Icon name="alert-circle-outline" size={16} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                {item.decrypt_error || 'Секрет нельзя расшифровать. Откройте запись и задайте новый пароль.'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Пароли"
        onBack={() => navigation.goBack()}
        rightIcon={canUsePasswords ? 'plus' : undefined}
        onRightPress={canUsePasswords ? openCreateModal : undefined}
      />

      {!canUsePasswords ? (
        <EmptyState
          icon="shield-lock-outline"
          title="Нет доступа к паролям"
          description="Этот раздел доступен родителю или участнику с разрешением роли."
        />
      ) : families.length === 0 && !loading ? (
        <EmptyState
          icon="shield-key"
          title="Нет доступных семей"
          description="Нужна семья, где у вас есть доступ к хранилищу паролей."
        />
      ) : (
        <>
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
              onAction={openCreateModal}
            />
          ) : (
            <FlatList
              data={passwords}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderPassword}
              contentContainerStyle={styles.listContent}
              refreshControl={(
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              )}
            />
          )}
        </>
      )}

      <BottomSheetModal
        visible={showAddModal}
        onClose={closeModal}
        title={editingPassword ? 'Редактировать пароль' : 'Добавить пароль'}
      >
        <Input
          label="Сервис"
          value={passwordForm.service}
          onChangeText={(text) => setPasswordForm((prev) => ({ ...prev, service: text }))}
          placeholder="Название сервиса"
          icon="web"
        />
        <Input
          label="Логин"
          value={passwordForm.login}
          onChangeText={(text) => setPasswordForm((prev) => ({ ...prev, login: text }))}
          placeholder="Логин или email"
          icon="account"
        />
        <Input
          label={editingPassword ? 'Новый пароль' : 'Пароль'}
          value={passwordForm.password}
          onChangeText={(text) => setPasswordForm((prev) => ({ ...prev, password: text }))}
          placeholder={
            editingPassword?.can_decrypt === false
              ? 'Введите новый пароль'
              : (editingPassword ? 'Оставьте пустым, если не меняете' : 'Пароль')
          }
          icon="lock"
          secureTextEntry
        />
        {editingPassword && editingPassword.can_decrypt === false ? (
          <View style={[styles.warningBox, { backgroundColor: colors.warning + '15' }]}>
            <Icon name="alert-circle-outline" size={16} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              Текущий секрет нельзя расшифровать. Чтобы восстановить запись, задайте новый пароль.
            </Text>
          </View>
        ) : null}
        <View style={styles.visibilitySelector}>
          <Text style={[styles.visibilityLabel, { color: colors.text }]}>Видимость</Text>
          <View style={styles.visibilityOptions}>
            {Object.entries(VISIBILITY_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.visibilityOption,
                  {
                    backgroundColor: passwordForm.visibility_level === key ? colors.primary : colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => setPasswordForm((prev) => ({ ...prev, visibility_level: key }))}
              >
                <Text
                  style={[
                    styles.visibilityOptionText,
                    { color: passwordForm.visibility_level === key ? '#ffffff' : colors.text },
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
          value={passwordForm.notes}
          onChangeText={(text) => setPasswordForm((prev) => ({ ...prev, notes: text }))}
          placeholder="Дополнительные заметки"
          icon="note"
          multiline
        />
        <Button
          title={editingPassword ? 'Сохранить изменения' : 'Сохранить'}
          onPress={handleSavePassword}
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
  actionButton: {
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
  warningBox: {
    marginTop: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 8,
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

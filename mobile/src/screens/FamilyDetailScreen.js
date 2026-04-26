import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  Share,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import BottomSheetModal from '../components/Modal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { families as familiesApi } from '../utils/api';
import { calculateProgress, formatCurrency } from '../utils/helpers';
import { getResponseData } from '../utils/syncService';

const ROLE_PERMISSION_OPTIONS = [
  { value: 'budget.view', label: 'Бюджет' },
  { value: 'analytics.view', label: 'Аналитика' },
  { value: 'files.view', label: 'Файлы' },
  { value: 'passwords.view', label: 'Пароли' },
  { value: 'location.view', label: 'Геолокация' },
];

const ROLE_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#0ea5e9'];

const FamilyDetailScreen = ({ route, navigation }) => {
  const { familyId } = route.params;
  const { colors } = useTheme();
  const { refreshUser } = useAuth();
  const isFocused = useIsFocused();

  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showCustomRoleModal, setShowCustomRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedRole, setSelectedRole] = useState('child');
  const [selectedCustomRoleId, setSelectedCustomRoleId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('child');
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [customRoleForm, setCustomRoleForm] = useState({
    name: '',
    color: ROLE_COLORS[0],
    permissions: [],
  });
  const [saving, setSaving] = useState(false);

  const isParent = family?.role === 'parent';
  const canManageCustomRoles = Boolean(isParent && (family?.currentUserHasSubscription || family?.current_user_has_subscription));
  const savingsGoal = Number(family?.savings_goal || 0);
  const totalSaved = Number(stats?.total_savings || 0);
  const savingsProgress = useMemo(
    () => calculateProgress(totalSaved, savingsGoal),
    [totalSaved, savingsGoal]
  );

  const loadFamily = useCallback(async () => {
    try {
      setLoading(true);
      const response = await familiesApi.getById(familyId);
      const data = getResponseData(response);
      const nextFamily = data.family ? { ...data.family, ...data } : data;
      setFamily(nextFamily);
      setMembers(data.members || []);
      setCustomRoles(data.customRoles || data.custom_roles || []);
      setStats({
        total_savings: data.total_saved || 0,
        completed_tasks: data.stats?.completed_tasks || 0,
        pending_tasks: data.pending_tasks_today || data.pendingTasks?.length || 0,
      });
      setEditName(nextFamily.name || '');
      setEditGoal(nextFamily.savings_goal ? String(nextFamily.savings_goal) : '');
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось загрузить данные семьи');
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    if (!isFocused) return;
    loadFamily();
  }, [isFocused, loadFamily]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Ошибка', 'Введите адрес электронной почты');
      return;
    }

    try {
      setSaving(true);
      await familiesApi.inviteMember(familyId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      Alert.alert('Готово', 'Приглашение отправлено');
      setInviteEmail('');
      setInviteRole('child');
      setShowInviteModal(false);
      await refreshUser();
    } catch (err) {
      Alert.alert(
        'Ошибка',
        err.response?.data?.message || err.response?.data?.error || 'Не удалось отправить приглашение'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFamily = async () => {
    if (!editName.trim()) {
      Alert.alert('Ошибка', 'Введите название семьи');
      return;
    }

    try {
      setSaving(true);
      await familiesApi.update(familyId, {
        name: editName.trim(),
        savingsGoal: editGoal ? Number(editGoal) : 0,
      });
      setShowManageModal(false);
      await refreshUser();
      await loadFamily();
      Alert.alert('Готово', 'Настройки семьи обновлены');
    } catch (err) {
      Alert.alert(
        'Ошибка',
        err.response?.data?.message || err.response?.data?.error || 'Не удалось обновить семью'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = (memberId) => {
    Alert.alert('Удалить участника', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await familiesApi.removeMember(familyId, memberId);
            setMembers((prev) => prev.filter((member) => member.id !== memberId));
            await refreshUser();
          } catch (err) {
            Alert.alert('Ошибка', 'Не удалось удалить участника');
          }
        },
      },
    ]);
  };

  const handleDeleteFamily = () => {
    Alert.alert(
      'Расформировать семью',
      'Семья и все связанные данные будут удалены без возможности восстановления.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Расформировать',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await familiesApi.delete(familyId);
              await refreshUser();
              navigation.navigate('MainTabs', { screen: 'Family' });
            } catch (err) {
              Alert.alert(
                'Ошибка',
                err.response?.data?.message || err.response?.data?.error || 'Не удалось расформировать семью'
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const shareInviteCode = async () => {
    if (!family?.invite_code) {
      Alert.alert('Код недоступен', 'Для этой семьи пока нет кода приглашения.');
      return;
    }

    try {
      await Share.share({
        message: `Присоединяйся к семье "${family.name}" в HomeSpace. Код приглашения: ${family.invite_code}`,
      });
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось открыть окно отправки');
    }
  };

  const openRoleManager = (member) => {
    setSelectedMember(member);
    setSelectedRole(member.role === 'parent' ? 'parent' : 'child');
    setSelectedCustomRoleId(member.custom_role_id ? String(member.custom_role_id) : '');
    setShowRoleModal(true);
  };

  const handleSaveMemberRole = async () => {
    if (!selectedMember) {
      return;
    }

    try {
      setSaving(true);
      const payload = {
        role: selectedRole,
      };

      if (canManageCustomRoles) {
        payload.customRoleId = selectedCustomRoleId ? Number(selectedCustomRoleId) : null;
      }

      await familiesApi.updateMemberRole(familyId, selectedMember.id, payload);
      setShowRoleModal(false);
      setSelectedMember(null);
      await refreshUser();
      await loadFamily();
      Alert.alert('Готово', 'Роль участника обновлена');
    } catch (error) {
      Alert.alert(
        'Ошибка',
        error.response?.data?.message || error.response?.data?.error || 'Не удалось обновить роль участника'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleCustomRolePermission = (permission) => {
    setCustomRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleCreateCustomRole = async () => {
    if (!customRoleForm.name.trim()) {
      Alert.alert('Ошибка', 'Введите название роли');
      return;
    }

    try {
      setSaving(true);
      await familiesApi.createCustomRole(familyId, {
        name: customRoleForm.name.trim(),
        color: customRoleForm.color,
        permissions: customRoleForm.permissions,
      });
      setCustomRoleForm({
        name: '',
        color: ROLE_COLORS[0],
        permissions: [],
      });
      setShowCustomRoleModal(false);
      await loadFamily();
      Alert.alert('Готово', 'Кастомная роль создана');
    } catch (error) {
      Alert.alert(
        'Ошибка',
        error.response?.data?.message || error.response?.data?.error || 'Не удалось создать кастомную роль'
      );
    } finally {
      setSaving(false);
    }
  };

  const renderMember = ({ item }) => {
    const canRemove = isParent && String(item.id) !== String(family?.current_user_id);
    const canManageRole = isParent && String(item.id) !== String(family?.current_user_id);

    return (
      <View style={[styles.memberRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.memberAvatarText}>
            {(item.full_name || item.fullName || item.email)?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: colors.text }]}>
            {item.full_name || item.fullName || item.email}
          </Text>
          <TouchableOpacity
            disabled={!canManageRole}
            activeOpacity={0.7}
            onPress={() => canManageRole && openRoleManager(item)}
          >
            <Text style={[styles.memberRole, { color: canManageRole ? colors.primary : colors.textSecondary }]}>
              {item.role === 'parent' ? 'Родитель' : 'Участник'}
              {item.customRole?.name ? ` • ${item.customRole.name}` : ''}
            </Text>
          </TouchableOpacity>
        </View>
        {canRemove ? (
          <TouchableOpacity onPress={() => handleRemoveMember(item.id)} style={styles.removeButton}>
            <Icon name="account-remove" size={20} color={colors.danger} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={family?.name || 'Семья'}
        onBack={() => navigation.goBack()}
        rightComponent={isParent ? (
          <TouchableOpacity onPress={() => setShowManageModal(true)} style={styles.headerAction}>
            <Icon name="cog-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : null}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Icon name="cash-multiple" size={28} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(totalSaved)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Накоплено</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="clipboard-check" size={28} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats?.completed_tasks || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Выполнено</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="clock-alert" size={28} color={colors.warning} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats?.pending_tasks || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>В работе</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Семейные данные</Text>
            {isParent ? (
              <TouchableOpacity onPress={shareInviteCode}>
                <Text style={[styles.linkText, { color: colors.primary }]}>Поделиться кодом</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {savingsGoal > 0 ? (
            <View style={styles.goalSection}>
              <View style={styles.goalHeader}>
                <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>Цель накоплений</Text>
                <Text style={[styles.goalValue, { color: colors.text }]}>
                  {formatCurrency(totalSaved)} / {formatCurrency(savingsGoal)}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${savingsProgress}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {savingsProgress}% цели достигнуто
              </Text>
            </View>
          ) : (
            <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>
              Цель накоплений пока не задана
            </Text>
          )}

          {isParent && family?.invite_code ? (
            <View style={[styles.inviteBox, { backgroundColor: colors.primary + '10' }]}>
              <Icon name="key-variant" size={18} color={colors.primary} />
              <View style={styles.inviteBoxText}>
                <Text style={[styles.inviteLabel, { color: colors.textSecondary }]}>Код приглашения</Text>
                <Text style={[styles.inviteValue, { color: colors.text }]}>{family.invite_code}</Text>
              </View>
            </View>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Участники ({members.length})
            </Text>
            <View style={styles.cardHeaderActions}>
              {canManageCustomRoles ? (
                <TouchableOpacity onPress={() => setShowCustomRoleModal(true)}>
                  <Text style={[styles.linkText, { color: colors.primary }]}>Роли</Text>
                </TouchableOpacity>
              ) : null}
              {isParent ? (
                <TouchableOpacity onPress={() => setShowInviteModal(true)}>
                  <Text style={[styles.linkText, { color: colors.primary }]}>Пригласить</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <FlatList
            data={members}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMember}
            scrollEnabled={false}
            ListEmptyComponent={(
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Нет участников
              </Text>
            )}
          />
        </Card>

        {customRoles.length > 0 ? (
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Кастомные роли</Text>
            {customRoles.map((role) => (
              <View key={role.id} style={[styles.customRoleRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <View style={styles.customRoleInfo}>
                  <View style={[styles.customRoleDot, { backgroundColor: role.color || colors.primary }]} />
                  <View style={styles.customRoleTextWrap}>
                    <Text style={[styles.customRoleName, { color: colors.text }]}>{role.name}</Text>
                    <Text style={[styles.customRolePermissions, { color: colors.textSecondary }]}>
                      {(role.permissions || []).length > 0
                        ? ROLE_PERMISSION_OPTIONS
                          .filter((permission) => (role.permissions || []).includes(permission.value))
                          .map((permission) => permission.label)
                          .join(', ')
                        : 'Без дополнительных разрешений'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Быстрые действия</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.primary + '15' }]}
              onPress={() => navigation.navigate('AddTask', { mode: 'family', familyId })}
            >
              <Icon name="plus-circle" size={28} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.primary }]}>Задача</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.accent + '15' }]}
              onPress={() => navigation.navigate('AddTransaction', { mode: 'family', familyId })}
            >
              <Icon name="cash-plus" size={28} color={colors.accent} />
              <Text style={[styles.quickActionText, { color: colors.accent }]}>Бюджет</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.success + '15' }]}
              onPress={() => navigation.navigate('Chat', { familyId })}
            >
              <Icon name="message-text" size={28} color={colors.success} />
              <Text style={[styles.quickActionText, { color: colors.success }]}>Чат</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>

      <BottomSheetModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Пригласить участника"
      >
        <Input
          label="Электронная почта"
          value={inviteEmail}
          onChangeText={setInviteEmail}
          placeholder="example@mail.ru"
          icon="email"
          keyboardType="email-address"
        />
        <View style={styles.roleRow}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={[
              styles.roleChip,
              {
                borderColor: inviteRole === 'child' ? colors.primary : colors.border,
                backgroundColor: inviteRole === 'child' ? colors.primary + '10' : colors.surface,
              },
            ]}
            onPress={() => setInviteRole('child')}
          >
            <Text style={{ color: inviteRole === 'child' ? colors.primary : colors.text }}>Участник</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            style={[
              styles.roleChip,
              {
                borderColor: inviteRole === 'parent' ? colors.primary : colors.border,
                backgroundColor: inviteRole === 'parent' ? colors.primary + '10' : colors.surface,
              },
            ]}
            onPress={() => setInviteRole('parent')}
          >
            <Text style={{ color: inviteRole === 'parent' ? colors.primary : colors.text }}>Родитель</Text>
          </TouchableOpacity>
        </View>
        <Button
          title="Отправить приглашение"
          onPress={handleInvite}
          loading={saving}
          fullWidth
          icon="send"
        />
      </BottomSheetModal>

      <BottomSheetModal
        visible={showManageModal}
        onClose={() => setShowManageModal(false)}
        title="Настройки семьи"
      >
        <Input
          label="Название"
          value={editName}
          onChangeText={setEditName}
          placeholder="Название семьи"
          icon="home-heart"
        />
        <Input
          label="Цель накоплений"
          value={editGoal}
          onChangeText={(value) => setEditGoal(value.replace(/[^0-9]/g, ''))}
          placeholder="100000"
          icon="target"
          keyboardType="numeric"
        />
        <Button
          title="Сохранить"
          onPress={handleUpdateFamily}
          loading={saving}
          fullWidth
          icon="content-save-outline"
        />
        <Button
          title="Расформировать семью"
          onPress={handleDeleteFamily}
          loading={saving}
          fullWidth
          variant="danger"
          icon="delete-forever"
          style={{ marginTop: 12 }}
        />
      </BottomSheetModal>

      <BottomSheetModal
        visible={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title="Роль участника"
      >
        {selectedMember ? (
          <>
            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              {selectedMember.full_name || selectedMember.fullName || selectedMember.email}
            </Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                activeOpacity={0.75}
                style={[
                  styles.roleChip,
                  {
                    borderColor: selectedRole === 'child' ? colors.primary : colors.border,
                    backgroundColor: selectedRole === 'child' ? colors.primary + '10' : colors.surface,
                  },
                ]}
                onPress={() => setSelectedRole('child')}
              >
                <Text style={{ color: selectedRole === 'child' ? colors.primary : colors.text }}>Участник</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                style={[
                  styles.roleChip,
                  {
                    borderColor: selectedRole === 'parent' ? colors.primary : colors.border,
                    backgroundColor: selectedRole === 'parent' ? colors.primary + '10' : colors.surface,
                  },
                ]}
                onPress={() => setSelectedRole('parent')}
              >
                <Text style={{ color: selectedRole === 'parent' ? colors.primary : colors.text }}>Родитель</Text>
              </TouchableOpacity>
            </View>

            {canManageCustomRoles ? (
              <>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Кастомная роль</Text>
                <View style={styles.customRoleSelection}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={[
                      styles.customRoleChip,
                      {
                        borderColor: !selectedCustomRoleId ? colors.primary : colors.border,
                        backgroundColor: !selectedCustomRoleId ? colors.primary + '10' : colors.surface,
                      },
                    ]}
                    onPress={() => setSelectedCustomRoleId('')}
                  >
                    <Text style={{ color: !selectedCustomRoleId ? colors.primary : colors.text }}>Без роли</Text>
                  </TouchableOpacity>
                  {customRoles.map((role) => (
                    <TouchableOpacity
                      key={role.id}
                      activeOpacity={0.75}
                      style={[
                        styles.customRoleChip,
                        {
                          borderColor: String(selectedCustomRoleId) === String(role.id) ? role.color || colors.primary : colors.border,
                          backgroundColor: String(selectedCustomRoleId) === String(role.id)
                            ? `${role.color || colors.primary}15`
                            : colors.surface,
                        },
                      ]}
                      onPress={() => setSelectedCustomRoleId(String(role.id))}
                    >
                      <Text style={{ color: String(selectedCustomRoleId) === String(role.id) ? role.color || colors.primary : colors.text }}>
                        {role.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            <Button
              title="Сохранить роль"
              onPress={handleSaveMemberRole}
              loading={saving}
              fullWidth
              icon="content-save-outline"
            />
          </>
        ) : null}
      </BottomSheetModal>

      <BottomSheetModal
        visible={showCustomRoleModal}
        onClose={() => setShowCustomRoleModal(false)}
        title="Новая кастомная роль"
      >
        <Input
          label="Название роли"
          value={customRoleForm.name}
          onChangeText={(value) => setCustomRoleForm((prev) => ({ ...prev, name: value }))}
          placeholder="Например, Няня"
          icon="account-badge"
        />
        <Text style={[styles.modalLabel, { color: colors.text }]}>Цвет роли</Text>
        <View style={styles.colorRow}>
          {ROLE_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              activeOpacity={0.75}
              style={[
                styles.colorChip,
                {
                  backgroundColor: color,
                  borderColor: customRoleForm.color === color ? colors.text : 'transparent',
                },
              ]}
              onPress={() => setCustomRoleForm((prev) => ({ ...prev, color }))}
            />
          ))}
        </View>
        <Text style={[styles.modalLabel, { color: colors.text }]}>Разрешения</Text>
        <View style={styles.permissionGrid}>
          {ROLE_PERMISSION_OPTIONS.map((permission) => {
            const active = customRoleForm.permissions.includes(permission.value);
            return (
              <TouchableOpacity
                key={permission.value}
                activeOpacity={0.75}
                style={[
                  styles.permissionChip,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary + '10' : colors.surface,
                  },
                ]}
                onPress={() => toggleCustomRolePermission(permission.value)}
              >
                <Text style={{ color: active ? colors.primary : colors.text }}>{permission.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Button
          title="Создать роль"
          onPress={handleCreateCustomRole}
          loading={saving}
          fullWidth
          icon="plus"
        />
      </BottomSheetModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerAction: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsCard: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderActions: {
    flexDirection: 'row',
    gap: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalSection: {
    marginBottom: 14,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  goalLabel: {
    fontSize: 13,
  },
  goalValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressText: {
    marginTop: 6,
    fontSize: 12,
  },
  inviteBox: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteBoxText: {
    marginLeft: 10,
    flex: 1,
  },
  inviteLabel: {
    fontSize: 12,
  },
  inviteValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  customRoleRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  customRoleInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  customRoleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
    marginRight: 10,
  },
  customRoleTextWrap: {
    flex: 1,
  },
  customRoleName: {
    fontSize: 15,
    fontWeight: '600',
  },
  customRolePermissions: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  quickAction: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  roleChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalHint: {
    fontSize: 13,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  customRoleSelection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  customRoleChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  colorChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
  },
  permissionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  permissionChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});

export default FamilyDetailScreen;

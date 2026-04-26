import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import BottomSheetModal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { families as familiesApi } from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import { toArrayData } from '../utils/syncService';

const EMPTY_CREATE_FORM = {
  name: '',
  description: '',
  savingsGoal: '',
};

const FamilyScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user, refreshUser } = useAuth();
  const isFocused = useIsFocused();
  const isChildOnly = Boolean(user?.isChildOnly || user?.is_child_only);

  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [inviteCode, setInviteCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const loadFamilies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await familiesApi.getAll();
      setFamilies(toArrayData(response));
    } catch (err) {
      console.error('Ошибка загрузки семей:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    loadFamilies();
  }, [isFocused, loadFamilies]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFamilies();
  }, [loadFamilies]);

  const handleCreateFamily = async () => {
    if (!createForm.name.trim()) {
      Alert.alert('Ошибка', 'Введите название семьи');
      return;
    }

    try {
      setCreating(true);
      const response = await familiesApi.create({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        savingsGoal: createForm.savingsGoal ? Number(createForm.savingsGoal) : undefined,
      });
      const createdFamilyId = response.data?.data?.id;
      setCreateForm(EMPTY_CREATE_FORM);
      setShowCreateModal(false);
      await refreshUser();
      await loadFamilies();
      if (createdFamilyId) {
        navigation.navigate('FamilyDetail', { familyId: createdFamilyId });
      }
    } catch (err) {
      Alert.alert(
        'Ошибка',
        err.response?.data?.message || err.response?.data?.error || 'Не удалось создать семью'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Ошибка', 'Введите код приглашения');
      return;
    }

    try {
      setJoining(true);
      await familiesApi.acceptInvite(inviteCode.trim().toUpperCase());
      setInviteCode('');
      setShowJoinModal(false);
      await refreshUser();
      await loadFamilies();
      Alert.alert('Готово', 'Вы присоединились к семье.');
    } catch (err) {
      Alert.alert(
        'Ошибка',
        err.response?.data?.message || err.response?.data?.error || 'Не удалось вступить в семью'
      );
    } finally {
      setJoining(false);
    }
  };

  const renderFamily = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => navigation.navigate('FamilyDetail', { familyId: item.id })}
    >
      <Card style={styles.familyCard}>
        <View style={styles.familyHeader}>
          <View style={[styles.familyIcon, { backgroundColor: colors.primary }]}>
            <Icon name="home-heart" size={28} color="#ffffff" />
          </View>
          <View style={styles.familyInfo}>
            <Text style={[styles.familyName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.familyMeta, { color: colors.textSecondary }]}>
              {(item.member_count || item.members?.length || 1)} участник
              {(item.member_count || item.members?.length || 1) === 1
                ? ''
                : (item.member_count || item.members?.length || 1) < 5 ? 'а' : 'ов'}
              {' • '}
              {item.role === 'parent' ? 'Родитель' : 'Участник'}
            </Text>
          </View>
          <Icon name="chevron-right" size={22} color={colors.textSecondary} />
        </View>

        {item.description ? (
          <Text style={[styles.familyDescription, { color: colors.textSecondary }]}>
            {item.description}
          </Text>
        ) : null}

        {Number(item.savings_goal || 0) > 0 ? (
          <View style={[styles.goalBox, { backgroundColor: colors.primary + '10' }]}>
            <Icon name="target" size={18} color={colors.primary} />
            <Text style={[styles.goalText, { color: colors.text }]}>
              Цель накоплений: {formatCurrency(item.savings_goal)}
            </Text>
          </View>
        ) : null}
      </Card>
    </TouchableOpacity>
  );

  const listHeader = (
    <View style={styles.actionsRow}>
      {!isChildOnly ? (
        <Button
          title="Создать семью"
          onPress={() => setShowCreateModal(true)}
          icon="plus"
          size="small"
          style={styles.actionButton}
        />
      ) : null}
      <Button
        title="Вступить по коду"
        onPress={() => setShowJoinModal(true)}
        icon="account-plus"
        size="small"
        variant={isChildOnly ? 'primary' : 'outline'}
        style={styles.actionButton}
      />
    </View>
  );

  const renderEmptyFamilies = () => (
    <View style={styles.emptyWrap}>
      <EmptyState
        icon="home-heart"
        title="Семей пока нет"
        description={isChildOnly ? 'Вступите в семью по коду приглашения' : 'Создайте семью или вступите по коду'}
      />
      <View style={styles.emptyActions}>
        <Button
          title="Вступить по коду"
          onPress={() => setShowJoinModal(true)}
          icon="account-plus"
          variant={isChildOnly ? 'primary' : 'outline'}
          fullWidth
          style={styles.emptyActionButton}
        />
        {!isChildOnly ? (
          <Button
            title="Создать семью"
            onPress={() => setShowCreateModal(true)}
            icon="plus"
            fullWidth
            style={styles.emptyActionButton}
          />
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Семья" />

      {loading && families.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Загружаем семьи...</Text>
        </View>
      ) : families.length === 0 ? (
        renderEmptyFamilies()
      ) : (
        <FlatList
          data={families}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderFamily}
          ListHeaderComponent={listHeader}
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

      <BottomSheetModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Создать семью"
      >
        <Input
          label="Название"
          value={createForm.name}
          onChangeText={(value) => setCreateForm((prev) => ({ ...prev, name: value }))}
          placeholder="Например, Семья Ивановых"
          icon="home-heart"
        />
        <Input
          label="Описание"
          value={createForm.description}
          onChangeText={(value) => setCreateForm((prev) => ({ ...prev, description: value }))}
          placeholder="Дом, общие задачи, цели"
          icon="text-box-outline"
        />
        <Input
          label="Цель накоплений"
          value={createForm.savingsGoal}
          onChangeText={(value) => setCreateForm((prev) => ({ ...prev, savingsGoal: value.replace(/[^0-9]/g, '') }))}
          placeholder="100000"
          icon="target"
          keyboardType="numeric"
        />
        <Button
          title="Создать"
          onPress={handleCreateFamily}
          loading={creating}
          fullWidth
          icon="plus"
        />
      </BottomSheetModal>

      <BottomSheetModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Вступить по коду"
      >
        <Input
          label="Код приглашения"
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="Введите код семьи"
          icon="key-variant"
          autoCapitalize="characters"
        />
        <Button
          title="Вступить"
          onPress={handleJoinFamily}
          loading={joining}
          fullWidth
          icon="account-plus"
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
    paddingBottom: 40,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyActions: {
    gap: 10,
    marginTop: -8,
  },
  emptyActionButton: {
    marginBottom: 0,
  },
  actionButton: {
    flex: 1,
  },
  familyCard: {
    marginBottom: 12,
  },
  familyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  familyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  familyInfo: {
    flex: 1,
  },
  familyName: {
    fontSize: 18,
    fontWeight: '700',
  },
  familyMeta: {
    marginTop: 3,
    fontSize: 13,
  },
  familyDescription: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
  },
  goalBox: {
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default FamilyScreen;

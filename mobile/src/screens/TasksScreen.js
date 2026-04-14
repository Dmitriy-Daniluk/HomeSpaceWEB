import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import TaskItem from '../components/TaskItem';
import EmptyState from '../components/EmptyState';
import { LoadingOverlay, TaskSkeleton } from '../components/Loading';
import Button from '../components/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { tasks as tasksApi } from '../utils/api';
import { tasksDB } from '../db/database';
import { TASK_STATUS, TASK_STATUS_LABELS } from '../utils/constants';

const TasksScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState([]);
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState('personal');

  useEffect(() => {
    loadTasks();
  }, [selectedFamily, statusFilter, mode]);

  useEffect(() => {
    loadFamilies();
  }, []);

  const loadFamilies = async () => {
    try {
      if (user?.families && user.families.length > 0) {
        setFamilies(user.families);
        if (!selectedFamily && user.families.length > 0) {
          setSelectedFamily(user.families[0].id);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки семей:', err);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params = {};
      if (mode === 'family') {
        params.familyId = selectedFamily;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await tasksApi.getAll(params);
      const tasksData = response.data.tasks || response.data.data || response.data;
      setTasks(tasksData);
      if (tasksData.length > 0) {
        await tasksDB.clearAll();
        tasksData.forEach((t) => tasksDB.insert({ ...t, remote_id: t.id, synced: 1 }));
      }
    } catch (err) {
      console.error('Ошибка загрузки задач:', err);
      const cached = await tasksDB.getAll(mode === 'family' ? selectedFamily : null);
      setTasks(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTasks();
  }, [selectedFamily, statusFilter, mode]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksApi.changeStatus(taskId, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось изменить статус');
    }
  };

  const handleDelete = (taskId) => {
    Alert.alert('Удалить задачу', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await tasksApi.delete(taskId);
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
          } catch (err) {
            Alert.alert('Ошибка', 'Не удалось удалить задачу');
          }
        },
      },
    ]);
  };

  const filteredTasks = statusFilter === 'all'
    ? tasks
    : tasks.filter((t) => t.status === statusFilter);

  const statusTabs = [
    { key: 'all', label: 'Все' },
    { key: 'new', label: 'Новые' },
    { key: 'in_progress', label: 'В процессе' },
    { key: 'done', label: 'Выполнены' },
  ];

  const renderTask = ({ item }) => (
    <TaskItem
      task={item}
      onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
      onStatusChange={handleStatusChange}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Задачи"
        rightIcon="plus"
        onRightPress={() => navigation.navigate('AddTask', { mode, familyId: mode === 'family' ? selectedFamily : null })}
      />

      {/* Mode Toggle */}
      <View style={styles.modeToggleContainer}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            { backgroundColor: mode === 'personal' ? colors.primary : colors.card },
          ]}
          onPress={() => setMode('personal')}
        >
          <Icon
            name="account"
            size={16}
            color={mode === 'personal' ? '#ffffff' : colors.textSecondary}
          />
          <Text
            style={[
              styles.modeButtonText,
              { color: mode === 'personal' ? '#ffffff' : colors.textSecondary },
            ]}
          >
            Мои задачи
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeButton,
            { backgroundColor: mode === 'family' ? colors.primary : colors.card },
          ]}
          onPress={() => setMode('family')}
        >
          <Icon
            name="account-group"
            size={16}
            color={mode === 'family' ? '#ffffff' : colors.textSecondary}
          />
          <Text
            style={[
              styles.modeButtonText,
              { color: mode === 'family' ? '#ffffff' : colors.textSecondary },
            ]}
          >
            Задачи семьи
          </Text>
        </TouchableOpacity>
      </View>

      {/* Family Selector (only in family mode) */}
      {mode === 'family' && families.length > 1 && (
        <View style={styles.familySelector}>
          <FlatList
            horizontal
            data={families}
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.familyList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.familyChip,
                  {
                    backgroundColor: selectedFamily === item.id ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setSelectedFamily(item.id)}
              >
                <Text
                  style={[
                    styles.familyChipText,
                    { color: selectedFamily === item.id ? '#ffffff' : colors.text },
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Status Tabs */}
      <View style={styles.tabsContainer}>
        {statusTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              {
                backgroundColor: statusFilter === tab.key ? colors.primary : 'transparent',
              },
            ]}
            onPress={() => setStatusFilter(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: statusFilter === tab.key ? '#ffffff' : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List */}
      {loading && !refreshing ? (
        <View style={styles.listContent}>
          {[1, 2, 3].map((i) => <TaskSkeleton key={i} />)}
        </View>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon="clipboard-text-outline"
          title="Задач нет"
          description={mode === 'personal' ? 'Создайте свою первую личную задачу' : 'Создайте первую задачу для вашей семьи'}
          actionTitle="Создать задачу"
          onAction={() => navigation.navigate('AddTask', { mode, familyId: mode === 'family' ? selectedFamily : null })}
        />
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTask}
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

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddTask', { mode, familyId: mode === 'family' ? selectedFamily : null })}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={28} color="#ffffff" />
      </TouchableOpacity>

      <LoadingOverlay visible={false} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  familySelector: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  familyList: {
    gap: 8,
  },
  familyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  familyChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 40 : 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});

export default TasksScreen;

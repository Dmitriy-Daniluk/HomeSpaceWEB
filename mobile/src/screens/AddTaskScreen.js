import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { families as familiesApi, tasks as tasksApi } from '../utils/api';
import { tasksDB } from '../db/database';
import { TASK_PRIORITY, TASK_PRIORITY_LABELS, TASK_STATUS } from '../utils/constants';
import { formatDateForApi, getPriorityColor } from '../utils/helpers';
import { getResponseData, isRetryableRequestError } from '../utils/syncService';

const AddTaskScreen = ({ route, navigation }) => {
  const { task: existingTask, mode, familyId } = route.params || {};
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(existingTask?.title || '');
  const [description, setDescription] = useState(existingTask?.description || '');
  const [priority, setPriority] = useState(existingTask?.priority || 'medium');
  const [deadline, setDeadline] = useState(existingTask?.deadline ? new Date(existingTask.deadline) : null);
  const [executorId, setExecutorId] = useState(existingTask?.executor_id || null);
  const [executorName, setExecutorName] = useState(existingTask?.executor_name || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showExecutorModal, setShowExecutorModal] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);

  const isEditing = !!existingTask;

  useEffect(() => {
    const loadFamilyMembers = async () => {
      const resolvedFamilyId = familyId || existingTask?.family_id || null;
      if (!resolvedFamilyId) {
        setFamilyMembers([]);
        return;
      }

      try {
        const response = await familiesApi.getById(resolvedFamilyId);
        const family = getResponseData(response);
        setFamilyMembers(family.members || []);
      } catch (error) {
        console.error('Ошибка загрузки участников семьи:', error);
        setFamilyMembers([]);
      }
    };

    loadFamilyMembers();
  }, [existingTask?.family_id, familyId]);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDeadline(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Введите название задачи');
      return;
    }

    setLoading(true);
    try {
      const resolvedFamilyId = familyId || existingTask?.family_id || null;
      const data = {
        title: title.trim(),
        description: description.trim(),
        priority,
        deadline: deadline ? formatDateForApi(deadline) : null,
        executor_id: executorId,
        executor_name: executorName,
        family_id: resolvedFamilyId,
        familyId: resolvedFamilyId,
        status: existingTask?.status || TASK_STATUS.NEW,
      };

      if (isEditing) {
        const taskId = existingTask.remote_id || existingTask.id;
        const response = await tasksApi.update(taskId, data);
        await tasksDB.upsertRemote(getResponseData(response));
      } else {
        const response = await tasksApi.create(data);
        await tasksDB.upsertRemote(getResponseData(response));
      }
      navigation.goBack();
    } catch (err) {
      if (isRetryableRequestError(err)) {
        const resolvedFamilyId = familyId || existingTask?.family_id || null;
        const localTask = {
          title: title.trim(),
          description: description.trim(),
          priority,
          deadline: deadline ? formatDateForApi(deadline) : null,
          executor_id: executorId,
          executor_name: executorName,
          family_id: resolvedFamilyId,
          status: existingTask?.status || TASK_STATUS.NEW,
        };
        if (isEditing) {
          await tasksDB.update(existingTask.id, localTask);
        } else {
          await tasksDB.insertLocal(localTask);
        }
        Alert.alert('Сохранено локально', 'Изменение отправится на сервер, когда он снова будет доступен.');
        navigation.goBack();
        return;
      }
      Alert.alert('Ошибка', err.response?.data?.message || err.response?.data?.error || 'Не удалось сохранить задачу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={isEditing ? 'Редактировать задачу' : 'Новая задача'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Input
            label="Название"
            value={title}
            onChangeText={setTitle}
            placeholder="Что нужно сделать?"
            icon="clipboard-text"
          />

          <Input
            label="Описание"
            value={description}
            onChangeText={setDescription}
            placeholder="Подробности задачи..."
            icon="format-align-left"
            multiline
            numberOfLines={4}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Приоритет</Text>
          <View style={styles.priorityRow}>
            {Object.entries(TASK_PRIORITY_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.priorityButton,
                  {
                    backgroundColor: priority === key ? getPriorityColor(key) : colors.surface,
                    borderColor: getPriorityColor(key),
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => setPriority(key)}
              >
                <Text
                  style={[
                    styles.priorityButtonText,
                    { color: priority === key ? '#ffffff' : getPriorityColor(key) },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Срок выполнения</Text>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar" size={20} color={colors.primary} />
            <Text style={[styles.dateButtonText, { color: deadline ? colors.text : colors.textSecondary }]}>
              {deadline ? deadline.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Выберите дату'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={deadline || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </Card>

        {familyMembers.length > 0 && (
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Исполнитель</Text>
            {familyMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberItem,
                  {
                    backgroundColor: executorId === member.id ? colors.primary + '15' : colors.surface,
                    borderColor: executorId === member.id ? colors.primary : colors.border,
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => {
                  setExecutorId(member.id);
                  setExecutorName(member.full_name || member.fullName || member.email);
                }}
              >
                <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.memberAvatarText}>
                    {(member.full_name || member.fullName || member.email)?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
                <Text style={[styles.memberName, { color: colors.text }]}>
                  {member.full_name || member.fullName || member.email}
                </Text>
                {executorId === member.id && (
                  <Icon name="check-circle" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </Card>
        )}

        <Button
          title={isEditing ? 'Сохранить изменения' : 'Создать задачу'}
          onPress={handleSubmit}
          loading={loading}
          fullWidth
          size="large"
          icon={isEditing ? 'content-save' : 'plus'}
          style={styles.submitButton}
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
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  priorityButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  dateButtonText: {
    fontSize: 15,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  memberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 20,
  },
});

export default AddTaskScreen;

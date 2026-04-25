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
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import BottomSheetModal from '../components/Modal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { tasks as tasksApi } from '../utils/api';
import { tasksDB } from '../db/database';
import { getStatusColor, getPriorityColor, formatDateTime } from '../utils/helpers';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../utils/constants';
import { getResponseData, isNetworkError } from '../utils/syncService';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const TaskDetailScreen = ({ route, navigation }) => {
  const { taskId, task: routeTask } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      if (routeTask && !routeTask.remote_id && routeTask.synced === 0) {
        setTask(routeTask);
        setAttachments([]);
        return;
      }
      const response = await tasksApi.getById(routeTask?.remote_id || taskId);
      const loadedTask = getResponseData(response);
      await tasksDB.upsertRemote(loadedTask);
      setTask(loadedTask);
      setAttachments(response.data.attachments || loadedTask?.attachments || []);
    } catch (err) {
      const cached = await tasksDB.getById(taskId);
      if (cached) {
        setTask(cached);
        setAttachments([]);
      } else {
        Alert.alert('Ошибка', 'Не удалось загрузить задачу');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const remoteTaskId = task?.remote_id || taskId;
      if (!task?.remote_id && task?.sync_action === 'create') {
        await tasksDB.changeStatus(task.id, newStatus);
        setTask((prev) => ({ ...prev, status: newStatus, synced: 0 }));
        setShowStatusModal(false);
        return;
      }
      const response = await tasksApi.changeStatus(remoteTaskId, newStatus);
      await tasksDB.upsertRemote(getResponseData(response) || { ...task, id: remoteTaskId, status: newStatus });
      setTask((prev) => ({ ...prev, status: newStatus }));
      setShowStatusModal(false);
    } catch (err) {
      if (isNetworkError(err)) {
        await tasksDB.changeStatus(task?.id || taskId, newStatus);
        setTask((prev) => ({ ...prev, status: newStatus, synced: 0 }));
        setShowStatusModal(false);
        return;
      }
      Alert.alert('Ошибка', 'Не удалось изменить статус');
    }
  };

  const handleDelete = () => {
    Alert.alert('Удалить задачу', 'Вы уверены, что хотите удалить эту задачу?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            const remoteTaskId = task?.remote_id || taskId;
            if (!task?.remote_id && task?.sync_action === 'create') {
              await tasksDB.delete(task.id);
            } else {
              await tasksApi.delete(remoteTaskId);
              await tasksDB.delete(remoteTaskId);
            }
            navigation.goBack();
          } catch (err) {
            if (isNetworkError(err)) {
              await tasksDB.markDeleted(task?.id || taskId);
              navigation.goBack();
              return;
            }
            Alert.alert('Ошибка', 'Не удалось удалить задачу');
          }
        },
      },
    ]);
  };

  const pickImage = async () => {
    if (!task?.remote_id && task?.synced === 0) {
      Alert.alert('Сначала синхронизация', 'Вложения можно добавить после отправки задачи на сервер.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        const formData = new FormData();
        const attachmentName = result.assets[0].fileName || 'image.jpg';
        formData.append('file', {
          uri: result.assets[0].uri,
          name: attachmentName,
          type: 'image/jpeg',
        });
        formData.append('file_name', attachmentName);
        formData.append('file_type', 'image');
        await tasksApi.addAttachment(task?.remote_id || taskId, formData);
        loadTask();
        setShowAttachmentModal(false);
      } catch (err) {
        Alert.alert(
          'Ошибка',
          err.response?.data?.message || err.response?.data?.error || 'Не удалось загрузить файл'
        );
      }
    }
  };

  const pickDocument = async () => {
    if (!task?.remote_id && task?.synced === 0) {
      Alert.alert('Сначала синхронизация', 'Вложения можно добавить после отправки задачи на сервер.');
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.assets && result.assets[0]) {
      try {
        const formData = new FormData();
        const attachmentName = result.assets[0].name || 'attachment';
        formData.append('file', {
          uri: result.assets[0].uri,
          name: attachmentName,
          type: result.assets[0].mimeType || 'application/octet-stream',
        });
        formData.append('file_name', attachmentName);
        formData.append('file_type', 'document');
        await tasksApi.addAttachment(task?.remote_id || taskId, formData);
        loadTask();
        setShowAttachmentModal(false);
      } catch (err) {
        Alert.alert(
          'Ошибка',
          err.response?.data?.message || err.response?.data?.error || 'Не удалось загрузить файл'
        );
      }
    }
  };

  if (!task && !loading) return null;

  const statusColor = getStatusColor(task?.status);
  const priorityColor = getPriorityColor(task?.priority);
  const isOverdue = task?.deadline && new Date(task.deadline) < new Date() && task.status !== 'done';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Детали задачи"
        onBack={() => navigation.goBack()}
        rightIcon="delete"
        onRightPress={handleDelete}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
              <View style={[styles.badgeDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.badgeText, { color: statusColor }]}>
                {TASK_STATUS_LABELS[task?.status] || task?.status}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: priorityColor + '20' }]}>
              <View style={[styles.badgeDot, { backgroundColor: priorityColor }]} />
              <Text style={[styles.badgeText, { color: priorityColor }]}>
                {TASK_PRIORITY_LABELS[task?.priority] || task?.priority}
              </Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{task?.title}</Text>

          {task?.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {task.description}
            </Text>
          )}

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Icon name="calendar-clock" size={20} color={isOverdue ? colors.danger : colors.textSecondary} />
              <Text style={[styles.infoText, isOverdue && { color: colors.danger }]}>
                {task?.deadline ? formatDateTime(task.deadline) : 'Без срока'}
              </Text>
            </View>
            {task?.executor_name && (
              <View style={styles.infoItem}>
                <Icon name="account" size={20} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {task.executor_name}
                </Text>
              </View>
            )}
            <View style={styles.infoItem}>
              <Icon name="clock-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Создана: {task?.created_at ? formatDateTime(task.created_at) : '—'}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Изменить статус</Text>
          <View style={styles.statusButtons}>
            {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.statusButton,
                  {
                    backgroundColor: task?.status === key ? getStatusColor(key) : colors.surface,
                    borderColor: getStatusColor(key),
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => handleStatusChange(key)}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    { color: task?.status === key ? '#ffffff' : getStatusColor(key) },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Вложения ({attachments.length})
            </Text>
            <Button
              title="Добавить"
              onPress={() => setShowAttachmentModal(true)}
              variant="ghost"
              size="small"
              icon="plus"
            />
          </View>

          {attachments.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Нет вложений
            </Text>
          ) : (
            attachments.map((att) => (
              <View key={att.id} style={[styles.attachmentItem, { backgroundColor: colors.surface }]}>
                <Icon
                  name={att.file_type === 'image' ? 'image' : 'file-document'}
                  size={24}
                  color={colors.primary}
                />
                <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                  {att.file_name || 'Файл'}
                </Text>
              </View>
            ))
          )}
        </Card>

        <View style={styles.actionButtons}>
          <Button
            title="Редактировать"
            onPress={() => navigation.navigate('AddTask', { task })}
            variant="outline"
            icon="pencil"
            fullWidth
          />
        </View>
      </ScrollView>

      <BottomSheetModal
        visible={showAttachmentModal}
        onClose={() => setShowAttachmentModal(false)}
        title="Добавить вложение"
      >
        <Button
          title="Выбрать изображение"
          onPress={pickImage}
          variant="outline"
          icon="image"
          fullWidth
          style={{ marginBottom: 12 }}
        />
        <Button
          title="Выбрать документ"
          onPress={pickDocument}
          variant="outline"
          icon="file-document"
          fullWidth
        />
      </BottomSheetModal>
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
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 28,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusButton: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  attachmentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
});

export default TaskDetailScreen;

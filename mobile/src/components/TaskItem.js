import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getStatusColor, getPriorityColor } from '../utils/helpers';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../utils/constants';

const TaskItem = ({ task, onPress, onStatusChange }) => {
  const { colors } = useTheme();

  const statusColor = getStatusColor(task.status);
  const priorityColor = getPriorityColor(task.priority);
  const statusLabel = TASK_STATUS_LABELS[task.status] || task.status;
  const priorityLabel = TASK_PRIORITY_LABELS[task.priority] || task.priority;

  const cycleStatus = () => {
    const statusOrder = ['new', 'in_progress', 'done'];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    if (onStatusChange) {
      onStatusChange(task.id, nextStatus);
    }
  };

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done';

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={() => onPress && onPress(task)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {task.title}
          </Text>
          {task.status === 'done' && (
            <Icon name="check-circle" size={22} color={colors.success} style={styles.doneIcon} />
          )}
        </View>
      </View>

      {task.description && (
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {task.description}
        </Text>
      )}

      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.badgeDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: priorityColor + '20' }]}>
          <View style={[styles.badgeDot, { backgroundColor: priorityColor }]} />
          <Text style={[styles.badgeText, { color: priorityColor }]}>{priorityLabel}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        {task.deadline && (
          <View style={styles.footerItem}>
            <Icon
              name="calendar-clock"
              size={14}
              color={isOverdue ? colors.danger : colors.textSecondary}
            />
            <Text style={[styles.footerText, isOverdue && { color: colors.danger }]}>
              {new Date(task.deadline).toLocaleDateString('ru-RU')}
            </Text>
          </View>
        )}
        {task.executor_name && (
          <View style={styles.footerItem}>
            <Icon name="account" size={14} color={colors.textSecondary} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {task.executor_name}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.statusButton, { borderColor: statusColor }]}
        onPress={cycleStatus}
        activeOpacity={0.6}
      >
        <Icon name="swap-horizontal" size={16} color={statusColor} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  doneIcon: {
    marginLeft: 8,
  },
  description: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
  },
  statusButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

export default TaskItem;

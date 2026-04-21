import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import BottomSheetModal from '../components/Modal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { families as familiesApi } from '../utils/api';
import { formatCurrency } from '../utils/helpers';

const FamilyDetailScreen = ({ route, navigation }) => {
  const { familyId } = route.params;
  const { colors } = useTheme();
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    loadFamily();
  }, [familyId]);

  const loadFamily = async () => {
    try {
      setLoading(true);
      const [familyRes, membersRes, statsRes] = await Promise.all([
        familiesApi.getById(familyId),
        familiesApi.getMembers(familyId),
        familiesApi.getStats(familyId),
      ]);
      setFamily(familyRes.data.family || familyRes.data);
      setMembers(membersRes.data.members || membersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось загрузить данные семьи');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Ошибка', 'Введите адрес электронной почты');
      return;
    }
    try {
      await familiesApi.inviteMember(familyId, inviteEmail.trim());
      Alert.alert('Успех', 'Приглашение отправлено');
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось отправить приглашение');
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
            setMembers((prev) => prev.filter((m) => m.id !== memberId));
          } catch (err) {
            Alert.alert('Ошибка', 'Не удалось удалить участника');
          }
        },
      },
    ]);
  };

  const renderMember = ({ item }) => (
    <View style={[styles.memberRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.memberAvatarText}>
          {item.name?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
          {item.role || 'Участник'}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleRemoveMember(item.id)}
        style={styles.removeButton}
      >
        <Icon name="account-remove" size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={family?.name || 'Семья'}
        onBack={() => navigation.goBack()}
        rightIcon="account-plus"
        onRightPress={() => setShowInviteModal(true)}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Icon name="cash-multiple" size={28} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(stats?.total_savings || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Накоплено</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="clipboard-check" size={28} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats?.completed_tasks || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Задач выполнено</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="clock-alert" size={28} color={colors.warning} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats?.pending_tasks || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Задач в работе</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Участники ({members.length})
            </Text>
            <TouchableOpacity onPress={() => setShowInviteModal(true)}>
              <Text style={[styles.inviteLink, { color: colors.primary }]}>Пригласить</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={members}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMember}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Нет участников
              </Text>
            }
          />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Быстрые действия</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.primary + '15' }]}
              onPress={() => navigation.navigate('AddTask', { familyId })}
            >
              <Icon name="plus-circle" size={28} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.primary }]}>Задача</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.accent + '15' }]}
              onPress={() => navigation.navigate('AddTransaction', { familyId })}
            >
              <Icon name="cash-plus" size={28} color={colors.accent} />
              <Text style={[styles.quickActionText, { color: colors.accent }]}>Бюджет</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.success + '15' }]}
              onPress={() => navigation.navigate('Chat')}
            >
              <Icon name="message" size={28} color={colors.success} />
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
        <Button
          title="Отправить приглашение"
          onPress={handleInvite}
          fullWidth
          icon="send"
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  inviteLink: {
    fontSize: 14,
    fontWeight: '600',
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
  },
  removeButton: {
    padding: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAction: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    flex: 1,
    marginHorizontal: 4,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
});

export default FamilyDetailScreen;

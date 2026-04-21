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
import Card from '../components/Card';
import TransactionItem from '../components/TransactionItem';
import EmptyState from '../components/EmptyState';
import { TransactionSkeleton } from '../components/Loading';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { budget as budgetApi } from '../utils/api';
import { transactionsDB } from '../db/database';
import { formatCurrency } from '../utils/helpers';

const BudgetScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState('personal');
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);

  useEffect(() => {
    loadFamilies();
  }, []);

  useEffect(() => {
    loadBudget();
  }, [period, mode, selectedFamily]);

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

  const loadBudget = async () => {
    try {
      setLoading(true);
      const params = { period };
      if (mode === 'family') {
        params.familyId = selectedFamily;
      }

      const [transRes, summaryRes] = await Promise.all([
        budgetApi.getTransactions(params),
        budgetApi.getSummary(params),
      ]);
      const transData = transRes.data.transactions || transRes.data.data || transRes.data;
      const summaryData = summaryRes.data;
      setTransactions(transData);
      setSummary({
        income: summaryData.income || 0,
        expense: summaryData.expense || 0,
        balance: summaryData.balance || 0,
      });
      if (transData.length > 0) {
        await transactionsDB.clearAll();
        transData.forEach((t) => transactionsDB.insert({ ...t, remote_id: t.id, synced: 1 }));
      }
    } catch (err) {
      console.error('Ошибка загрузки бюджета:', err);
      const cached = await transactionsDB.getAll(mode === 'family' ? selectedFamily : null);
      setTransactions(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBudget();
  }, [period, mode, selectedFamily]);

  const handleDelete = (transactionId) => {
    Alert.alert('Удалить транзакцию', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await budgetApi.deleteTransaction(transactionId);
            setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
          } catch (err) {
            Alert.alert('Ошибка', 'Не удалось удалить транзакцию');
          }
        },
      },
    ]);
  };

  const renderTransaction = ({ item }) => (
    <TransactionItem
      transaction={item}
      onPress={() => handleDelete(item.id)}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Бюджет"
        rightIcon="plus"
        onRightPress={() => navigation.navigate('AddTransaction', { mode, familyId: mode === 'family' ? selectedFamily : null })}
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
            Личный
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
            Семейный
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

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <Card variant="gradient" style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Баланс</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(summary.balance)}</Text>
        </Card>

        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
            <View style={styles.summaryIconRow}>
              <Icon name="arrow-down-circle" size={20} color={colors.success} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Доходы</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: colors.success }]}>
              {formatCurrency(summary.income)}
            </Text>
          </Card>

          <Card style={[styles.summaryCard, { borderLeftWidth: 4, borderLeftColor: colors.danger }]}>
            <View style={styles.summaryIconRow}>
              <Icon name="arrow-up-circle" size={20} color={colors.danger} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Расходы</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: colors.danger }]}>
              {formatCurrency(summary.expense)}
            </Text>
          </Card>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {['all', 'month'].map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.periodButton,
              { backgroundColor: period === p ? colors.primary : colors.card },
            ]}
            onPress={() => setPeriod(p)}
          >
            <Text
              style={[
                styles.periodText,
                { color: period === p ? '#ffffff' : colors.textSecondary },
              ]}
            >
              {p === 'all' ? 'Всё время' : 'Этот месяц'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transactions List */}
      {loading && !refreshing ? (
        <View style={styles.listContent}>
          {[1, 2, 3].map((i) => <TransactionSkeleton key={i} />)}
        </View>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon="cash-multiple"
          title="Транзакций нет"
          description={mode === 'personal' ? 'Добавьте свою первую личную транзакцию' : 'Добавьте первую транзакцию'}
          actionTitle="Добавить"
          onAction={() => navigation.navigate('AddTransaction', { mode, familyId: mode === 'family' ? selectedFamily : null })}
        />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTransaction}
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
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => navigation.navigate('AddTransaction', { mode, familyId: mode === 'family' ? selectedFamily : null })}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={28} color="#ffffff" />
      </TouchableOpacity>
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
  summaryContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  balanceCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 14,
  },
  summaryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  periodText: {
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

export default BudgetScreen;

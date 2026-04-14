import React, { useState, useEffect, useCallback } from 'react';
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
import EmptyState from '../components/EmptyState';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { families as familiesApi } from '../utils/api';
import { formatCurrency, calculateProgress } from '../utils/helpers';

const FamilyScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFamilies();
  }, []);

  const loadFamilies = async () => {
    try {
      setLoading(true);
      const response = await familiesApi.getAll();
      setFamilies(response.data.families || response.data);
    } catch (err) {
      console.error('Ошибка загрузки семей:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFamilies();
  }, []);

  const handleCreateFamily = () => {
    Alert.prompt(
      'Создать семью',
      'Введите название вашей семьи',
      async (name) => {
        if (name && name.trim()) {
          try {
            await familiesApi.create({ name: name.trim() });
            loadFamilies();
          } catch (err) {
            Alert.alert('Ошибка', 'Не удалось создать семью');
          }
        }
      }
    );
  };

  const renderFamily = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('FamilyDetail', { familyId: item.id })}
    >
      <Card style={styles.familyCard}>
        <View style={styles.familyHeader}>
          <View style={[styles.familyIcon, { backgroundColor: colors.primary }]}>
            <Icon name="home-heart" size={28} color="#ffffff" />
          </View>
          <View style={styles.familyInfo}>
            <Text style={[styles.familyName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.familyMembers, { color: colors.textSecondary }]}>
              <Icon name="account-group" size={14} color={colors.textSecondary} />
              {' '}{item.member_count || 1} участник{item.member_count === 1 ? '' : item.member_count < 5 ? 'а' : 'ов'}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.textSecondary} />
        </View>

        {item.savings_goal && (
          <View style={styles.savingsSection}>
            <View style={styles.savingsHeader}>
              <Text style={[styles.savingsLabel, { color: colors.textSecondary }]}>
                Цель накоплений
              </Text>
              <Text style={[styles.savingsAmount, { color: colors.primary }]}>
                {formatCurrency(item.current_savings || 0)} / {formatCurrency(item.savings_goal)}
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${calculateProgress(item.current_savings, item.savings_goal)}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {calculateProgress(item.current_savings, item.savings_goal)}%
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Семья"
        rightIcon="account-plus"
        onRightPress={handleCreateFamily}
      />

      {families.length === 0 && !loading ? (
        <EmptyState
          icon="home-heart"
          title="Семей нет"
          description="Создайте свою первую семью"
          actionTitle="Создать семью"
          onAction={handleCreateFamily}
        />
      ) : (
        <FlatList
          data={families}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderFamily}
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

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleCreateFamily}
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  familyCard: {
    marginBottom: 12,
  },
  familyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    marginBottom: 2,
  },
  familyMembers: {
    fontSize: 13,
  },
  savingsSection: {
    marginTop: 4,
  },
  savingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  savingsLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  savingsAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
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

export default FamilyScreen;

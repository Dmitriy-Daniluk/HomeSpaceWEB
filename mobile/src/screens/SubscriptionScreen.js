import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { subscription as subscriptionApi } from '../utils/api';
import { isChildOnlyUser } from '../utils/helpers';

const PLANS = [
  {
    id: 'month',
    title: 'HomeSpace Plus',
    period: 'в месяц',
    price: 299,
    badge: 'Гибкий старт',
  },
  {
    id: 'year',
    title: 'HomeSpace Plus год',
    period: 'в год',
    price: 2490,
    badge: 'Выгодно',
  },
];

const BANKS = ['СберБанк', 'Т-Банк', 'Альфа-Банк', 'ВТБ'];

const FEATURES = [
  'Полная история семейного бюджета',
  'Аналитика по задачам и продуктивности',
  'Экспорт отчётов в PDF и Excel',
  'Кастомные роли в семье',
];

const SubscriptionScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user, refreshUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('month');
  const [selectedBank, setSelectedBank] = useState(BANKS[0]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const currentPlan = useMemo(
    () => PLANS.find((plan) => plan.id === selectedPlan) || PLANS[0],
    [selectedPlan]
  );
  const isChildOnly = isChildOnlyUser(user);

  const sbpCode = useMemo(
    () => `SBP-HOMESPACE-${selectedPlan.toUpperCase()}-${user?.id || 'DEMO'}`,
    [selectedPlan, user?.id]
  );

  const handlePurchase = async () => {
    if (isChildOnly) {
      setErrorMessage('Подписку может оформлять только родительский аккаунт.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      const response = await subscriptionApi.purchase({
        plan: selectedPlan,
        bank: selectedBank,
        sbpCode,
      });
      const nextUser = response.data?.data || response.data;
      await refreshUser(nextUser);
      setSuccessMessage('Подписка активирована и уже привязана к вашему аккаунту.');
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message
        || error.response?.data?.error
        || 'Не удалось активировать подписку.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Подписка" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={[styles.heroCard, { backgroundColor: colors.primary }]}>
          <View style={styles.heroRow}>
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle}>HomeSpace Plus</Text>
              <Text style={styles.heroText}>
                Мобильная версия без админки, но с оплатой подписки, аналитикой и расширенными семейными возможностями.
              </Text>
            </View>
            <View style={styles.heroBadge}>
              <Icon name="crown" size={22} color="#fbbf24" />
            </View>
          </View>

          {user?.has_subscription ? (
            <View style={styles.activeBadge}>
              <Icon name="check-circle" size={16} color="#86efac" />
              <Text style={styles.activeText}>
                Активна до {new Date(user.subscription_until).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          ) : isChildOnly ? (
            <Text style={styles.heroHint}>
              Детский аккаунт не оформляет подписку сам. Оплату делает родитель.
            </Text>
          ) : (
            <Text style={styles.heroHint}>
              Оплата идёт через mock СБП, как и в web-версии.
            </Text>
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Что входит</Text>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Icon name="check-circle-outline" size={18} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Выберите план</Text>
          {PLANS.map((plan) => {
            const active = selectedPlan === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                activeOpacity={0.75}
                style={[
                  styles.planCard,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary + '10' : colors.surface,
                  },
                ]}
                onPress={() => setSelectedPlan(plan.id)}
              >
                <View style={styles.planHeader}>
                  <View>
                    <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
                    <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>{plan.period}</Text>
                  </View>
                  <View style={[styles.planBadge, { backgroundColor: active ? colors.primary : colors.border }]}>
                    <Text style={[styles.planBadgeText, { color: active ? '#ffffff' : colors.textSecondary }]}>
                      {plan.badge}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.planPrice, { color: colors.text }]}>
                  {plan.price.toLocaleString('ru-RU')} ₽
                </Text>
              </TouchableOpacity>
            );
          })}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Банк для mock СБП</Text>
          <View style={styles.bankGrid}>
            {BANKS.map((bank) => {
              const active = bank === selectedBank;
              return (
                <TouchableOpacity
                  key={bank}
                  activeOpacity={0.75}
                  style={[
                    styles.bankChip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary + '10' : colors.surface,
                    },
                  ]}
                  onPress={() => setSelectedBank(bank)}
                >
                  <Text style={[styles.bankChipText, { color: active ? colors.primary : colors.text }]}>
                    {bank}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Код платежа</Text>
          <Text style={[styles.sbpCode, { color: colors.text }]}>{sbpCode}</Text>
          <Text style={[styles.sbpHint, { color: colors.textSecondary }]}>
            Это dev-заглушка. Деньги не списываются, но подписка на backend активируется по-настоящему.
          </Text>

          {errorMessage ? (
            <View style={[styles.messageBox, { backgroundColor: colors.danger + '15' }]}>
              <Text style={[styles.messageText, { color: colors.danger }]}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={[styles.messageBox, { backgroundColor: colors.success + '15' }]}>
              <Text style={[styles.messageText, { color: colors.success }]}>{successMessage}</Text>
            </View>
          ) : null}

          <Button
            title={`Активировать за ${currentPlan.price.toLocaleString('ru-RU')} ₽`}
            onPress={handlePurchase}
            loading={loading}
            disabled={isChildOnly}
            fullWidth
            icon="crown-outline"
            style={styles.purchaseButton}
          />
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroInfo: {
    flex: 1,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  heroBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeText: {
    color: '#dcfce7',
    fontSize: 13,
    fontWeight: '600',
  },
  heroHint: {
    marginTop: 16,
    color: 'rgba(255,255,255,0.76)',
    fontSize: 12,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  planPeriod: {
    marginTop: 2,
    fontSize: 13,
  },
  planBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  planPrice: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '700',
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bankChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bankChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sbpCode: {
    fontSize: 14,
    fontWeight: '700',
  },
  sbpHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  messageBox: {
    marginTop: 14,
    borderRadius: 12,
    padding: 12,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  purchaseButton: {
    marginTop: 16,
  },
});

export default SubscriptionScreen;

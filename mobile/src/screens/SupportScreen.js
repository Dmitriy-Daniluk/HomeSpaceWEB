import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
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
import { feedback as feedbackApi, support as supportApi } from '../utils/api';
import { toArrayData } from '../utils/syncService';

const EMPTY_FORM = {
  subject: '',
  message: '',
};

const EMPTY_FEEDBACK_FORM = {
  message: '',
  rating: 5,
};

const STATUS_CONFIG = {
  open: {
    label: 'Открыт',
    icon: 'clock-outline',
    colorKey: 'info',
  },
  in_progress: {
    label: 'В работе',
    icon: 'progress-clock',
    colorKey: 'warning',
  },
  resolved: {
    label: 'Решён',
    icon: 'check-circle-outline',
    colorKey: 'success',
  },
  closed: {
    label: 'Закрыт',
    icon: 'close-circle-outline',
    colorKey: 'textSecondary',
  },
};

const FAQS = [
  { q: 'Как создать семью?', a: 'Перейдите в раздел "Семья" и нажмите "Создать семью". Заполните название и описание.' },
  { q: 'Как пригласить участника?', a: 'Откройте страницу семьи и нажмите "Пригласить". Введите email или поделитесь кодом.' },
  { q: 'Как добавить задачу?', a: 'На странице "Задачи" нажмите "Новая задача" и заполните все поля.' },
  { q: 'Как экспортировать бюджет?', a: 'На странице "Бюджет" используйте кнопки PDF или Excel для экспорта данных.' },
  { q: 'Как изменить видимость пароля?', a: 'Откройте пароль, нажмите редактировать и выберите нужный уровень видимости.' },
];

const SupportScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [feedbackForm, setFeedbackForm] = useState(EMPTY_FEEDBACK_FORM);
  const [openFaq, setOpenFaq] = useState(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await supportApi.getTickets();
      setTickets(toArrayData(response));
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить обращения.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    fetchTickets();
  }, [fetchTickets, isFocused]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTickets();
  }, [fetchTickets]);

  const closeForm = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const closeFeedbackForm = () => {
    setShowFeedbackForm(false);
    setFeedbackForm(EMPTY_FEEDBACK_FORM);
  };

  const submitTicket = async () => {
    if (!form.subject.trim()) {
      Alert.alert('Ошибка', 'Введите тему обращения.');
      return;
    }

    if (!form.message.trim()) {
      Alert.alert('Ошибка', 'Введите сообщение.');
      return;
    }

    try {
      setSubmitting(true);
      await supportApi.createTicket({
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      closeForm();
      await fetchTickets();
      Alert.alert('Отправлено', 'Обращение создано и передано в поддержку.');
    } catch (error) {
      Alert.alert(
        'Ошибка',
        error.response?.data?.message || error.response?.data?.error || 'Не удалось отправить обращение.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackForm.message.trim()) {
      Alert.alert('Ошибка', 'Введите текст отзыва или идеи.');
      return;
    }

    try {
      setSubmittingFeedback(true);
      await feedbackApi.submit({
        name: user?.full_name || user?.fullName || '',
        email: user?.email || '',
        message: feedbackForm.message.trim(),
        rating: feedbackForm.rating,
      });
      closeFeedbackForm();
      Alert.alert('Спасибо', 'Отзыв отправлен в обратную связь.');
    } catch (error) {
      Alert.alert(
        'Ошибка',
        error.response?.data?.message || error.response?.data?.error || 'Не удалось отправить отзыв.'
      );
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const renderStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;
    const color = colors[config.colorKey] || colors.primary;

    return (
      <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
        <Icon name={config.icon} size={14} color={color} />
        <Text style={[styles.statusText, { color }]}>{config.label}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Поддержка"
        onBack={() => navigation.goBack()}
        rightIcon="plus"
        onRightPress={() => setShowForm(true)}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        )}
      >
        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Icon name="lifebuoy" size={26} color={colors.primary} />
            </View>
            <View style={styles.heroTextBox}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Помощь и обращения</Text>
              <Text style={[styles.heroText, { color: colors.textSecondary }]}>
                Здесь можно написать в поддержку и посмотреть статус своих обращений.
              </Text>
            </View>
          </View>
          <Button
            title="Новое обращение"
            onPress={() => setShowForm(true)}
            icon="plus"
            fullWidth
            style={styles.heroButton}
          />
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Icon name="star-outline" size={20} color={colors.warning} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Обратная связь</Text>
            </View>
          </View>
          <Text style={[styles.feedbackLead, { color: colors.textSecondary }]}>
            Этот блок отправляет отзыв туда же, куда на вебе уходит форма "Обратная связь" и что видно
            в админке в разделе отзывов.
          </Text>
          <Button
            title="Отправить отзыв или идею"
            onPress={() => setShowFeedbackForm(true)}
            icon="star-four-points-outline"
            variant="outline"
            fullWidth
            style={styles.feedbackButton}
          />
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Icon name="message-text-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Мои обращения</Text>
            </View>
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
              {tickets.length}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Загружаем обращения...
              </Text>
            </View>
          ) : tickets.length === 0 ? (
            <EmptyState
              icon="lifebuoy"
              title="Нет обращений"
              description="Создайте обращение, если нужна помощь."
              actionTitle="Написать в поддержку"
              onAction={() => setShowForm(true)}
              style={styles.emptyState}
            />
          ) : (
            <View style={styles.ticketsList}>
              {tickets.map((ticket) => (
                <View
                  key={ticket.id}
                  style={[
                    styles.ticketCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.ticketHeader}>
                    <View style={styles.ticketTitleBox}>
                      <Text style={[styles.ticketSubject, { color: colors.text }]}>{ticket.subject}</Text>
                      <Text style={[styles.ticketDate, { color: colors.textSecondary }]}>
                        {new Date(ticket.created_at).toLocaleDateString('ru-RU')}
                      </Text>
                    </View>
                    {renderStatusBadge(ticket.status)}
                  </View>

                  <Text style={[styles.ticketMessage, { color: colors.textSecondary }]}>
                    {ticket.message}
                  </Text>

                  {ticket.admin_response ? (
                    <View style={[styles.adminResponseBox, { backgroundColor: `${colors.success}12` }]}>
                      <View style={styles.adminResponseHeader}>
                        <Icon name="shield-account-outline" size={16} color={colors.success} />
                        <Text style={[styles.adminResponseTitle, { color: colors.success }]}>
                          Ответ поддержки
                        </Text>
                      </View>
                      <Text style={[styles.adminResponseText, { color: colors.text }]}>
                        {ticket.admin_response}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Частые вопросы</Text>
          <View style={styles.faqList}>
            {FAQS.map((faq, index) => {
              const expanded = openFaq === index;
              return (
                <View
                  key={faq.q}
                  style={[
                    styles.faqItem,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => setOpenFaq(expanded ? null : index)}
                    style={styles.faqButton}
                  >
                    <Text style={[styles.faqQuestion, { color: colors.text }]}>{faq.q}</Text>
                    <Icon
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  {expanded ? (
                    <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{faq.a}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </Card>
      </ScrollView>

      <BottomSheetModal
        visible={showForm}
        onClose={closeForm}
        title="Новое обращение"
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Input
            label="Тема"
            value={form.subject}
            onChangeText={(text) => setForm((prev) => ({ ...prev, subject: text }))}
            placeholder="Кратко опишите проблему"
            icon="format-title"
            autoCapitalize="sentences"
            maxLength={255}
          />
          <Input
            label="Сообщение"
            value={form.message}
            onChangeText={(text) => setForm((prev) => ({ ...prev, message: text }))}
            placeholder="Подробно опишите, что произошло"
            icon="message-text-outline"
            autoCapitalize="sentences"
            multiline
            numberOfLines={5}
            maxLength={3000}
          />
          <View style={styles.formActions}>
            <Button
              title="Отмена"
              onPress={closeForm}
              variant="ghost"
              fullWidth
              style={styles.formButton}
            />
            <Button
              title="Отправить"
              onPress={submitTicket}
              loading={submitting}
              icon="send"
              fullWidth
              style={styles.formButton}
            />
          </View>
        </ScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        visible={showFeedbackForm}
        onClose={closeFeedbackForm}
        title="Обратная связь"
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={[styles.feedbackModalText, { color: colors.textSecondary }]}>
            Отзыв будет отправлен в тот же поток, что и веб-форма обратной связи.
          </Text>

          <Text style={[styles.ratingLabel, { color: colors.text }]}>Оценка</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((rating) => {
              const active = feedbackForm.rating >= rating;
              return (
                <TouchableOpacity
                  key={rating}
                  activeOpacity={0.75}
                  onPress={() => setFeedbackForm((prev) => ({ ...prev, rating }))}
                  style={styles.ratingButton}
                >
                  <Icon
                    name={active ? 'star' : 'star-outline'}
                    size={28}
                    color={active ? colors.warning : colors.border}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="Сообщение"
            value={feedbackForm.message}
            onChangeText={(text) => setFeedbackForm((prev) => ({ ...prev, message: text }))}
            placeholder="Что стоит улучшить, добавить или исправить?"
            icon="message-alert-outline"
            autoCapitalize="sentences"
            multiline
            numberOfLines={5}
            maxLength={3000}
          />

          <View style={styles.formActions}>
            <Button
              title="Отмена"
              onPress={closeFeedbackForm}
              variant="ghost"
              fullWidth
              style={styles.formButton}
            />
            <Button
              title="Отправить отзыв"
              onPress={submitFeedback}
              loading={submittingFeedback}
              icon="send"
              fullWidth
              style={styles.formButton}
            />
          </View>
        </ScrollView>
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
    paddingBottom: 32,
  },
  heroCard: {
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroTextBox: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroButton: {
    marginTop: 16,
  },
  sectionCard: {
    marginBottom: 16,
  },
  feedbackLead: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  feedbackButton: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  ticketsList: {
    gap: 10,
  },
  ticketCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  ticketTitleBox: {
    flex: 1,
  },
  ticketSubject: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  ticketDate: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  ticketMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  adminResponseBox: {
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
  },
  adminResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  adminResponseTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  adminResponseText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    paddingVertical: 24,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  faqList: {
    gap: 10,
    marginTop: 12,
  },
  feedbackModalText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ratingButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  faqItem: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  faqButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  formActions: {
    gap: 10,
    paddingBottom: 8,
  },
  formButton: {
    marginBottom: 4,
  },
});

export default SupportScreen;

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { budget as budgetApi } from '../utils/api';
import { transactionsDB } from '../db/database';
import { TRANSACTION_TYPE, TRANSACTION_TYPE_LABELS, TRANSACTION_CATEGORIES } from '../utils/constants';
import { formatCurrency, formatDateForApi } from '../utils/helpers';
import { getResponseData, isRetryableRequestError } from '../utils/syncService';

const AddTransactionScreen = ({ route, navigation }) => {
  const { familyId } = route.params || {};
  const { colors } = useTheme();
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const categories = TRANSACTION_CATEGORIES[type] || [];

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Ошибка', 'Введите корректную сумму');
      return;
    }
    if (!category) {
      Alert.alert('Ошибка', 'Выберите категорию');
      return;
    }

    setLoading(true);
    const transactionDate = formatDateForApi(date);
    try {
      const data = {
        type,
        amount: numAmount,
        category,
        description: description.trim(),
        transaction_date: transactionDate,
        family_id: familyId || null,
        familyId: familyId || null,
      };
      const response = await budgetApi.createTransaction(data);
      await transactionsDB.upsertRemote(getResponseData(response));
      navigation.goBack();
    } catch (err) {
      if (isRetryableRequestError(err)) {
        await transactionsDB.insertLocal({
          type,
          amount: numAmount,
          category,
          description: description.trim(),
          transaction_date: transactionDate,
          family_id: familyId || null,
        });
        Alert.alert('Сохранено локально', 'Транзакция отправится на сервер, когда он снова будет доступен.');
        navigation.goBack();
        return;
      }
      Alert.alert('Ошибка', err.response?.data?.message || err.response?.data?.error || 'Не удалось добавить транзакцию');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Новая транзакция"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Тип операции</Text>
          <View style={styles.typeRow}>
            {Object.entries(TRANSACTION_TYPE_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.typeButton,
                  {
                    backgroundColor: type === key ? (key === 'income' ? colors.success : colors.danger) : colors.surface,
                    borderColor: key === 'income' ? colors.success : colors.danger,
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => {
                  setType(key);
                  setCategory('');
                }}
              >
                <Icon
                  name={key === 'income' ? 'arrow-down-circle' : 'arrow-up-circle'}
                  size={22}
                  color={type === key ? '#ffffff' : (key === 'income' ? colors.success : colors.danger)}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: type === key ? '#ffffff' : colors.textSecondary },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <Input
            label="Сумма"
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            icon="cash"
            keyboardType="numeric"
          />
          {amount && (
            <Text style={[styles.amountPreview, { color: type === 'income' ? colors.success : colors.danger }]}>
              {type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(amount.replace(',', '.')) || 0)}
            </Text>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Категория</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: category === cat ? colors.primary : colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: category === cat ? '#ffffff' : colors.text },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <Input
            label="Описание"
            value={description}
            onChangeText={setDescription}
            placeholder="Комментарий к транзакции"
            icon="comment-text"
            multiline
          />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Дата</Text>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar" size={20} color={colors.primary} />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}
        </Card>

        <Button
          title="Добавить транзакцию"
          onPress={handleSubmit}
          loading={loading}
          fullWidth
          size="large"
          icon="plus-circle"
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
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  amountPreview: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  dateText: {
    fontSize: 15,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 20,
  },
});

export default AddTransactionScreen;

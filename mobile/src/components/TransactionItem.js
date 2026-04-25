import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { formatCurrency } from '../utils/helpers';

const TransactionItem = ({ transaction, onPress }) => {
  const { colors } = useTheme();
  const isIncome = transaction.type === 'income';
  const Container = onPress ? TouchableOpacity : View;
  const pressProps = onPress ? { onLongPress: onPress, activeOpacity: 0.7 } : {};

  return (
    <Container
      style={[styles.container, { backgroundColor: colors.card }]}
      {...pressProps}
    >
      <View style={[styles.iconContainer, { backgroundColor: isIncome ? colors.success + '15' : colors.danger + '15' }]}>
        <Icon
          name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
          size={28}
          color={isIncome ? colors.success : colors.danger}
        />
      </View>
      <View style={styles.content}>
        <Text style={[styles.category, { color: colors.text }]} numberOfLines={1}>
          {transaction.category || 'Без категории'}
        </Text>
        {transaction.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
            {transaction.description}
          </Text>
        )}
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {new Date(transaction.transaction_date).toLocaleDateString('ru-RU')}
        </Text>
      </View>
      <View style={styles.amountContainer}>
        <Text
          style={[
            styles.amount,
            { color: isIncome ? colors.success : colors.danger },
          ]}
        >
          {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
        </Text>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  category: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TransactionItem;

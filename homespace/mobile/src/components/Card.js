import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const Card = ({ children, style, onPress, variant = 'default' }) => {
  const { colors } = useTheme();

  const getVariantStyle = () => {
    switch (variant) {
      case 'elevated':
        return {
          ...Platform.select({
            ios: {
              shadowColor: colors.isDark ? '#000' : '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
            },
            android: {
              elevation: 5,
            },
          }),
        };
      case 'outlined':
        return {
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'gradient':
        return {
          backgroundColor: colors.primary,
        };
      default:
        return {
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
        };
    }
  };

  const Container = onPress ? View : View;

  return (
    <Container
      style={[
        styles.card,
        { backgroundColor: variant === 'gradient' ? colors.primary : colors.card },
        getVariantStyle(),
        style,
      ]}
    >
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 4,
  },
});

export default Card;

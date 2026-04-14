import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Button = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  size = 'medium',
  fullWidth = false,
}) => {
  const { colors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          container: { backgroundColor: colors.primary },
          text: { color: '#ffffff' },
        };
      case 'secondary':
        return {
          container: { backgroundColor: colors.accent },
          text: { color: '#ffffff' },
        };
      case 'danger':
        return {
          container: { backgroundColor: colors.danger },
          text: { color: '#ffffff' },
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
          text: { color: colors.text },
        };
      case 'outline':
        return {
          container: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary },
          text: { color: colors.primary },
        };
      default:
        return {
          container: { backgroundColor: colors.primary },
          text: { color: '#ffffff' },
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { container: { paddingVertical: 8, paddingHorizontal: 12 }, text: { fontSize: 12 } };
      case 'large':
        return { container: { paddingVertical: 16, paddingHorizontal: 24 }, text: { fontSize: 18 } };
      default:
        return { container: { paddingVertical: 12, paddingHorizontal: 20 }, text: { fontSize: 16 } };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text.color} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Icon name={icon} size={20} color={variantStyles.text.color} style={styles.iconLeft} />
          )}
          <Text style={[styles.text, variantStyles.text, sizeStyles.text, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Icon name={icon} size={20} color={variantStyles.text.color} style={styles.iconRight} />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default Button;

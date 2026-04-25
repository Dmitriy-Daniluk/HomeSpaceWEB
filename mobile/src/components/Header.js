import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Header = ({
  title,
  onBack,
  rightIcon,
  onRightPress,
  rightComponent,
  style,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          paddingTop: insets.top,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.left}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.6}>
              <Icon name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.right}>
          {rightComponent || (rightIcon && (
            <TouchableOpacity onPress={onRightPress} style={styles.iconButton} activeOpacity={0.6}>
              <Icon name={rightIcon} size={24} color={colors.text} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
  },
  left: {
    minWidth: 40,
    alignItems: 'flex-start',
  },
  right: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  backButton: {
    padding: 4,
  },
  iconButton: {
    padding: 4,
  },
});

export default Header;

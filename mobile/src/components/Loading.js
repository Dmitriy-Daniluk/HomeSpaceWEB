import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const LoadingOverlay = ({ visible = true, message = 'Загрузка...' }) => {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        {message && <Text style={[styles.message, { color: colors.text }]}>{message}</Text>}
      </View>
    </View>
  );
};

export const Skeleton = ({ width = '100%', height = 20, style }) => {
  const { colors } = useTheme();
  const [animValue] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
      animValue.stopAnimation();
    };
  }, [animValue]);

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, backgroundColor: colors.border, opacity },
        style,
      ]}
    />
  );
};

export const TaskSkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Skeleton width="70%" height={18} />
      <Skeleton width="100%" height={14} style={{ marginTop: 8 }} />
      <View style={styles.badges}>
        <Skeleton width={60} height={24} />
        <Skeleton width={70} height={24} />
      </View>
      <View style={styles.footer}>
        <Skeleton width={80} height={14} />
        <Skeleton width={100} height={14} />
      </View>
    </View>
  );
};

export const TransactionSkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center' }]}>
      <Skeleton width={48} height={48} style={{ borderRadius: 24, marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={80} height={20} />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  container: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
  },
  skeleton: {
    borderRadius: 8,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
});

export default LoadingOverlay;

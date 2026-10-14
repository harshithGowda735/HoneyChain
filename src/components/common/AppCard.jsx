import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import { spacing, borderRadius, shadows } from '../../constants/layout';

export function AppCard({
  children,
  onPress,
  style,
  elevation = 'card', // 'card' | 'elevated' | 'flat'
  noPadding = false,
  activeOpacity = 0.7,
}) {
  const shadowStyle =
    elevation === 'elevated'
      ? shadows.cardElevated
      : elevation === 'card'
      ? shadows.card
      : null;

  const cardStyle = [
    styles.card,
    !noPadding && styles.padding,
    shadowStyle,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.md,
  },
  padding: {
    padding: spacing.md + 2,
  },
});

export default AppCard;

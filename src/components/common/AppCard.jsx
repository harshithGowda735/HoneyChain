import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import { spacing, borderRadius, shadows } from '../../constants/layout';

export function AppCard({
  children,
  onPress,
  style,
  elevation = 'card', // 'card' | 'elevated' | 'flat' | 'glow'
  noPadding = false,
  activeOpacity = 0.75,
  variant = 'default', // 'default' | 'honey' | 'accent'
}) {
  const shadowStyle =
    elevation === 'elevated'
      ? shadows.cardElevated
      : elevation === 'glow'
      ? shadows.glow
      : elevation === 'card'
      ? shadows.card
      : null;

  const variantStyle =
    variant === 'honey'
      ? styles.honeyVariant
      : variant === 'accent'
      ? styles.accentVariant
      : null;

  const cardStyle = [
    styles.card,
    !noPadding && styles.padding,
    shadowStyle,
    variantStyle,
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
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.md,
  },
  honeyVariant: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.softAmber,
  },
  accentVariant: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.primary,
  },
  padding: {
    padding: spacing.lg,
  },
});

export default AppCard;

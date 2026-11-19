import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography } from '../../constants/layout';

export function StatusBadge({
  status = 'healthy',
  label,
  size = 'md',
  style,
}) {
  const normalized = (status || '').toLowerCase();

  let badgeColor;
  let defaultLabel = label;

  if (normalized === 'healthy' || normalized === 'active') {
    badgeColor = colors.status.healthy;
    if (!defaultLabel) defaultLabel = 'Healthy';
  } else if (normalized === 'attention' || normalized === 'warning') {
    badgeColor = colors.status.attention;
    if (!defaultLabel) defaultLabel = 'Needs Attention';
  } else if (normalized === 'critical' || normalized === 'alert') {
    badgeColor = colors.status.critical;
    if (!defaultLabel) defaultLabel = 'Critical Action';
  } else if (normalized === 'jarred' || normalized === 'completed') {
    badgeColor = {
      text: '#805B10',
      bg: '#FFF1C5',
      border: '#F9D76A',
      indicator: '#F5AC19',
    };
    if (!defaultLabel) defaultLabel = 'Jarred & Sealed';
  } else if (normalized === 'extraction' || normalized === 'processing') {
    badgeColor = {
      text: '#2C5E6C',
      bg: '#EAF3F6',
      border: '#BFE0E8',
      indicator: '#4A90A4',
    };
    if (!defaultLabel) defaultLabel = 'Extraction';
  } else if (normalized === 'settling') {
    badgeColor = {
      text: '#92400E',
      bg: '#FEF3C7',
      border: '#FDE68A',
      indicator: '#D97706',
    };
    if (!defaultLabel) defaultLabel = 'Settling Vat';
  } else if (normalized === 'lab certified') {
    badgeColor = {
      text: '#2E7D32',
      bg: '#EBF5EC',
      border: '#C8E6C9',
      indicator: '#388E3C',
    };
    if (!defaultLabel) defaultLabel = 'Lab Certified';
  } else {
    badgeColor = colors.status.neutral;
    if (!defaultLabel) defaultLabel = status;
  }

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeColor.bg,
          borderColor: badgeColor.border,
          paddingVertical: isSmall ? 2 : spacing.xs,
          paddingHorizontal: isSmall ? spacing.sm : spacing.md,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            backgroundColor: badgeColor.indicator,
            width: isSmall ? 6 : 7,
            height: isSmall ? 6 : 7,
            borderRadius: 4,
          },
        ]}
      />
      <Text
        style={[
          styles.text,
          {
            color: badgeColor.text,
            fontSize: isSmall ? typography.size.xs - 1 : typography.size.xs,
            fontWeight: typography.weight.bold,
          },
        ]}
        numberOfLines={1}
      >
        {defaultLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    marginRight: 5,
  },
  text: {
    letterSpacing: 0.2,
  },
});

export default StatusBadge;

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
  const normalized = status.toLowerCase();

  let badgeColor;
  let defaultLabel = label;

  if (normalized === 'healthy') {
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
      text: '#5B21B6',
      bg: '#EDE9FE',
      border: '#DDD6FE',
      indicator: '#7C3AED',
    };
    if (!defaultLabel) defaultLabel = 'Jarred & Sealed';
  } else if (normalized === 'extraction' || normalized === 'processing') {
    badgeColor = {
      text: '#1E40AF',
      bg: '#DBEAFE',
      border: '#BFDBFE',
      indicator: '#2563EB',
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
      text: '#065F46',
      bg: '#D1FAE5',
      border: '#A7F3D0',
      indicator: '#059669',
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
          paddingHorizontal: isSmall ? spacing.xs + 2 : spacing.sm + 2,
          paddingVertical: isSmall ? 2 : spacing.xs,
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
          },
        ]}
      />
      <Text
        style={[
          styles.label,
          {
            color: badgeColor.text,
            fontSize: isSmall ? typography.size.xs - 1 : typography.size.xs + 1,
          },
        ]}
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
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  label: {
    fontWeight: typography.weight.semibold,
    textTransform: 'capitalize',
  },
});

export default StatusBadge;

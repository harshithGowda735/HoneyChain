import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography } from '../../constants/layout';
import AppCard from '../common/AppCard';

export function OverviewCard({
  apiaryName,
  totalHives,
  healthyHives,
  attentionHives,
  criticalHives,
  totalHarvestedKg,
  onPress,
}) {
  return (
    <AppCard
      elevation="elevated"
      style={styles.cardContainer}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Top Banner Row */}
      <View style={styles.topRow}>
        <View style={styles.totalBadge}>
          <Ionicons name="home" size={16} color={colors.accent} />
          <Text style={styles.totalBadgeText}>{totalHives} Hives</Text>
        </View>
      </View>

      {/* Hive Health Grid */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricItem, { backgroundColor: colors.status.healthy.bg }]}>
          <View style={styles.metricHeader}>
            <View style={[styles.statusDot, { backgroundColor: colors.status.healthy.indicator }]} />
            <Text style={[styles.metricLabel, { color: colors.status.healthy.text }]}>Healthy</Text>
          </View>
          <Text style={[styles.metricCount, { color: colors.status.healthy.text }]}>
            {healthyHives}
          </Text>
        </View>

        <View style={[styles.metricItem, { backgroundColor: colors.status.attention.bg }]}>
          <View style={styles.metricHeader}>
            <View style={[styles.statusDot, { backgroundColor: colors.status.attention.indicator }]} />
            <Text style={[styles.metricLabel, { color: colors.status.attention.text }]}>Attention</Text>
          </View>
          <Text style={[styles.metricCount, { color: colors.status.attention.text }]}>
            {attentionHives}
          </Text>
        </View>

        <View style={[styles.metricItem, { backgroundColor: colors.status.critical.bg }]}>
          <View style={styles.metricHeader}>
            <View style={[styles.statusDot, { backgroundColor: colors.status.critical.indicator }]} />
            <Text style={[styles.metricLabel, { color: colors.status.critical.text }]}>Critical</Text>
          </View>
          <Text style={[styles.metricCount, { color: colors.status.critical.text }]}>
            {criticalHives}
          </Text>
        </View>
      </View>

      {/* Honey Harvest Footer Banner */}
      <View style={styles.harvestBanner}>
        <View style={styles.harvestLeft}>
          <Ionicons name="color-filter-outline" size={20} color={colors.accentDeep} />
          <View style={{ marginLeft: spacing.sm }}>
            <Text style={styles.harvestLabel}>Total Tracked Honey</Text>
            <Text style={styles.harvestValue}>{totalHarvestedKg} kg Raw Honey</Text>
          </View>
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  apiaryInfo: {
    flex: 1,
  },
  apiaryLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primaryMuted,
    letterSpacing: 0.8,
  },
  apiaryTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  totalBadgeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.accentDeep,
    marginLeft: spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricItem: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  metricLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  metricCount: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },
  harvestBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  harvestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  harvestLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  harvestValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  simulatedPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs + 4,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  simulatedText: {
    fontSize: 10,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
});

export default OverviewCard;

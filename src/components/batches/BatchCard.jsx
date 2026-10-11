import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography } from '../../constants/layout';
import AppCard from '../common/AppCard';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/formatDate';

export function BatchCard({ batch, onPress }) {
  if (!batch) return null;

  const displayId = batch.batchCode || (batch.id?.length > 10 ? batch.id.slice(0, 8) : batch.id);
  const honeyType = batch.honeyType || batch.floralSource || 'Raw Honey';
  const quantity = Number(batch.quantity || batch.quantityKg || 0).toFixed(1);
  const stage = batch.status || batch.stage || 'Harvested';
  const moisture = batch.moisture || batch.moistureContent || '--';
  const hiveOrigin = batch.hiveName || (batch.originHives?.join(', ')) || 'Apiary Colony';

  return (
    <AppCard
      elevation="card"
      style={styles.card}
      onPress={() => onPress && onPress(batch)}
      activeOpacity={0.8}
    >
      {/* Header: Batch ID & Stage Status */}
      <View style={styles.topRow}>
        <View style={styles.batchIdGroup}>
          <View style={styles.amberBadge}>
            <Ionicons name="sparkles" size={12} color={colors.accentDeep} />
            <Text style={styles.batchIdText}>{displayId}</Text>
          </View>
          {batch.batchCode && batch.id !== batch.batchCode && (
            <Text style={styles.batchCodeText} numberOfLines={1}>
              {batch.id?.length > 8 ? batch.id.slice(0, 8) + '…' : batch.id}
            </Text>
          )}
        </View>

        <StatusBadge status={stage} size="sm" />
      </View>

      {/* Floral Source / Honey Type */}
      <Text style={styles.floralTitle} numberOfLines={1}>
        {honeyType}
      </Text>

      {/* Details Row: Harvest Date, Quantity, Moisture */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Harvest Date</Text>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} style={{ marginRight: 3 }} />
            <Text style={styles.detailValue}>{formatDate(batch.harvestDate)}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Net Quantity</Text>
          <View style={styles.row}>
            <Ionicons name="cube-outline" size={13} color={colors.primary} style={{ marginRight: 3 }} />
            <Text style={[styles.detailValue, { color: colors.primary, fontWeight: typography.weight.bold }]}>
              {quantity} {batch.unit || 'kg'}
            </Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Moisture</Text>
          <View style={styles.row}>
            <Ionicons name="water-outline" size={13} color={colors.sensor.humidity} style={{ marginRight: 3 }} />
            <Text style={styles.detailValue}>{moisture}</Text>
          </View>
        </View>
      </View>

      {/* Origin Hives & Stage Progress */}
      <View style={styles.footerRow}>
        <View style={styles.originTag}>
          <Text style={styles.originLabel}>Origin: </Text>
          <Text style={styles.originValue} numberOfLines={1}>{hiveOrigin}</Text>
        </View>

        <View style={styles.timelineHint}>
          <Text style={styles.timelineHintText}>View Record</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.accentDeep} />
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md + 2,
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  batchIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flex: 1,
    marginRight: spacing.xs,
  },
  amberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  batchIdText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.accentDeep,
  },
  batchCodeText: {
    fontSize: typography.size.xs - 1,
    color: colors.textMuted,
  },
  floralTitle: {
    fontSize: typography.size.md + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: typography.size.xs + 1,
    color: colors.textPrimary,
    fontWeight: typography.weight.semibold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  originTag: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  originLabel: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  originValue: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },
  timelineHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  timelineHintText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.accentDeep,
  },
});

export default BatchCard;

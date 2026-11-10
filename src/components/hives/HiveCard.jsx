import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography } from '../../constants/layout';
import AppCard from '../common/AppCard';
import StatusBadge from '../common/StatusBadge';
import { formatTemperature, formatHumidity, formatWeight } from '../../utils/formatSensorValue';
import { formatDate } from '../../utils/formatDate';
import { determineSensorConnectionStatus } from '../../services/sensorService';

export function HiveCard({ hive, onPress }) {
  if (!hive) return null;

  const hasTemp = typeof hive.temperature === 'number';
  const hasHumidity = typeof hive.humidity === 'number';
  const hasWeight = typeof hive.weight === 'number';
  const hasBattery = typeof hive.battery === 'number';
  const deviceId = hive.sensorDeviceId || hive.deviceId;
  const connStatus = determineSensorConnectionStatus(hive);

  return (
    <AppCard
      elevation="card"
      style={styles.card}
      onPress={() => onPress && onPress(hive)}
      activeOpacity={0.8}
    >
      {/* Top Header: ID + Name + Status */}
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          <View style={styles.idBadge}>
            <Text style={styles.idText} numberOfLines={1}>
              {hive.id ? (hive.id.length > 8 ? hive.id.slice(0, 7) + '…' : hive.id) : 'HIVE'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nameText} numberOfLines={1}>
              {hive.name}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={styles.yardText} numberOfLines={1}>
                {hive.location || hive.yard || 'Apiary Yard'}
              </Text>
              {deviceId ? (
                <View style={styles.devicePill}>
                  <Ionicons name="hardware-chip-outline" size={10} color={colors.textSecondary} />
                  <Text style={styles.devicePillText} numberOfLines={1}>
                    {deviceId}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <StatusBadge status={hive.status || 'healthy'} size="sm" />
      </View>

      {/* Sensor Readings Grid */}
      <View style={styles.telemetryContainer}>
        {/* Temp */}
        <View style={styles.telemetryItem}>
          <View style={styles.telemetryLabelRow}>
            <Ionicons name="thermometer" size={13} color={hasTemp ? colors.sensor.temp : colors.textMuted} />
            <Text style={styles.telemetryLabel}>Temp</Text>
          </View>
          <Text style={[styles.telemetryValue, { color: hasTemp ? colors.sensor.temp : colors.textMuted }]}>
            {hasTemp ? formatTemperature(hive.temperature) : '--'}
          </Text>
        </View>

        {/* Humidity */}
        <View style={styles.telemetryItem}>
          <View style={styles.telemetryLabelRow}>
            <Ionicons name="water" size={13} color={hasHumidity ? colors.sensor.humidity : colors.textMuted} />
            <Text style={styles.telemetryLabel}>Humidity</Text>
          </View>
          <Text style={[styles.telemetryValue, { color: hasHumidity ? colors.sensor.humidity : colors.textMuted }]}>
            {hasHumidity ? formatHumidity(hive.humidity) : '--'}
          </Text>
        </View>

        {/* Weight */}
        <View style={styles.telemetryItem}>
          <View style={styles.telemetryLabelRow}>
            <Ionicons name="barbell-outline" size={13} color={hasWeight ? colors.sensor.weight : colors.textMuted} />
            <Text style={styles.telemetryLabel}>Weight</Text>
          </View>
          <Text style={[styles.telemetryValue, { color: hasWeight ? colors.textPrimary : colors.textMuted }]}>
            {hasWeight ? formatWeight(hive.weight) : '--'}
          </Text>
        </View>
      </View>

      {/* Card Footer: Hardware Status & Reading time */}
      <View style={styles.footerRow}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusIndicatorDot,
              { backgroundColor: connStatus.badgeColor },
            ]}
          />
          <Text style={[styles.footerStatusText, { color: connStatus.badgeColor }]}>
            {connStatus.label}
          </Text>
          {hasBattery && (
            <Text style={styles.batteryMeta}>• {hive.battery}%</Text>
          )}
        </View>

        <View style={styles.cardStatusMeta}>
          <Text style={styles.cardStatusText}>
            {hive.lastReadingAt
              ? formatDate(hive.lastReadingAt)
              : typeof hive.lastReading === 'string'
              ? hive.lastReading
              : hive.lastReading
              ? formatDate(hive.lastReading)
              : 'Colony Active'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: 2 }} />
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
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  idBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    maxWidth: 90,
  },
  idText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  nameText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 3,
  },
  yardText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  devicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.round,
    gap: 3,
    marginLeft: 4,
  },
  devicePillText: {
    fontSize: 9,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
    maxWidth: 90,
  },
  telemetryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  telemetryItem: {
    alignItems: 'center',
    flex: 1,
  },
  telemetryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  telemetryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  telemetryValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    marginRight: spacing.xs,
  },
  statusIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  footerStatusText: {
    fontSize: typography.size.xs - 1,
    fontWeight: typography.weight.medium,
  },
  batteryMeta: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  cardStatusMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardStatusText: {
    fontSize: typography.size.xs - 1,
    color: colors.textMuted,
  },
});

export default HiveCard;

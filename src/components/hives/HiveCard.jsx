import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import AppCard from '../common/AppCard';
import StatusBadge from '../common/StatusBadge';
import { formatTemperature, formatHumidity, formatWeight } from '../../utils/formatSensorValue';
import { formatDate } from '../../utils/formatDate';
import { getHiveMaintenanceStatus } from '../../services/maintenanceService';

export function HiveCard({ hive, onPress }) {
  if (!hive) return null;

  const hasTemp = typeof hive.temperature === 'number';
  const hasHumidity = typeof hive.humidity === 'number';
  const hasWeight = typeof hive.weight === 'number';
  const hasBattery = typeof hive.battery === 'number';

  const isTempCritical = hasTemp && (hive.temperature >= 38.0 || hive.temperature <= 29.0);
  const maintenance = getHiveMaintenanceStatus(hive);

  return (
    <AppCard
      elevation="card"
      style={styles.card}
      onPress={() => onPress && onPress(hive)}
      activeOpacity={0.82}
    >
      {/* Top Header: Hive ID Badge + Name + Location + Status */}
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          <View style={styles.hiveIconWrap}>
            <Ionicons name="cube" size={18} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText} numberOfLines={1}>
                {hive.name}
              </Text>
              <View style={styles.idBadge}>
                <Text style={styles.idText} numberOfLines={1}>
                  {hive.id ? (hive.id.length > 8 ? hive.id.slice(0, 7) + '…' : hive.id) : 'HIVE'}
                </Text>
              </View>
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.yardText} numberOfLines={1}>
                {hive.location || hive.yard || 'Apiary Yard'} • {hive.framesCount || 10} Frames
              </Text>
            </View>
          </View>
        </View>

        <StatusBadge status={hive.status || 'healthy'} size="sm" />
      </View>

      {/* Routine Inspection Notice if Due */}
      {maintenance?.isInspectionDue && (
        <View style={styles.maintenanceNotice}>
          <Ionicons name="clipboard-outline" size={13} color={colors.primaryDark} />
          <Text style={styles.maintenanceNoticeText} numberOfLines={1}>
            Bi-weekly inspection recommended
          </Text>
        </View>
      )}

      {/* Sensor Readings Grid */}
      <View style={styles.telemetryContainer}>
        {/* Scale Weight (Primary Beekeeper Metric) */}
        <View style={styles.telemetryItem}>
          <View style={styles.telemetryLabelRow}>
            <Ionicons name="scale-outline" size={13} color={colors.sage} />
            <Text style={styles.telemetryLabel}>Weight</Text>
          </View>
          <Text style={[styles.telemetryValue, { color: colors.textPrimary }]}>
            {hasWeight ? formatWeight(hive.weight) : '--'}
          </Text>
        </View>

        <View style={styles.telemetryDivider} />

        {/* Brood Temperature */}
        <View style={[styles.telemetryItem, isTempCritical && styles.telemetryItemAlert]}>
          <View style={styles.telemetryLabelRow}>
            <Ionicons
              name={isTempCritical ? 'warning' : 'thermometer-outline'}
              size={13}
              color={isTempCritical ? colors.status.critical.text : colors.primaryDark}
            />
            <Text style={[styles.telemetryLabel, isTempCritical && { color: colors.status.critical.text, fontWeight: 'bold' }]}>
              {isTempCritical ? 'ALERT' : 'Temp'}
            </Text>
          </View>
          <Text style={[styles.telemetryValue, { color: isTempCritical ? colors.status.critical.text : colors.primaryDark }]}>
            {hasTemp ? formatTemperature(hive.temperature) : '--'}
          </Text>
        </View>

        <View style={styles.telemetryDivider} />

        {/* Humidity */}
        <View style={styles.telemetryItem}>
          <View style={styles.telemetryLabelRow}>
            <Ionicons name="water-outline" size={13} color={colors.sensor.humidity} />
            <Text style={styles.telemetryLabel}>Humidity</Text>
          </View>
          <Text style={[styles.telemetryValue, { color: colors.textSecondary }]}>
            {hasHumidity ? formatHumidity(hive.humidity) : '--'}
          </Text>
        </View>
      </View>

      {/* Card Footer: Battery / Connectivity & Reading time */}
      <View style={styles.footerRow}>
        <View style={styles.batteryRow}>
          {hasBattery ? (
            <>
              <Ionicons
                name={hive.battery > 50 ? 'battery-charging-outline' : 'battery-dead-outline'}
                size={14}
                color={hive.battery > 50 ? colors.status.healthy.indicator : colors.status.critical.indicator}
              />
              <Text style={styles.footerMeta}>Scale Node {hive.battery}%</Text>
            </>
          ) : (
            <>
              <Ionicons name="radio-outline" size={14} color={colors.textMuted} />
              <Text style={styles.footerMeta}>Manual logs</Text>
            </>
          )}
        </View>

        <View style={styles.cardStatusMeta}>
          <Text style={styles.cardStatusText}>
            {typeof hive.lastReading === 'string'
              ? hive.lastReading
              : hive.lastReading
              ? formatDate(hive.lastReading)
              : 'Tap to view details'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} style={{ marginLeft: 3 }} />
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
    gap: spacing.sm,
  },
  hiveIconWrap: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.softAmber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  nameText: {
    fontSize: typography.size.md + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  idBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  idText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 3,
  },
  yardText: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  maintenanceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    gap: 5,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  maintenanceNoticeText: {
    fontSize: typography.size.xs - 1,
    color: colors.primaryDark,
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  telemetryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  telemetryItem: {
    alignItems: 'center',
    flex: 1,
  },
  telemetryItemAlert: {
    backgroundColor: '#FDF2F2',
    borderRadius: borderRadius.sm,
    paddingVertical: 2,
  },
  telemetryDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.surfaceBorder,
  },
  telemetryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  telemetryLabel: {
    fontSize: 10,
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
    paddingTop: 4,
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerMeta: {
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
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
});

export default HiveCard;

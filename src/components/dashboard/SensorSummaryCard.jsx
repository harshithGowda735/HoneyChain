import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography } from '../../constants/layout';
import AppCard from '../common/AppCard';
import { formatTemperature, formatHumidity } from '../../utils/formatSensorValue';

export function SensorSummaryCard({ avgTemperature, avgHumidity }) {
  const hasTemp = avgTemperature !== null && avgTemperature !== undefined;
  const hasHumidity = avgHumidity !== null && avgHumidity !== undefined;

  return (
    <View style={styles.containerRow}>
      {/* Temperature Card */}
      <AppCard style={styles.halfCard} elevation="card">
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: '#FFEDD5' }]}>
            <Ionicons name="thermometer-outline" size={20} color={colors.sensor.temp} />
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              {hasTemp ? 'ACTIVE NODE' : 'AWAITING NODE'}
            </Text>
          </View>
        </View>

        <Text style={styles.metricTitle}>Internal Brood Temp</Text>
        <Text style={[styles.metricValue, { color: hasTemp ? colors.sensor.temp : colors.textMuted }]}>
          {hasTemp ? formatTemperature(avgTemperature) : '--'}
        </Text>

        <View style={styles.statusFooter}>
          <Ionicons
            name={hasTemp ? 'checkmark-circle' : 'radio-outline'}
            size={13}
            color={hasTemp ? colors.status.healthy.indicator : colors.textMuted}
          />
          <Text style={styles.statusFooterText} numberOfLines={1}>
            {hasTemp ? 'Optimal 34.0–36.0°C' : 'Awaiting sensor connection'}
          </Text>
        </View>
      </AppCard>

      {/* Humidity Card */}
      <AppCard style={styles.halfCard} elevation="card">
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="water-outline" size={20} color={colors.sensor.humidity} />
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              {hasHumidity ? 'ACTIVE NODE' : 'AWAITING NODE'}
            </Text>
          </View>
        </View>

        <Text style={styles.metricTitle}>Hive Humidity</Text>
        <Text style={[styles.metricValue, { color: hasHumidity ? colors.sensor.humidity : colors.textMuted }]}>
          {hasHumidity ? formatHumidity(avgHumidity) : '--'}
        </Text>

        <View style={styles.statusFooter}>
          <Ionicons
            name={hasHumidity ? 'checkmark-circle' : 'radio-outline'}
            size={13}
            color={hasHumidity ? colors.status.healthy.indicator : colors.textMuted}
          />
          <Text style={styles.statusFooterText} numberOfLines={1}>
            {hasHumidity ? 'Optimal 50–65% RH' : 'Awaiting sensor connection'}
          </Text>
        </View>
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  containerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  halfCard: {
    flex: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  metricTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  statusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusFooterText: {
    fontSize: 10,
    color: colors.textSecondary,
    flexShrink: 1,
  },
});

export default SensorSummaryCard;

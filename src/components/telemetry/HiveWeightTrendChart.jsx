import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';

const TIME_RANGES = [
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: 'all', label: 'All', days: 9999 },
];

/**
 * HiveWeightTrendChart
 * Plots genuine scale measurements for an individual hive colony.
 * Strictly avoids interpolated, estimated, or fabricated readings.
 */
export function HiveWeightTrendChart({
  readings = [],
  hiveName = 'Colony',
  height = 180,
  compact = false,
  onAddScaleReading,
}) {
  const [selectedRange, setSelectedRange] = useState('30d');

  // 1. Filter only genuine readings with positive numeric weight
  const validReadings = useMemo(() => {
    return readings
      .filter((r) => typeof r.weight === 'number' && !isNaN(r.weight) && r.weight > 0)
      .map((r) => {
        let ts = 0;
        if (r.recordedAt?.toMillis) {
          ts = r.recordedAt.toMillis();
        } else if (r.recordedAt?.seconds) {
          ts = r.recordedAt.seconds * 1000;
        } else if (r.recordedAt) {
          ts = new Date(r.recordedAt).getTime();
        }
        return {
          ...r,
          timestamp: ts || Date.now(),
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp); // Chronological order (oldest to newest)
  }, [readings]);

  // 2. Filter by active time range
  const rangeReadings = useMemo(() => {
    if (validReadings.length === 0) return [];
    if (selectedRange === 'all') return validReadings;

    const rangeConfig = TIME_RANGES.find((r) => r.key === selectedRange);
    const cutoffMs = Date.now() - (rangeConfig?.days || 30) * 24 * 60 * 60 * 1000;
    const filtered = validReadings.filter((r) => r.timestamp >= cutoffMs);
    // If range has no points but overall readings exist, fall back to last N readings
    return filtered.length > 0 ? filtered : validReadings.slice(-10);
  }, [validReadings, selectedRange]);

  // 3. Trend calculations (only when at least 2 real readings exist)
  const trendAnalysis = useMemo(() => {
    if (rangeReadings.length === 0) {
      return { status: 'no_data', label: 'No data', deltaKg: 0 };
    }
    if (rangeReadings.length === 1) {
      return {
        status: 'single_point',
        label: 'Initial baseline set',
        deltaKg: 0,
        latestWeight: rangeReadings[0].weight,
        latestTimestamp: rangeReadings[0].timestamp,
      };
    }

    const first = rangeReadings[0];
    const latest = rangeReadings[rangeReadings.length - 1];
    const delta = latest.weight - first.weight;

    let status = 'stable';
    let label = 'Stable';
    if (delta > 0.1) {
      status = 'increasing';
      label = `+${delta.toFixed(1)} kg`;
    } else if (delta < -0.1) {
      status = 'decreasing';
      label = `${delta.toFixed(1)} kg`;
    } else {
      label = '0.0 kg (Stable)';
    }

    return {
      status,
      label,
      deltaKg: delta,
      firstWeight: first.weight,
      latestWeight: latest.weight,
      latestTimestamp: latest.timestamp,
    };
  }, [rangeReadings]);

  // 4. SVG Coordinate Geometry
  const chartWidth = 320;
  const chartHeight = height;
  const paddingLeft = 42;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 26;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const { points, minWeight, maxWeight, pathD, areaD } = useMemo(() => {
    if (rangeReadings.length < 2) {
      return { points: [], minWeight: 0, maxWeight: 0, pathD: '', areaD: '' };
    }

    const weights = rangeReadings.map((r) => r.weight);
    let minW = Math.min(...weights);
    let maxW = Math.max(...weights);

    // Provide buffer so points don't clip at top/bottom
    if (maxW === minW) {
      minW = Math.max(0, minW - 1);
      maxW = maxW + 1;
    } else {
      const buffer = (maxW - minW) * 0.15;
      minW = Math.max(0, minW - buffer);
      maxW = maxW + buffer;
    }

    const weightRange = maxW - minW || 1;
    const timeStart = rangeReadings[0].timestamp;
    const timeEnd = rangeReadings[rangeReadings.length - 1].timestamp;
    const timeRange = timeEnd - timeStart || 1;

    const coords = rangeReadings.map((r, i) => {
      // Linear X based on chronological index if timestamps are identical
      const xRatio = timeRange > 0 ? (r.timestamp - timeStart) / timeRange : i / (rangeReadings.length - 1);
      const x = paddingLeft + xRatio * innerWidth;
      const yRatio = (r.weight - minW) / weightRange;
      const y = paddingTop + innerHeight - yRatio * innerHeight;
      return { x, y, ...r };
    });

    // Build SVG Path string
    const d = coords.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }, '');

    // Area fill path
    const area = `${d} L ${coords[coords.length - 1].x.toFixed(1)} ${(paddingTop + innerHeight).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(paddingTop + innerHeight).toFixed(1)} Z`;

    return { points: coords, minWeight: minW, maxWeight: maxW, pathD: d, areaD: area };
  }, [rangeReadings, innerWidth, innerHeight]);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Header with Title and Trend Indicator */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleBadgeRow}>
            <Ionicons name="speedometer-outline" size={16} color={colors.primary} />
            <Text style={styles.chartTitle}>Hive Weight Trend</Text>
          </View>
          <Text style={styles.chartSub}>Colony scale measurements</Text>
        </View>

        {trendAnalysis.status !== 'no_data' && (
          <View
            style={[
              styles.trendBadge,
              trendAnalysis.status === 'increasing' && styles.trendBadgeUp,
              trendAnalysis.status === 'decreasing' && styles.trendBadgeDown,
            ]}
          >
            <Ionicons
              name={
                trendAnalysis.status === 'increasing'
                  ? 'trending-up'
                  : trendAnalysis.status === 'decreasing'
                  ? 'trending-down'
                  : 'remove'
              }
              size={13}
              color={
                trendAnalysis.status === 'increasing'
                  ? colors.primary
                  : trendAnalysis.status === 'decreasing'
                  ? colors.status.attention.text
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.trendText,
                trendAnalysis.status === 'increasing' && styles.trendTextUp,
                trendAnalysis.status === 'decreasing' && styles.trendTextDown,
              ]}
            >
              {trendAnalysis.label}
            </Text>
          </View>
        )}
      </View>

      {/* Latest Weight Summary Row */}
      {trendAnalysis.latestWeight !== undefined && (
        <View style={styles.weightSummaryRow}>
          <View style={styles.weightMetric}>
            <Text style={styles.weightValue}>
              {trendAnalysis.latestWeight.toFixed(1)}{' '}
              <Text style={styles.weightUnit}>kg</Text>
            </Text>
            <Text style={styles.weightLabel}>Latest Scale Reading</Text>
          </View>

          {trendAnalysis.latestTimestamp && (
            <View style={styles.timestampBox}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={styles.timestampText}>
                {new Date(trendAnalysis.latestTimestamp).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Time Range Filter Tabs */}
      {validReadings.length >= 2 && !compact && (
        <View style={styles.timeRangeBar}>
          {TIME_RANGES.map((rng) => {
            const isSelected = selectedRange === rng.key;
            return (
              <TouchableOpacity
                key={rng.key}
                onPress={() => setSelectedRange(rng.key)}
                style={[styles.rangeTab, isSelected && styles.rangeTabActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.rangeTabText, isSelected && styles.rangeTabTextActive]}>
                  {rng.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Chart Canvas Area */}
      {rangeReadings.length >= 2 ? (
        <View style={styles.svgWrapper}>
          <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            {/* Background Grid Lines & Y-Axis Labels */}
            {[0, 0.5, 1].map((ratio) => {
              const yVal = paddingTop + innerHeight - ratio * innerHeight;
              const weightVal = (minWeight + ratio * (maxWeight - minWeight)).toFixed(1);
              return (
                <React.Fragment key={ratio}>
                  <Line
                    x1={paddingLeft}
                    y1={yVal}
                    x2={chartWidth - paddingRight}
                    y2={yVal}
                    stroke={colors.borderLight}
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                  <SvgText
                    x={paddingLeft - 6}
                    y={yVal + 3}
                    fontSize="9"
                    fill={colors.textMuted}
                    textAnchor="end"
                  >
                    {weightVal}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* Shaded Area Fill */}
            <Path d={areaD} fill={colors.primarySoft} opacity="0.6" />

            {/* Main Weight Trend Line */}
            <Path
              d={pathD}
              fill="none"
              stroke={colors.primary}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Discrete Scale Measurement Markers */}
            {points.map((pt, idx) => (
              <Circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r="3.5"
                fill={colors.primary}
                stroke={colors.surface}
                strokeWidth="1.5"
              />
            ))}

            {/* X-Axis Date Labels */}
            {points.length > 0 && (
              <>
                <SvgText
                  x={points[0].x}
                  y={chartHeight - 6}
                  fontSize="8.5"
                  fill={colors.textSecondary}
                  textAnchor="start"
                >
                  {new Date(points[0].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </SvgText>
                <SvgText
                  x={points[points.length - 1].x}
                  y={chartHeight - 6}
                  fontSize="8.5"
                  fill={colors.textSecondary}
                  textAnchor="end"
                >
                  {new Date(points[points.length - 1].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </SvgText>
              </>
            )}
          </Svg>
        </View>
      ) : rangeReadings.length === 1 ? (
        <View style={styles.singlePointNotice}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.singlePointTitle}>Baseline Reading Recorded</Text>
            <Text style={styles.singlePointDesc}>
              {rangeReadings[0].weight} kg recorded. Trend line appears after 2+ readings.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyNotice}>
          <Ionicons name="scale-outline" size={24} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No weight history yet</Text>
          <Text style={styles.emptyDesc}>
            Connect an ESP32 + HX711 scale or record manual weights.
          </Text>
          {onAddScaleReading && (
            <TouchableOpacity
              onPress={onAddScaleReading}
              style={styles.recordScaleBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={styles.recordScaleBtnText}>Record Scale Reading</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Scientific Explanation Footnote */}
      <View style={styles.footnoteRow}>
        <Ionicons name="shield-checkmark-outline" size={12} color={colors.textMuted} />
        <Text style={styles.footnoteText}>
          Colony weight includes bees, brood, comb, and forage.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    marginVertical: spacing.sm,
    ...shadows.card,
  },
  containerCompact: {
    padding: spacing.sm + 2,
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
    gap: spacing.sm,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartTitle: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  chartSub: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  trendBadgeUp: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryLight,
  },
  trendBadgeDown: {
    backgroundColor: colors.status.attention.bg,
    borderColor: colors.status.attention.border,
  },
  trendText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
  },
  trendTextUp: {
    color: colors.primary,
  },
  trendTextDown: {
    color: colors.status.attention.text,
  },
  weightSummaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  weightMetric: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  weightValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  weightUnit: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },
  weightLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  timestampBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  timeRangeBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginBottom: spacing.xs,
  },
  rangeTab: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rangeTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rangeTabText: {
    fontSize: 10,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
  rangeTabTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weight.bold,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  singlePointNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  singlePointTitle: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  singlePointDesc: {
    fontSize: typography.size.xs,
    color: colors.textPrimary,
    marginTop: 2,
    lineHeight: 16,
  },
  emptyNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  emptyTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
  recordScaleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  recordScaleBtnText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  footnoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  footnoteText: {
    fontSize: 9.5,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 13,
  },
});

export default HiveWeightTrendChart;

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import { HoneyDropIllustration } from '../illustrations/HoneyDropIllustration';

const TIME_RANGES = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: 'all', label: 'ALL', days: 9999 },
];

/**
 * Stock-Market Style Hive Weight Trend Chart
 *
 * Visualizes colony scale accumulation like a financial stock chart:
 * - Dynamic Accumulation (Honey Gold / Sage) vs Depletion (Warm Terracotta)
 * - Soft warm honey area fill under trajectory
 * - Percentage & delta kg return pills
 * - High / Low price-level callouts
 * - Zero fabricated data: authentic Firestore readings only.
 */
export function HiveWeightTrendChart({
  readings = [],
  hiveName = 'Colony',
  height = 195,
  compact = false,
  onAddScaleReading,
}) {
  const [selectedRange, setSelectedRange] = useState('30d');

  // 1. Filter genuine positive readings and sort chronologically
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
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [readings]);

  // 2. Filter by selected time window
  const rangeReadings = useMemo(() => {
    if (validReadings.length === 0) return [];
    if (selectedRange === 'all') return validReadings;

    const rangeConfig = TIME_RANGES.find((r) => r.key === selectedRange);
    const cutoffMs = Date.now() - (rangeConfig?.days || 30) * 24 * 60 * 60 * 1000;
    const filtered = validReadings.filter((r) => r.timestamp >= cutoffMs);
    return filtered.length > 0 ? filtered : validReadings.slice(-12);
  }, [validReadings, selectedRange]);

  // 3. Weight Accumulation Analysis
  const marketAnalysis = useMemo(() => {
    if (rangeReadings.length === 0) {
      return { status: 'no_data', deltaKg: 0, percentChange: 0, isBullish: true };
    }
    if (rangeReadings.length === 1) {
      return {
        status: 'single_point',
        deltaKg: 0,
        percentChange: 0,
        isBullish: true,
        latestWeight: rangeReadings[0].weight,
        latestTimestamp: rangeReadings[0].timestamp,
      };
    }

    const first = rangeReadings[0];
    const latest = rangeReadings[rangeReadings.length - 1];
    const delta = latest.weight - first.weight;
    const pct = first.weight > 0 ? (delta / first.weight) * 100 : 0;
    const isBullish = delta >= 0;

    const weights = rangeReadings.map((r) => r.weight);
    const low = Math.min(...weights);
    const high = Math.max(...weights);

    return {
      status: delta > 0.05 ? 'rising' : delta < -0.05 ? 'falling' : 'flat',
      deltaKg: delta,
      percentChange: pct,
      isBullish,
      firstWeight: first.weight,
      latestWeight: latest.weight,
      latestTimestamp: latest.timestamp,
      periodLow: low,
      periodHigh: high,
    };
  }, [rangeReadings]);

  // Warm Honey Colorway
  const chartColor = marketAnalysis.isBullish ? colors.primaryDark : colors.error;
  const chartSoftColor = marketAnalysis.isBullish ? colors.backgroundSecondary : colors.status.critical.bg;

  // 4. SVG Geometry
  const chartWidth = 330;
  const chartHeight = height;
  const paddingLeft = 40;
  const paddingRight = 18;
  const paddingTop = 14;
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

    // Padding buffer
    if (maxW === minW) {
      minW = Math.max(0, minW - 1);
      maxW = maxW + 1;
    } else {
      const buffer = (maxW - minW) * 0.18;
      minW = Math.max(0, minW - buffer);
      maxW = maxW + buffer;
    }

    const weightRange = maxW - minW || 1;
    const timeStart = rangeReadings[0].timestamp;
    const timeEnd = rangeReadings[rangeReadings.length - 1].timestamp;
    const timeRange = timeEnd - timeStart || 1;

    const coords = rangeReadings.map((r, i) => {
      const xRatio = timeRange > 0 ? (r.timestamp - timeStart) / timeRange : i / (rangeReadings.length - 1);
      const x = paddingLeft + xRatio * innerWidth;
      const yRatio = (r.weight - minW) / weightRange;
      const y = paddingTop + innerHeight - yRatio * innerHeight;
      return { x, y, ...r };
    });

    const d = coords.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }, '');

    const lastX = coords[coords.length - 1].x.toFixed(1);
    const firstX = coords[0].x.toFixed(1);
    const bottomY = (paddingTop + innerHeight).toFixed(1);
    const area = `${d} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    return { points: coords, minWeight: minW, maxWeight: maxW, pathD: d, areaD: area };
  }, [rangeReadings, innerWidth, innerHeight]);

  const latestPoint = points.length > 0 ? points[points.length - 1] : null;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* 1. Scale Ticker Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.tickerRow}>
            <Text style={styles.tickerBadge}>SCALE • {hiveName.toUpperCase()}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.latestPriceText}>
              {marketAnalysis.latestWeight !== undefined
                ? `${marketAnalysis.latestWeight.toFixed(2)}`
                : '--'}
            </Text>
            <Text style={styles.priceUnit}>kg</Text>

            {marketAnalysis.status !== 'no_data' && marketAnalysis.status !== 'single_point' && (
              <View
                style={[
                  styles.marketPill,
                  { backgroundColor: chartSoftColor },
                ]}
              >
                <Ionicons
                  name={marketAnalysis.isBullish ? 'arrow-up' : 'arrow-down'}
                  size={12}
                  color={chartColor}
                />
                <Text style={[styles.marketPillText, { color: chartColor }]}>
                  {marketAnalysis.isBullish ? '+' : ''}
                  {marketAnalysis.deltaKg.toFixed(2)} kg (
                  {marketAnalysis.isBullish ? '+' : ''}
                  {marketAnalysis.percentChange.toFixed(1)}%)
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Time Filter Tabs (7D | 30D | ALL) */}
        {validReadings.length >= 2 && !compact && (
          <View style={styles.timeTabs}>
            {TIME_RANGES.map((rng) => {
              const isSelected = selectedRange === rng.key;
              return (
                <TouchableOpacity
                  key={rng.key}
                  onPress={() => setSelectedRange(rng.key)}
                  style={[styles.timeTab, isSelected && styles.timeTabActive]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.timeTabText, isSelected && styles.timeTabTextActive]}>
                    {rng.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* 2. Range High/Low Highlights */}
      {marketAnalysis.periodHigh !== undefined && !compact && (
        <View style={styles.metricStrip}>
          <Text style={styles.stripText}>
            Range Low: <Text style={styles.stripValue}>{marketAnalysis.periodLow.toFixed(1)} kg</Text>
          </Text>
          <Text style={styles.stripDivider}>•</Text>
          <Text style={styles.stripText}>
            Range High: <Text style={styles.stripValue}>{marketAnalysis.periodHigh.toFixed(1)} kg</Text>
          </Text>
          {marketAnalysis.latestTimestamp && (
            <>
              <Text style={styles.stripDivider}>•</Text>
              <Text style={styles.stripText}>
                {new Date(marketAnalysis.latestTimestamp).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </>
          )}
        </View>
      )}

      {/* 3. SVG Trajectory Chart Plot */}
      {rangeReadings.length >= 2 ? (
        <View style={styles.chartBox}>
          <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            <Defs>
              <LinearGradient id="honeyTrendGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={chartColor} stopOpacity="0.30" />
                <Stop offset="100%" stopColor={chartColor} stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Horizontal Grid Guide Lines */}
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
                    stroke={colors.surfaceBorder}
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                  <SvgText
                    x={paddingLeft - 6}
                    y={yVal + 3}
                    fontSize="9"
                    fill={colors.textSecondary}
                    textAnchor="end"
                  >
                    {weightVal}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* Area Gradient Fill */}
            <Path d={areaD} fill="url(#honeyTrendGrad)" />

            {/* Smooth Trajectory Line */}
            <Path
              d={pathD}
              fill="none"
              stroke={chartColor}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Point Dots */}
            {points.map((pt, idx) => (
              <Circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r="3"
                fill={chartColor}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            ))}

            {/* Pulsing Live Marker at Latest Endpoint */}
            {latestPoint && (
              <>
                <Circle
                  cx={latestPoint.x}
                  cy={latestPoint.y}
                  r="6.5"
                  fill={chartColor}
                  opacity="0.25"
                />
                <Circle
                  cx={latestPoint.x}
                  cy={latestPoint.y}
                  r="4"
                  fill={chartColor}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              </>
            )}

            {/* X-Axis Timestamps */}
            {points.length > 0 && (
              <>
                <SvgText
                  x={points[0].x}
                  y={chartHeight - 6}
                  fontSize="8.5"
                  fill={colors.textSecondary}
                  textAnchor="start"
                >
                  {new Date(points[0].timestamp).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}
                </SvgText>
                <SvgText
                  x={points[points.length - 1].x}
                  y={chartHeight - 6}
                  fontSize="8.5"
                  fill={colors.textSecondary}
                  textAnchor="end"
                >
                  {new Date(points[points.length - 1].timestamp).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}
                </SvgText>
              </>
            )}
          </Svg>
        </View>
      ) : (
        /* Empty / Single Reading Initial State */
        <View style={styles.emptyCard}>
          <HoneyDropIllustration size={36} />
          <Text style={styles.emptyTitle}>
            {validReadings.length === 1
              ? `Baseline Calibrated (${validReadings[0].weight.toFixed(1)} kg)`
              : 'Scale Trajectory Awaiting Readings'}
          </Text>
          <Text style={styles.emptyDesc}>
            {validReadings.length === 1
              ? 'Subsequent scale measurements will generate the colony accumulation curve.'
              : 'Record manual measurements or connect an ESP32 + HX711 scale.'}
          </Text>
          {onAddScaleReading && (
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={onAddScaleReading}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.emptyActionText}>Add Scale Reading</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 4. Action Bar */}
      {onAddScaleReading && rangeReadings.length >= 2 && !compact && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.logReadingLink}
            onPress={onAddScaleReading}
            activeOpacity={0.75}
          >
            <Ionicons name="add-circle" size={15} color={colors.primaryDark} />
            <Text style={styles.logReadingText}>Record Manual Scale Reading</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  containerCompact: {
    padding: spacing.sm,
    marginBottom: 0,
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  tickerBadge: {
    fontSize: 9.5,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  latestPriceText: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  priceUnit: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontWeight: typography.weight.semibold,
    marginRight: spacing.xs,
  },
  marketPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    gap: 3,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  marketPillText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
  },
  timeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  timeTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  timeTabActive: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  timeTabText: {
    fontSize: 10,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
  timeTabTextActive: {
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  metricStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: spacing.xs,
    gap: 6,
  },
  stripText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  stripValue: {
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  stripDivider: {
    fontSize: 10,
    color: colors.surfaceBorder,
  },
  chartBox: {
    width: '100%',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 240,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.softAmber,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  emptyActionText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  logReadingLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logReadingText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
});

export default HiveWeightTrendChart;

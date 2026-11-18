import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../constants/layout';
import { globalStyles } from '../styles/globalStyles';
import AppButton from '../components/common/AppButton';
import AppCard from '../components/common/AppCard';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { evaluateHivesTelemetry } from '../services/temperatureAlertService';
import { evaluateHarvestSuggestions, notifyHarvestSuggestion } from '../services/harvestSuggestionService';
import { getHiveMaintenanceStatus } from '../services/maintenanceService';
import { FriendlyBee } from '../components/illustrations/FriendlyBee';
import { HoneyJarIllustration } from '../components/illustrations/HoneyJarIllustration';
import { BeehiveIllustration } from '../components/illustrations/BeehiveIllustration';
import { HoneycombPattern } from '../components/illustrations/HoneycombPattern';

export function HomePage({
  stats,
  hives = [],
  batches = [],
  loading = false,
  error = null,
  onRefresh,
  onNavigateToTab,
  onOpenRecordHarvest,
}) {
  const { user, currentUser } = useAuth();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = React.useState(false);

  // 1. Evaluate Temperature State Transitions & Trigger Phone Notifications
  React.useEffect(() => {
    if (user?.uid && hives.length > 0) {
      evaluateHivesTelemetry(user.uid, hives).catch((err) =>
        console.log('[HomePage] Telemetry evaluation notice:', err?.message)
      );
    }
  }, [user?.uid, hives]);

  // 2. Evaluate Harvest Suggestions for Specific Hive Boxes
  const harvestSuggestions = React.useMemo(() => {
    return evaluateHarvestSuggestions(hives, batches);
  }, [hives, batches]);

  // Track notified suggestions to prevent repeated phone buzzes
  const notifiedSuggestionsRef = React.useRef(new Set());
  React.useEffect(() => {
    harvestSuggestions.forEach((sugg) => {
      if (!notifiedSuggestionsRef.current.has(sugg.hiveId)) {
        notifiedSuggestionsRef.current.add(sugg.hiveId);
        notifyHarvestSuggestion(sugg);
      }
    });
  }, [harvestSuggestions]);

  // 3. Detect any Hives in Active Alert or Needing Inspection
  const criticalTempHive = React.useMemo(() => {
    return hives.find(
      (h) => typeof h.temperature === 'number' && (h.temperature >= 38.0 || h.temperature <= 29.0)
    );
  }, [hives]);

  const dueInspectionHive = React.useMemo(() => {
    for (const h of hives) {
      const status = getHiveMaintenanceStatus(h);
      if (status?.isInspectionDue) return h;
    }
    return null;
  }, [hives]);

  // Compute healthy vs attention counts
  const { healthyCount, attentionCount } = React.useMemo(() => {
    let healthy = 0;
    let attention = 0;
    hives.forEach((h) => {
      const st = (h.status || 'healthy').toLowerCase();
      if (st === 'attention' || st === 'warning' || st === 'critical') {
        attention++;
      } else {
        healthy++;
      }
    });
    return { healthyCount: healthy, attentionCount: attention };
  }, [hives]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setRefreshing(false);
  }, [onRefresh]);

  const beekeeperName = currentUser?.name || 'Beekeeper';
  const apiaryName = currentUser?.apiaryName || 'Cauvery Honey Farm';
  const hasHives = (stats?.totalHives || 0) > 0;

  return (
    <ScrollView
      style={globalStyles.screenContainer}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || loading}
          onRefresh={handleRefresh}
          tintColor={colors.primaryDark}
          colors={[colors.primaryDark]}
        />
      }
    >
      {/* 1. Warm Hero Welcome Section with Friendly Bee Illustration */}
      <View style={styles.heroBanner}>
        {/* Decorative subtle honeycomb pattern in background */}
        <View style={styles.heroPatternWrapper} pointerEvents="none">
          <HoneycombPattern width={160} height={100} opacity={0.35} />
        </View>

        <View style={styles.heroTopRow}>
          <View style={styles.heroIdentity}>
            <View style={styles.apiaryTag}>
              <Ionicons name="leaf" size={11} color={colors.sage} />
              <Text style={styles.apiaryTagText} numberOfLines={1}>
                {apiaryName} • {currentUser?.district || currentUser?.state || 'Karnataka'}
              </Text>
            </View>
            <Text style={styles.greetingTitle}>
              {t('welcome')}, {beekeeperName}
            </Text>
            <Text style={styles.greetingSub}>
              {hasHives ? `${hives.length} active colonies producing raw honey` : 'Welcome to your digital apiary'}
            </Text>
          </View>

          <View style={styles.heroRightArt}>
            <FriendlyBee size={52} showFlightPath={true} />
            <TouchableOpacity
              style={styles.profileAvatarBtn}
              activeOpacity={0.8}
              onPress={() => onNavigateToTab && onNavigateToTab('profile')}
              accessibilityLabel="View Beekeeper Profile"
            >
              {currentUser?.photoUrl ? (
                <Image
                  source={{ uri: currentUser.photoUrl }}
                  style={styles.profileAvatarImg}
                />
              ) : (
                <View style={styles.profileAvatarPlaceholder}>
                  <Text style={styles.profileAvatarInitials}>
                    {(beekeeperName || 'BK').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Network / Firestore Error Alert */}
      {error ? (
        <View style={styles.errorAlert}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.status.critical.text} />
          <Text style={styles.errorAlertText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Critical Temperature Alert Banner */}
      {criticalTempHive && (
        <TouchableOpacity
          style={styles.criticalTempAlertBanner}
          activeOpacity={0.85}
          onPress={() => onNavigateToTab && onNavigateToTab('apiary')}
        >
          <View style={styles.criticalIconBox}>
            <Ionicons name="warning" size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.criticalAlertTitle}>
              {criticalTempHive.temperature >= 38.0 ? '🚨 Overheating Alert' : '❄️ Chilling Risk Alert'} — {criticalTempHive.name}
            </Text>
            <Text style={styles.criticalAlertDesc}>
              Internal temp is {criticalTempHive.temperature.toFixed(1)}°C. Check ventilation and shade.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.status.critical.text} />
        </TouchableOpacity>
      )}

      {/* Routine Inspection Due Callout */}
      {dueInspectionHive && (
        <TouchableOpacity
          style={styles.inspectionDuePill}
          activeOpacity={0.85}
          onPress={() => onNavigateToTab && onNavigateToTab('apiary')}
        >
          <Ionicons name="clipboard-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.inspectionDueText} numberOfLines={1}>
            Bi-weekly inspection due: <Text style={{ fontWeight: typography.weight.bold }}>{dueInspectionHive.name}</Text>
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* 2. Onboarding Guidance when 0 Hives registered */}
      {!hasHives && !loading && (
        <View style={styles.onboardingCard}>
          <BeehiveIllustration size={70} />
          <Text style={styles.onboardingTitle}>{t('onboardingTitle')}</Text>
          <Text style={styles.onboardingDesc}>{t('onboardingDesc')}</Text>
          <AppButton
            title={t('registerFirstHiveBtn')}
            iconName="add-circle-outline"
            variant="primary"
            size="md"
            onPress={() => onNavigateToTab && onNavigateToTab('apiary')}
            style={styles.onboardingBtn}
          />
        </View>
      )}

      {/* 3. Apiary Overview & Primary Metrics */}
      <View style={styles.statsRow}>
        <AppCard
          elevation="card"
          style={styles.statCard}
          onPress={() => onNavigateToTab && onNavigateToTab('apiary')}
        >
          <View style={styles.statHeaderRow}>
            <View style={styles.statIconBox}>
              <Ionicons name="grid" size={18} color={colors.primaryDark} />
            </View>
            <View style={styles.statusPillsRow}>
              <View style={styles.healthyPill}>
                <View style={styles.greenDot} />
                <Text style={styles.healthyPillText}>{healthyCount}</Text>
              </View>
              {attentionCount > 0 && (
                <View style={styles.attentionPill}>
                  <View style={styles.amberDot} />
                  <Text style={styles.attentionPillText}>{attentionCount}</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.statValue}>{stats?.totalHives || 0}</Text>
          <Text style={styles.statLabel}>{t('registeredHives')}</Text>
          <Text style={styles.statSub}>
            {stats?.totalHives === 1 ? '1 active colony' : `${stats?.totalHives || 0} active colonies`}
          </Text>
        </AppCard>

        <AppCard
          elevation="card"
          style={styles.statCard}
          onPress={() => onNavigateToTab && onNavigateToTab('apiary')}
        >
          <View style={styles.statHeaderRow}>
            <View style={[styles.statIconBox, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="cube" size={18} color={colors.primaryDark} />
            </View>
            <View style={styles.trendPill}>
              <Ionicons name="trending-up" size={12} color={colors.sage} />
              <Text style={styles.trendPillText}>Accumulating</Text>
            </View>
          </View>
          <Text style={[styles.statValue, { color: colors.primaryDark }]}>
            {stats?.totalHarvestedKg || '0.0'} <Text style={styles.unitText}>kg</Text>
          </Text>
          <Text style={styles.statLabel}>{t('totalHarvested')}</Text>
          <Text style={styles.statSub}>
            {stats?.activeBatchesCount || 0} certified lots recorded
          </Text>
        </AppCard>
      </View>

      {/* 4. Quick Actions Row for Beekeepers */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={styles.quickActionItem}
          activeOpacity={0.8}
          onPress={() => {
            if (onOpenRecordHarvest) onOpenRecordHarvest();
            else if (onNavigateToTab) onNavigateToTab('apiary');
          }}
        >
          <View style={[styles.quickActionIconCircle, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="add" size={20} color={colors.primaryDark} />
          </View>
          <Text style={styles.quickActionLabel}>Log Harvest</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionItem}
          activeOpacity={0.8}
          onPress={() => onNavigateToTab && onNavigateToTab('apiary')}
        >
          <View style={[styles.quickActionIconCircle, { backgroundColor: colors.sageLight }]}>
            <Ionicons name="clipboard" size={18} color={colors.sage} />
          </View>
          <Text style={styles.quickActionLabel}>Inspect Hive</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionItem}
          activeOpacity={0.8}
          onPress={() => onNavigateToTab && onNavigateToTab('apiary')}
        >
          <View style={[styles.quickActionIconCircle, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="cube-outline" size={18} color={colors.primaryDark} />
          </View>
          <Text style={styles.quickActionLabel}>Add Colony</Text>
        </TouchableOpacity>
      </View>

      {/* 5. Harvest Inspection Suggestion for Specific Hive Box */}
      {harvestSuggestions.length > 0 && (
        <AppCard
          elevation="card"
          style={styles.harvestSuggestionCard}
          onPress={() => onNavigateToTab && onNavigateToTab('apiary')}
        >
          <View style={styles.suggestionHeaderRow}>
            <View style={styles.suggestionArtWrapper}>
              <HoneyJarIllustration size={42} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.boxTag}>
                <Text style={styles.boxTagText}>
                  BOX {harvestSuggestions[0].hiveName.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.suggestionTitle}>
                Harvest Inspection Recommended
              </Text>
            </View>
            <View style={styles.gainBadge}>
              <Text style={styles.gainBadgeText}>+{harvestSuggestions[0].netGainKg} kg</Text>
            </View>
          </View>

          <Text style={styles.suggestionDesc}>
            {harvestSuggestions[0].hiveName} ({harvestSuggestions[0].yardLocation}) reached {harvestSuggestions[0].currentWeightKg} kg with steady +{harvestSuggestions[0].netGainKg} kg accumulation. Check honey supers for 80%+ capped comb.
          </Text>

          <View style={styles.suggestionFooterRow}>
            <Text style={styles.cautionHint}>
              *Verify frames before extraction
            </Text>
            <TouchableOpacity
              style={styles.suggestionActionBtn}
              onPress={() => {
                if (onOpenRecordHarvest) onOpenRecordHarvest();
                else if (onNavigateToTab) onNavigateToTab('apiary');
              }}
            >
              <Text style={styles.suggestionActionText}>Log Extraction</Text>
              <Ionicons name="arrow-forward" size={13} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>
        </AppCard>
      )}

      {/* 6. Prominent Action Banner: Record Honey Harvest */}
      <TouchableOpacity
        style={styles.recordHarvestBigBtn}
        activeOpacity={0.88}
        onPress={() => {
          if (onOpenRecordHarvest) {
            onOpenRecordHarvest();
          } else if (onNavigateToTab) {
            onNavigateToTab('apiary');
          }
        }}
      >
        <View style={styles.recordHarvestIconCircle}>
          <Ionicons name="cube" size={24} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.recordHarvestBtnTitle}>{t('recordHarvestBtn')}</Text>
          <Text style={styles.recordHarvestBtnSub}>
            Log honey extracted from your hives to generate verifiable QR tags
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* 7. Smart Hive IoT Telemetry & Weight Summary (Zero fake data) */}
      <View style={styles.sensorSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>{t('sensorStatus')}</Text>
          <View style={styles.liveIndicatorBadge}>
            <View
              style={[
                styles.liveDot,
                { backgroundColor: stats?.hasSensorReadings ? colors.status.healthy.indicator : colors.textMuted },
              ]}
            />
            <Text style={styles.liveIndicatorText}>
              {stats?.hasSensorReadings ? t('liveTelemetry') : t('sensorNotConnected')}
            </Text>
          </View>
        </View>

        {stats?.hasSensorReadings ? (
          <View style={styles.sensorCard}>
            <View style={styles.sensorMetricRow}>
              {/* Colony Biomass / Scale Weight */}
              <View style={styles.sensorMetric}>
                <View style={[styles.metricIconWrap, { backgroundColor: colors.sageLight }]}>
                  <Ionicons name="speedometer-outline" size={18} color={colors.sage} />
                </View>
                <View>
                  <Text style={styles.sensorMetricValue}>
                    {stats?.avgWeight ? `${stats.avgWeight} kg` : '-- kg'}
                  </Text>
                  <Text style={styles.sensorMetricLabel}>Scale Weight</Text>
                </View>
              </View>

              <View style={styles.sensorMetricDivider} />

              {/* Brood Temperature */}
              <View style={styles.sensorMetric}>
                <View style={[styles.metricIconWrap, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="thermometer-outline" size={18} color={colors.primaryDark} />
                </View>
                <View>
                  <Text style={styles.sensorMetricValue}>
                    {stats?.avgTemperature ? `${stats.avgTemperature} °C` : '-- °C'}
                  </Text>
                  <Text style={styles.sensorMetricLabel}>{t('avgTemperature')}</Text>
                </View>
              </View>

              <View style={styles.sensorMetricDivider} />

              {/* Colony Relative Humidity */}
              <View style={styles.sensorMetric}>
                <View style={[styles.metricIconWrap, { backgroundColor: '#EAF3F6' }]}>
                  <Ionicons name="water-outline" size={18} color={colors.sensor.humidity} />
                </View>
                <View>
                  <Text style={styles.sensorMetricValue}>
                    {stats?.avgHumidity ? `${stats.avgHumidity} %` : '-- %'}
                  </Text>
                  <Text style={styles.sensorMetricLabel}>{t('avgHumidity')}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.sensorNoticeCard}>
            <View style={styles.sensorNoticeHeader}>
              <Ionicons name="hardware-chip-outline" size={20} color={colors.primaryDark} />
              <Text style={styles.sensorNoticeTitle}>{t('sensorNotConnected')}</Text>
            </View>
            <Text style={styles.sensorNoticeText}>
              Pair an ESP32 + HX711 scale to stream live colony weight and brood telemetry.
            </Text>
          </View>
        )}
      </View>

      {/* 8. Honey Traceability & QR Verification Banner */}
      <AppCard
        elevation="card"
        style={styles.traceabilityCard}
        onPress={() => onNavigateToTab && onNavigateToTab('apiary')}
      >
        <View style={styles.traceabilityHeader}>
          <View style={styles.traceabilityIconBox}>
            <Ionicons name="qr-code-outline" size={22} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.traceabilityTitle}>Honey Traceability & QR Tags</Text>
            <Text style={styles.traceabilitySub}>Consumer-verifiable harvest certificates</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl + 24,
  },
  heroBanner: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.softAmber,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.card,
  },
  heroPatternWrapper: {
    position: 'absolute',
    right: -20,
    top: -10,
    opacity: 0.4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIdentity: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  apiaryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  apiaryTagText: {
    fontSize: typography.size.xs - 1,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greetingTitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  greetingSub: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  heroRightArt: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  profileAvatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.sm,
  },
  profileAvatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarInitials: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.critical.bg,
    borderColor: colors.status.critical.border,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  errorAlertText: {
    fontSize: typography.size.xs,
    color: colors.status.critical.text,
    flex: 1,
  },
  retryBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  retryText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.status.critical.text,
  },
  criticalTempAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.critical.bg,
    borderColor: colors.status.critical.border,
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  criticalIconBox: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.status.critical.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  criticalAlertTitle: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.status.critical.text,
  },
  criticalAlertDesc: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inspectionDuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderColor: colors.softAmber,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  inspectionDueText: {
    fontSize: typography.size.xs,
    color: colors.textPrimary,
    flex: 1,
  },
  harvestSuggestionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.softAmber,
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  suggestionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  suggestionArtWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  boxTagText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  suggestionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  gainBadge: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  gainBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: '#FFFFFF',
  },
  suggestionDesc: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginVertical: spacing.xs,
  },
  suggestionFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  cautionHint: {
    fontSize: 10,
    color: colors.sage,
    fontStyle: 'italic',
    flex: 1,
  },
  suggestionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  suggestionActionText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  onboardingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.softAmber,
    marginBottom: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  onboardingTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  onboardingDesc: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  onboardingBtn: {
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
  },
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  healthyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.healthy.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 3,
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.status.healthy.indicator,
  },
  healthyPillText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.status.healthy.text,
  },
  attentionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.attention.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 3,
  },
  amberDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.status.attention.indicator,
  },
  attentionPillText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.status.attention.text,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sageLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 3,
  },
  trendPillText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.sage,
  },
  statValue: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  unitText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  statLabel: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  statSub: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  quickActionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  recordHarvestBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.md + 2,
    gap: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  recordHarvestIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordHarvestBtnTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: '#FFFFFF',
  },
  recordHarvestBtnSub: {
    fontSize: typography.size.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    lineHeight: 15,
  },
  sensorSection: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  sectionHeader: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveIndicatorText: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  sensorCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    ...shadows.card,
  },
  sensorMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sensorMetric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorMetricDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: spacing.xs,
  },
  sensorMetricValue: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  sensorMetricLabel: {
    fontSize: typography.size.xs - 2,
    color: colors.textSecondary,
  },
  sensorNoticeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
  },
  sensorNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  sensorNoticeTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  sensorNoticeText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  traceabilityCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  traceabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  traceabilityIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  traceabilityTitle: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  traceabilitySub: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default HomePage;

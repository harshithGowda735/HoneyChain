import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../constants/layout';
import { globalStyles } from '../styles/globalStyles';
import AppButton from '../components/common/AppButton';
import AppCard from '../components/common/AppCard';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export function HomePage({
  stats,
  loading = false,
  error = null,
  onRefresh,
  onNavigateToTab,
  onOpenRecordHarvest,
}) {
  const { user, currentUser } = useAuth();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = React.useState(false);

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
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* 1. Official Government Header & Apiary Identity */}
      <View style={styles.topHeader}>
        <View style={styles.apiaryBadge}>
          <Ionicons name="leaf" size={12} color={colors.primary} />
          <Text style={styles.apiaryBadgeText} numberOfLines={1}>
            {apiaryName}
          </Text>
        </View>

        <Text style={styles.greetingTitle}>
          {t('welcome')}, {beekeeperName}
        </Text>
        <Text style={styles.greetingSubtitle}>
          {t('apiaryOverview')}
        </Text>
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

      {/* 2. Onboarding Guidance when 0 Hives registered */}
      {!hasHives && !loading && (
        <View style={styles.onboardingCard}>
          <View style={styles.onboardingIconCircle}>
            <Ionicons name="grid-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.onboardingTitle}>{t('onboardingTitle')}</Text>
          <Text style={styles.onboardingDesc}>{t('onboardingDesc')}</Text>
          <AppButton
            title={t('registerFirstHiveBtn')}
            iconName="add-circle-outline"
            variant="primary"
            size="md"
            onPress={() => onNavigateToTab && onNavigateToTab('hives')}
            style={styles.onboardingBtn}
          />
        </View>
      )}

      {/* 3. Primary Metrics from Real Firestore records */}
      <View style={styles.statsRow}>
        <AppCard
          elevation="card"
          style={styles.statCard}
          onPress={() => onNavigateToTab && onNavigateToTab('hives')}
        >
          <View style={styles.statIconBox}>
            <Ionicons name="grid" size={20} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{stats?.totalHives || 0}</Text>
          <Text style={styles.statLabel}>{t('registeredHives')}</Text>
          <Text style={styles.statSub}>
            {stats?.totalHives === 1 ? '1 colony' : `${stats?.totalHives || 0} colonies`}
          </Text>
        </AppCard>

        <AppCard
          elevation="card"
          style={styles.statCard}
          onPress={() => onNavigateToTab && onNavigateToTab('batches')}
        >
          <View style={[styles.statIconBox, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="cube" size={20} color={colors.accentDeep} />
          </View>
          <Text style={[styles.statValue, { color: colors.accentDeep }]}>
            {stats?.totalHarvestedKg || '0.0'} <Text style={styles.unitText}>kg</Text>
          </Text>
          <Text style={styles.statLabel}>{t('totalHarvested')}</Text>
          <Text style={styles.statSub}>
            {stats?.activeBatchesCount || 0} lots recorded
          </Text>
        </AppCard>
      </View>

      {/* 4. Prominent Government Action: Record Harvest */}
      <View style={styles.primaryActionSection}>
        <TouchableOpacity
          style={styles.recordHarvestBigBtn}
          activeOpacity={0.85}
          onPress={() => {
            if (onOpenRecordHarvest) {
              onOpenRecordHarvest();
            } else if (onNavigateToTab) {
              onNavigateToTab('batches');
            }
          }}
        >
          <View style={styles.recordHarvestIconCircle}>
            <Ionicons name="add" size={24} color={colors.surface} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recordHarvestBtnTitle}>{t('recordHarvestBtn')}</Text>
            <Text style={styles.recordHarvestBtnSub}>
              Link honey harvest directly to your registered source colonies
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {/* 5. Smart Hive IoT Telemetry Status (Zero fake data) */}
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
              <View style={styles.sensorMetric}>
                <Ionicons name="thermometer-outline" size={20} color={colors.sensor.temp} />
                <View>
                  <Text style={styles.sensorMetricValue}>{stats.avgTemperature} °C</Text>
                  <Text style={styles.sensorMetricLabel}>{t('avgTemperature')}</Text>
                </View>
              </View>

              <View style={styles.sensorMetricDivider} />

              <View style={styles.sensorMetric}>
                <Ionicons name="water-outline" size={20} color={colors.sensor.humidity} />
                <View>
                  <Text style={styles.sensorMetricValue}>{stats.avgHumidity} %</Text>
                  <Text style={styles.sensorMetricLabel}>{t('avgHumidity')}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.sensorNoticeCard}>
            <View style={styles.sensorNoticeHeader}>
              <Ionicons name="hardware-chip-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.sensorNoticeTitle}>{t('sensorNotConnected')}</Text>
            </View>
            <Text style={styles.sensorNoticeText}>
              {t('sensorNotConnectedDesc')}
            </Text>
          </View>
        )}
      </View>

      {/* 6. Honey Traceability & QR Verification Banner */}
      <AppCard
        elevation="card"
        style={styles.traceabilityCard}
        onPress={() => onNavigateToTab && onNavigateToTab('batches')}
      >
        <View style={styles.traceabilityHeader}>
          <View style={styles.traceabilityIconBox}>
            <Ionicons name="qr-code-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.traceabilityTitle}>{t('traceabilityTitle')}</Text>
            <Text style={styles.traceabilitySub}>{t('traceabilitySub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </AppCard>

      {/* 7. Government Schemes Banner (Direct official access) */}
      <AppCard
        elevation="card"
        style={styles.schemesCard}
        onPress={() => onNavigateToTab && onNavigateToTab('schemes')}
      >
        <View style={styles.schemesHeader}>
          <View style={styles.schemesIconBox}>
            <Ionicons name="ribbon-outline" size={22} color={colors.accentDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.schemesTitleRow}>
              <Text style={styles.schemesTitle}>{t('schemesBannerTitle')}</Text>
              <View style={styles.officialTag}>
                <Text style={styles.officialTagText}>{t('officialBadge')}</Text>
              </View>
            </View>
            <Text style={styles.schemesSub}>{t('schemesBannerSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </View>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  topHeader: {
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  apiaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  apiaryBadgeText: {
    fontSize: typography.size.xs - 1,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greetingTitle: {
    fontSize: typography.size.xl + 2,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
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
  onboardingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  onboardingIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  onboardingTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
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
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.size.xl,
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
  primaryActionSection: {
    marginBottom: spacing.lg,
  },
  recordHarvestBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.md + 2,
    gap: spacing.md,
    ...shadows.card,
  },
  recordHarvestIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordHarvestBtnTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.surface,
  },
  recordHarvestBtnSub: {
    fontSize: typography.size.xs,
    color: 'rgba(255, 255, 255, 0.85)',
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
    gap: spacing.sm,
  },
  sensorMetricDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: spacing.sm,
  },
  sensorMetricValue: {
    fontSize: typography.size.md + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  sensorMetricLabel: {
    fontSize: typography.size.xs - 1,
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
    backgroundColor: colors.primarySoft,
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
  schemesCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  schemesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  schemesIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schemesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  schemesTitle: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  officialTag: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  officialTagText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.accentDeep,
  },
  schemesSub: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default HomePage;

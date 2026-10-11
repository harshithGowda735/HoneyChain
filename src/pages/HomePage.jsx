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
import RecentActivity from '../components/dashboard/RecentActivity';
import AppButton from '../components/common/AppButton';
import AppCard from '../components/common/AppCard';
import { useAuth } from '../context/AuthContext';

export function HomePage({
  stats,
  activities = [],
  loading = false,
  error = null,
  onRefresh,
  onNavigateToTab,
}) {
  const { user, currentUser } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setRefreshing(false);
  }, [onRefresh]);

  const beekeeperName = currentUser?.name || user?.email?.split('@')[0] || 'Apiarist';
  const apiaryName = currentUser?.apiaryName || 'My Apiary';

  return (
    <ScrollView
      style={globalStyles.screenContainer}
      contentContainerStyle={globalStyles.contentContainer}
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
      {/* Top Greeting Header */}
      <View style={styles.greetingHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.apiaryBadge}>
            <Ionicons name="home-outline" size={12} color={colors.primary} />
            <Text style={styles.apiaryBadgeText} numberOfLines={1}>
              {apiaryName}
            </Text>
          </View>
          <Text style={styles.greetingTitle}>Welcome, {beekeeperName}</Text>
          <Text style={styles.greetingSubtitle}>
            Apiary overview & production records
          </Text>
        </View>

        <TouchableOpacity
          style={styles.profileAvatarButton}
          activeOpacity={0.8}
          onPress={() => onNavigateToTab && onNavigateToTab('profile')}
        >
          <Ionicons name="person" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Network / Firestore Error alert banner */}
      {error ? (
        <View style={styles.errorAlert}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.status.critical.text} />
          <Text style={styles.errorAlertText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Primary Metrics: Real Totals from Firestore */}
      <View style={styles.statsRow}>
        <AppCard
          elevation="card"
          style={styles.statCard}
          onPress={() => onNavigateToTab && onNavigateToTab('hives')}
        >
          <View style={styles.statIconBox}>
            <Ionicons name="grid-outline" size={22} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{stats.totalHives}</Text>
          <Text style={styles.statLabel}>Registered Hives</Text>
          <Text style={styles.statSub}>
            {stats.totalHives === 1 ? '1 active colony' : `${stats.totalHives} active colonies`}
          </Text>
        </AppCard>

        <AppCard
          elevation="card"
          style={styles.statCard}
          onPress={() => onNavigateToTab && onNavigateToTab('batches')}
        >
          <View style={[styles.statIconBox, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="cube-outline" size={22} color={colors.accentDeep} />
          </View>
          <Text style={[styles.statValue, { color: colors.accentDeep }]}>
            {stats.activeBatchesCount}
          </Text>
          <Text style={styles.statLabel}>Honey Batches</Text>
          <Text style={styles.statSub}>
            {stats.totalHarvestedKg > 0 ? `${stats.totalHarvestedKg} kg harvested` : '0 kg harvested'}
          </Text>
        </AppCard>
      </View>

      {/* Primary Actions */}
      <Text style={styles.sectionHeader}>Quick Actions</Text>
      <View style={styles.quickActionsRow}>
        <AppButton
          title="Add Hive"
          iconName="add-circle-outline"
          variant="primary"
          size="md"
          style={styles.quickActionButton}
          onPress={() => onNavigateToTab && onNavigateToTab('hives')}
        />
        <AppButton
          title="Register Batch"
          iconName="cube-outline"
          variant="secondary"
          size="md"
          style={styles.quickActionButton}
          onPress={() => onNavigateToTab && onNavigateToTab('batches')}
        />
      </View>

      {/* Honey Traceability & QR Verification Banner */}
      <AppCard
        elevation="subtle"
        style={styles.traceabilityCard}
        onPress={() => onNavigateToTab && onNavigateToTab('batches')}
      >
        <View style={styles.traceabilityHeader}>
          <View style={styles.traceabilityIconBox}>
            <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.traceabilityTitle}>Honey Traceability & QR Labels</Text>
            <Text style={styles.traceabilitySub}>
              Generate batch QR codes for product labels & verify harvest authenticity.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </AppCard>

      {/* Recent Activity Log from Firestore */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionHeader}>Recent Activity</Text>
        <RecentActivity
          activities={activities}
          onViewAll={() => onNavigateToTab && onNavigateToTab('hives')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  greetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  apiaryBadgeText: {
    fontSize: typography.size.xs - 1,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greetingTitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  profileAvatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.critical.bg,
    borderWidth: 1,
    borderColor: colors.status.critical.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  errorAlertText: {
    flex: 1,
    fontSize: typography.size.xs,
    color: colors.status.critical.text,
  },
  retryBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  retryText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.status.critical.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  statSub: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  quickActionButton: {
    flex: 1,
  },
  traceabilityCard: {
    marginBottom: spacing.xl,
    padding: spacing.md,
  },
  traceabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  traceabilityIconBox: {
    width: 38,
    height: 38,
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
  activitySection: {
    marginBottom: spacing.lg,
  },
});

export default HomePage;

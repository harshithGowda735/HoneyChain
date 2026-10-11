import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography } from '../../constants/layout';
import AppCard from '../common/AppCard';

function formatActivityTime(timestamp) {
  if (!timestamp) return 'Recent';
  if (timestamp.toDate) {
    const d = timestamp.toDate();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (timestamp.seconds) {
    const d = new Date(timestamp.seconds * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return typeof timestamp === 'string' ? timestamp : 'Recent';
}

export function RecentActivity({ activities }) {
  const hasActivities = activities && activities.length > 0;

  return (
    <AppCard elevation="card" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="pulse-outline" size={18} color={colors.primary} />
          <Text style={styles.headerTitle}>Recent Apiary Activity</Text>
        </View>
        <Text style={styles.activityCount}>
          {hasActivities ? `${activities.length} Events` : '0 Events'}
        </Text>
      </View>

      {!hasActivities ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="leaf-outline" size={24} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            No recent activity recorded yet.
          </Text>
          <Text style={styles.emptySubtext}>
            Add a hive or register a harvest batch to begin logging operations.
          </Text>
        </View>
      ) : (
        <View style={styles.activityList}>
          {activities.slice(0, 5).map((item, index) => {
            const isLast = index === Math.min(activities.length, 5) - 1;
            const iconName = item.action === 'hive_created'
              ? 'add-circle-outline'
              : item.action === 'hive_deleted'
              ? 'trash-outline'
              : item.action === 'batch_created'
              ? 'cube-outline'
              : item.action === 'reading_added'
              ? 'hardware-chip-outline'
              : 'notifications-outline';

            const iconColor = item.action === 'hive_deleted'
              ? colors.status.critical.text
              : colors.primary;

            return (
              <View
                key={item.id || index}
                style={[styles.activityRow, !isLast && styles.activityBorder]}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${iconColor}15` },
                  ]}
                >
                  <Ionicons
                    name={iconName}
                    size={18}
                    color={iconColor}
                  />
                </View>

                <View style={styles.infoContainer}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.timestamp}>
                      {formatActivityTime(item.timestamp)}
                    </Text>
                  </View>
                  <Text style={styles.activitySubtitle} numberOfLines={2}>
                    {item.details || item.subtitle || 'Operational update logged to Firestore'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md + 2,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  headerTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  activityCount: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
    fontWeight: typography.weight.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  emptyText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  activityList: {
    marginTop: spacing.xs,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm + 2,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  infoContainer: {
    flex: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activityTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.xs,
  },
  timestamp: {
    fontSize: typography.size.xs - 1,
    color: colors.textMuted,
  },
  activitySubtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});

export default RecentActivity;

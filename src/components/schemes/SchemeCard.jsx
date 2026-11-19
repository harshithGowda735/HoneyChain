import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import AppCard from '../common/AppCard';
import AppButton from '../common/AppButton';
import { useLanguage } from '../../context/LanguageContext';
import { RELEVANCE_STATUSES } from '../../utils/schemeRelevance';

export function SchemeCard({
  scheme,
  relevance,
  isBookmarked = false,
  onToggleBookmark,
  onPressDetails,
}) {
  const { language, t } = useLanguage();
  const isCentral = scheme.level === 'Central';

  // Localized title & benefit
  const displayName = language === 'kn' && scheme.nameKn
    ? scheme.nameKn
    : language === 'hi' && scheme.nameHi
    ? scheme.nameHi
    : scheme.name;

  const displayDept = language === 'kn' && scheme.departmentKn
    ? scheme.departmentKn
    : language === 'hi' && scheme.departmentHi
    ? scheme.departmentHi
    : scheme.department;

  const displayBenefit = language === 'kn' && scheme.simpleBenefitKn
    ? scheme.simpleBenefitKn
    : language === 'hi' && scheme.simpleBenefitHi
    ? scheme.simpleBenefitHi
    : scheme.simpleBenefit || scheme.benefits;

  const isMatched = relevance?.status === RELEVANCE_STATUSES.POTENTIALLY_RELEVANT;

  return (
    <AppCard elevation="card" style={styles.card}>
      {/* Top Header Row: Authority Badge & Bookmark Icon */}
      <View style={styles.topRow}>
        <View style={[styles.authorityBadge, isCentral ? styles.centralBadge : styles.stateBadge]}>
          <Ionicons
            name="business-outline"
            size={13}
            color={isCentral ? colors.primaryDark : colors.sageDark}
          />
          <Text style={[styles.authorityText, isCentral ? styles.centralText : styles.stateText]}>
            {isCentral ? t('filterCentral', 'Central Govt') : t('filterKarnataka', 'Karnataka State')}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => onToggleBookmark && onToggleBookmark(scheme.id)}
          style={styles.bookmarkBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isBookmarked ? colors.primaryDark : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Scheme Name */}
      <Text style={styles.schemeTitle}>{displayName}</Text>
      <Text style={styles.departmentText} numberOfLines={1}>
        {displayDept}
      </Text>

      {/* Subsidy / Benefit Highlight Card */}
      <View style={styles.subsidyBanner}>
        <View style={styles.subsidyIconCircle}>
          <Text style={styles.rupeeIcon}>₹</Text>
        </View>
        <Text style={styles.subsidyText}>{displayBenefit}</Text>
      </View>

      {/* Simple Status Indicator */}
      <View style={styles.statusRow}>
        <Ionicons
          name={isMatched ? 'checkmark-circle' : 'information-circle'}
          size={16}
          color={isMatched ? colors.status.healthy.indicator : colors.status.attention.indicator}
        />
        <Text
          style={[
            styles.statusText,
            { color: isMatched ? colors.status.healthy.text : colors.status.attention.text },
          ]}
        >
          {isMatched ? t('relevanceRelevant', 'Eligible & Relevant') : t('relevanceNeedInfo', 'Review Eligibility')}
        </Text>
      </View>

      {/* Action Button */}
      <AppButton
        title={t('viewDetails', 'View Details')}
        iconName="arrow-forward"
        variant="primary"
        size="md"
        onPress={() => onPressDetails && onPressDetails(scheme)}
        style={styles.detailsBtn}
      />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.md + 2,
    borderRadius: borderRadius.xl,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  authorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  centralBadge: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.softAmber,
  },
  centralText: {
    color: colors.primaryDark,
    fontWeight: typography.weight.bold,
    fontSize: 11,
  },
  stateBadge: {
    backgroundColor: colors.sageLight,
    borderColor: colors.sage,
  },
  stateText: {
    color: colors.sageDark,
    fontWeight: typography.weight.bold,
    fontSize: 11,
  },
  authorityText: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
  },
  bookmarkBtn: {
    padding: 2,
  },
  schemeTitle: {
    fontSize: typography.size.md + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginTop: 2,
    lineHeight: 22,
  },
  departmentText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  subsidyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  subsidyIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.softAmber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rupeeIcon: {
    fontSize: 14,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  subsidyText: {
    flex: 1,
    fontSize: typography.size.xs + 1,
    color: colors.textPrimary,
    fontWeight: typography.weight.medium,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  statusText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  detailsBtn: {
    width: '100%',
  },
});

export default SchemeCard;

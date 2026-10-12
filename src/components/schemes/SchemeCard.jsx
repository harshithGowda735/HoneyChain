import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography } from '../../constants/layout';
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
            color={isCentral ? colors.primary : colors.accentDeep}
          />
          <Text style={[styles.authorityText, isCentral ? styles.centralText : styles.stateText]}>
            {isCentral ? t('filterCentral') : t('filterKarnataka')}
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
            size={24}
            color={isBookmarked ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Scheme Name */}
      <Text style={styles.schemeTitle}>{displayName}</Text>
      <Text style={styles.departmentText} numberOfLines={1}>
        {displayDept}
      </Text>

      {/* Big Farmer-Friendly Subsidy / Benefit Highlight */}
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
          {isMatched ? t('relevanceRelevant') : t('relevanceNeedInfo')}
        </Text>
      </View>

      {/* Action Button */}
      <AppButton
        title={t('viewDetails')}
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
    padding: spacing.md,
    borderRadius: borderRadius.lg,
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
  },
  centralBadge: {
    backgroundColor: colors.primarySoft,
  },
  centralText: {
    color: colors.primary,
    fontWeight: typography.weight.bold,
    fontSize: 11,
  },
  stateBadge: {
    backgroundColor: colors.accentSoft,
  },
  stateText: {
    color: colors.accentDeep,
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
    lineHeight: 22,
    marginTop: 2,
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
    backgroundColor: '#F0F9F4',
    borderWidth: 1,
    borderColor: '#C6E8D6',
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  subsidyIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rupeeIcon: {
    color: colors.textInverse,
    fontWeight: typography.weight.bold,
    fontSize: 15,
  },
  subsidyText: {
    flex: 1,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primary,
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
